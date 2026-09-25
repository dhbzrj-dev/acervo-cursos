import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";

function slug(text: string) {
  return String(text)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function requireAdmin(request: { headers: Record<string, unknown> }) {
  const header = String(request.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  const password = process.env.ADMIN_PASSWORD || "";
  if (!password || token !== password) {
    const err: Error & { statusCode?: number } = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
}

export async function adminRoutes(app: FastifyInstance) {
  app.post("/admin/login", async (request, reply) => {
    const body = (request.body || {}) as { password?: string };
    const password = process.env.ADMIN_PASSWORD || "";
    if (!password || body.password !== password) {
      return reply.code(401).send({ ok: false, error: "Senha inválida." });
    }
    return { ok: true, token: password };
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
      : String(b.benefits || "")
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean);

    await pool.query(
      `INSERT INTO courses
        (id, category_id, name, description, benefits, cover_url, price_stars, invite_link, channel_id, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        id,
        b.category_id,
        b.name,
        b.description || "",
        benefits,
        b.cover_url || "",
        Number(b.price_stars || 0),
        b.invite_link || "",
        b.channel_id || "",
        b.is_active !== false,
      ]
    );
    return { ok: true, id };
  });

  app.put<{ Params: { id: string } }>("/admin/courses/:id", async (request) => {
    requireAdmin(request);
    const b = request.body as any;
    const benefits = Array.isArray(b.benefits)
      ? b.benefits
      : String(b.benefits || "")
          .split("\n")
          .map((s: string) => s.trim())
          .filter(Boolean);

    await pool.query(
      `UPDATE courses SET
        category_id = $1,
        name = $2,
        description = $3,
        benefits = $4,
        cover_url = $5,
        price_stars = $6,
        invite_link = $7,
        channel_id = $8,
        is_active = $9
       WHERE id = $10`,
      [
        b.category_id,
        b.name,
        b.description || "",
        benefits,
        b.cover_url || "",
        Number(b.price_stars || 0),
        b.invite_link || "",
        b.channel_id || "",
        b.is_active !== false,
        request.params.id,
      ]
    );
    return { ok: true };
  });

  app.delete<{ Params: { id: string } }>("/admin/courses/:id", async (request) => {
    requireAdmin(request);
    await pool.query("DELETE FROM courses WHERE id = $1", [request.params.id]);
    return { ok: true };
  });
}