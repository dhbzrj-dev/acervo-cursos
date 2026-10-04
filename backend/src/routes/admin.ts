import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { isCoverStorageConfigured, uploadCoverDataUrl } from "../lib/coverStorage.js";
import { checkAdminPassword, createAdminToken, requireAdmin } from "../middleware/adminAuth.js";

/**
 * O painel manda a capa recortada como data URL. Se o Vercel Blob estiver
 * configurado, sobe a imagem e devolve a URL; se não estiver (ou o upload
 * falhar), mantém o base64 para o salvamento do curso nunca quebrar.
 */
async function storeCover(
  cover: unknown,
  courseId: string,
  log: { warn: (obj: unknown, msg: string) => void }
): Promise<string> {
  const value = String(cover || "");
  if (!value.startsWith("data:") || !isCoverStorageConfigured()) return value;
  try {
    return await uploadCoverDataUrl(value, courseId);
  } catch (err) {
    log.warn({ err }, "Falha ao subir capa para o Blob; salvando em base64");
    return value;
  }
}

function slug(text: string) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/admin/login", async (request, reply) => {
    const body = (request.body || {}) as { password?: string };
    if (!checkAdminPassword(body.password)) {
      return reply.code(401).send({ ok: false, error: "Senha inválida." });
    }
    return { ok: true, token: createAdminToken() };
  });

  app.get("/admin/categories", async (request) => {
    requireAdmin(request);
    const { rows } = await pool.query(
      "SELECT id, name, emoji, \"order\" FROM categories ORDER BY \"order\", name"
    );
    return rows;
  });

  app.post("/admin/categories", async (request) => {
    requireAdmin(request);
    const b = request.body as { name: string; emoji?: string; order?: number };
    const id = slug(b.name);
    await pool.query(
      "INSERT INTO categories (id, name, emoji, \"order\") VALUES ($1, $2, $3, $4)",
      [id, b.name, b.emoji || "📁", Number(b.order ?? 0)]
    );
    return { ok: true, id };
  });

  app.put<{ Params: { id: string } }>("/admin/categories/:id", async (request) => {
    requireAdmin(request);
    const b = request.body as { name: string; emoji?: string; order?: number };
    await pool.query(
      "UPDATE categories SET name = $1, emoji = $2, \"order\" = $3 WHERE id = $4",
      [b.name, b.emoji || "📁", Number(b.order ?? 0), request.params.id]
    );
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/admin/categories/:id", async (request) => {
    requireAdmin(request);
    await pool.query("DELETE FROM categories WHERE id = $1", [request.params.id]);
    return { ok: true };
  });

  app.get("/admin/courses", async (request) => {
    requireAdmin(request);
    const { rows } = await pool.query("SELECT * FROM courses ORDER BY name");
    return rows;
  });

  app.post("/admin/courses", async (request) => {
    requireAdmin(request);
    const b = request.body as any;
    const id = b.id || slug(b.name);
    const benefits = Array.isArray(b.benefits)
      ? b.benefits
      : String(b.benefits || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    const cover = await storeCover(b.cover_url, id, request.log);
    await pool.query(
      `INSERT INTO courses (id, category_id, name, description, benefits, cover_url, price_stars, invite_link, channel_id, is_active, preview_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        id,
        b.category_id,
        b.name,
        b.description || "",
        benefits,
        cover,
        Number(b.price_stars || 0),
        b.invite_link || "",
        b.channel_id || "",
        b.is_active !== false,
        b.preview_url || "",
      ]
    );
    return { ok: true, id };
  });

  app.put<{ Params: { id: string } }>("/admin/courses/:id", async (request) => {
    requireAdmin(request);
    const b = request.body as any;
    const benefits = Array.isArray(b.benefits)
      ? b.benefits
      : String(b.benefits || "").split("\n").map((s: string) => s.trim()).filter(Boolean);
    const cover = await storeCover(b.cover_url, request.params.id, request.log);
    await pool.query(
      `UPDATE courses SET category_id=$1, name=$2, description=$3, benefits=$4, cover_url=$5, price_stars=$6, invite_link=$7, channel_id=$8, is_active=$9, preview_url=$10 WHERE id=$11`,
      [
        b.category_id,
        b.name,
        b.description || "",
        benefits,
        cover,
        Number(b.price_stars || 0),
        b.invite_link || "",
        b.channel_id || "",
        b.is_active !== false,
        b.preview_url || "",
        request.params.id,
      ]
    );
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/admin/courses/:id", async (request) => {
    requireAdmin(request);
    const id = request.params.id;
    // Curso com histórico de assinaturas não pode ser apagado (FK) e o
    // histórico deve ficar: nesse caso só some do catálogo.
    const { rows } = await pool.query(
      "SELECT count(*)::int AS n FROM user_subscriptions WHERE course_id = $1",
      [id]
    );
    if (rows[0].n > 0) {
      await pool.query("UPDATE courses SET is_active = FALSE WHERE id = $1", [id]);
      return {
        ok: true,
        hidden: true,
        notice: `O curso tem ${rows[0].n} assinatura(s) no histórico, então foi ocultado do catálogo em vez de apagado.`,
      };
    }
    await pool.query("DELETE FROM courses WHERE id = $1", [id]);
    return { ok: true, notice: "Curso apagado." };
  });

  app.post("/admin/invite-link", async (request) => {
    requireAdmin(request);
    const body = request.body as { channel_id: string; price_stars: number; name?: string };
    const token = process.env.BOT_TOKEN;
    if (!token) return { ok: false, error: "BOT_TOKEN ausente" };
    const telegramRes = await fetch(`https://api.telegram.org/bot${token}/createChatSubscriptionInviteLink`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: body.channel_id,
        name: (body.name || "Assinatura").slice(0, 32),
        subscription_period: 2592000,
        subscription_price: Number(body.price_stars),
      }),
    });
    const telegramJson: any = await telegramRes.json();
    if (!telegramJson.ok) return { ok: false, error: telegramJson.description || "Falha ao criar invite" };
    return { ok: true, invite_link: telegramJson.result.invite_link };
  });
}