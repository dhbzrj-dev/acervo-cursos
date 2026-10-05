import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { isCoverStorageConfigured, uploadCoverDataUrl } from "../lib/coverStorage.js";
import { checkAdminPassword, createAdminToken, requireAdmin } from "../middleware/adminAuth.js";
import {
  adminTelegramIds,
  broadcastNewCourse,
  buildCustomMessage,
  isBroadcastRunning,
  startBroadcast,
} from "../lib/notifyNewCourse.js";
import { getBotUserStats, listBotUsers, listNotifiableUserIds } from "../repositories/botUsers.repo.js";

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

/** Inteiro >= 0 ou null (campo vazio = "não informado"). */
function optionalCount(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 0 ? n : null;
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

  app.post("/admin/categories", async (request, reply) => {
    requireAdmin(request);
    const b = request.body as { name: string; emoji?: string; order?: number };
    const id = slug(b.name);
    if (!id) return reply.code(400).send({ ok: false, error: "Dê um nome para a categoria." });
    const created = await pool.query(
      "INSERT INTO categories (id, name, emoji, \"order\") VALUES ($1, $2, $3, $4) ON CONFLICT (id) DO NOTHING",
      [id, b.name, b.emoji || "📁", Number(b.order ?? 0)]
    );
    if (!created.rowCount) {
      return reply.code(409).send({ ok: false, error: "Já existe uma categoria com esse nome." });
    }
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

  app.delete<{ Params: { id: string } }>("/admin/categories/:id", async (request, reply) => {
    requireAdmin(request);
    const id = request.params.id;
    const { rows } = await pool.query(
      "SELECT name FROM courses WHERE category_id = $1 ORDER BY name",
      [id]
    );
    if (rows.length > 0) {
      const names = rows.map((r) => r.name).join(", ");
      return reply.code(409).send({
        ok: false,
        error: `Esta categoria tem ${rows.length} curso(s): ${names}. Mova-os para outra categoria (ou apague) antes.`,
      });
    }
    await pool.query("DELETE FROM user_category_follows WHERE category_id = $1", [id]);
    await pool.query("DELETE FROM categories WHERE id = $1", [id]);
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
      `INSERT INTO courses (id, category_id, name, description, benefits, cover_url, price_stars, invite_link, channel_id, is_active, preview_url, modules_count, lessons_count, duration_seconds)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
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
        optionalCount(b.modules_count),
        optionalCount(b.lessons_count),
        optionalCount(b.duration_seconds),
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
      `UPDATE courses SET category_id=$1, name=$2, description=$3, benefits=$4, cover_url=$5, price_stars=$6, invite_link=$7, channel_id=$8, is_active=$9, preview_url=$10, modules_count=$11, lessons_count=$12, duration_seconds=$13 WHERE id=$14`,
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
        optionalCount(b.modules_count),
        optionalCount(b.lessons_count),
        optionalCount(b.duration_seconds),
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

  // Números do bot para o painel.
  app.get("/admin/bot-users/stats", async (request) => {
    requireAdmin(request);
    return { ...(await getBotUserStats()), running: isBroadcastRunning(), admins: adminTelegramIds().length };
  });

  // Lista de usuários do bot (nome e @), com busca.
  app.get("/admin/bot-users", async (request) => {
    requireAdmin(request);
    const q = request.query as { q?: string; limit?: string };
    return listBotUsers(String(q.q ?? ""), Number(q.limit ?? 100) || 100);
  });

  // Mensagem livre pelo bot. `test: true` envia só para os admins.
  app.post("/admin/broadcast", async (request, reply) => {
    requireAdmin(request);
    const body = (request.body || {}) as { text?: string; withAppButton?: boolean; test?: boolean };
    const text = String(body.text ?? "").trim();
    if (!text) return reply.code(400).send({ ok: false, error: "Escreva a mensagem." });
    if (text.length > 3500) return reply.code(400).send({ ok: false, error: "Mensagem longa demais (máx. 3500 caracteres)." });

    const ids = body.test ? adminTelegramIds() : await listNotifiableUserIds();
    if (body.test && ids.length === 0) {
      return reply.code(400).send({ ok: false, error: "Configure CHAT_ADMIN_IDS no Railway para receber o teste." });
    }
    if (ids.length === 0) return reply.code(400).send({ ok: false, error: "Ninguém na lista ainda." });

    try {
      const { total } = startBroadcast(
        body.test ? "mensagem (teste)" : "mensagem",
        ids,
        buildCustomMessage(text, body.withAppButton !== false),
        request.log
      );
      return { ok: true, total, test: Boolean(body.test) };
    } catch (err) {
      return reply.code(409).send({ ok: false, error: (err as Error).message });
    }
  });

  // Quantas pessoas receberiam o aviso de curso novo agora.
  app.get("/admin/notify/audience", async (request) => {
    requireAdmin(request);
    const ids = await listNotifiableUserIds();
    return { count: ids.length, running: isBroadcastRunning() };
  });

  // Dispara (uma única vez por curso) o aviso de curso novo pelo bot.
  app.post<{ Params: { id: string } }>("/admin/courses/:id/notify", async (request, reply) => {
    requireAdmin(request);
    const { rows } = await pool.query(
      `SELECT c.id, c.name, c.description, c.price_stars, c.cover_url, c.is_active, c.invite_link,
              c.notified_at, cat.name AS category_name, cat.emoji AS category_emoji
       FROM courses c JOIN categories cat ON cat.id = c.category_id
       WHERE c.id = $1`,
      [request.params.id]
    );
    const course = rows[0];
    if (!course) return reply.code(404).send({ ok: false, error: "Curso não encontrado." });
    if (!course.is_active) return reply.code(400).send({ ok: false, error: "O curso está oculto do catálogo." });
    if (!course.invite_link) {
      return reply.code(400).send({ ok: false, error: "Gere e salve o invite do curso antes de avisar os alunos." });
    }
    if (course.notified_at) {
      return reply.code(409).send({ ok: false, error: "Os alunos já foram avisados sobre este curso." });
    }

    try {
      const { total } = await broadcastNewCourse(
        {
          id: course.id,
          name: course.name,
          description: course.description,
          priceStars: course.price_stars,
          coverUrl: course.cover_url,
          categoryName: course.category_name,
          categoryEmoji: course.category_emoji,
        },
        request.log
      );
      await pool.query("UPDATE courses SET notified_at = now() WHERE id = $1", [course.id]);
      return { ok: true, total };
    } catch (err) {
      return reply.code(409).send({ ok: false, error: (err as Error).message });
    }
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