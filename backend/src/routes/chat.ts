import type { FastifyInstance } from "fastify";
import { pool } from "../db/pool.js";
import { requireTelegramAuth } from "../middleware/telegramAuth.js";

const ADJ = ["Mago", "Elfa", "Pixel", "Dragao", "Robo", "Guerreiro", "Ninja", "Oraculo", "Ciborgue", "Fada"];
const NOUN = ["DoCache", "DoPostgres", "DoLinux", "SemBug", "DoGit", "DeStars", "DoReact", "DaNuvem", "DoKernel", "DoPixel"];
const AVATARS = ["spark", "bot", "sword", "flame", "ghost"];

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function cleanBody(value: unknown): string {
  return String(value ?? "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .trim()
    .slice(0, 500);
}

async function isBanned(telegramUserId: number): Promise<boolean> {
  const { rows } = await pool.query(
    "SELECT 1 FROM chat_bans WHERE telegram_user_id = $1",
    [telegramUserId]
  );
  return rows.length > 0;
}

async function ensureAlias(telegramUserId: number) {
  const existing = await pool.query(
    "SELECT nickname, avatar FROM chat_aliases WHERE telegram_user_id = $1",
    [telegramUserId]
  );
  if (existing.rows[0]) return existing.rows[0] as { nickname: string; avatar: string };

  for (let i = 0; i < 8; i++) {
    const nickname = `${pick(ADJ)}${pick(NOUN)}${Math.floor(Math.random() * 90 + 10)}`;
    try {
      const created = await pool.query(
        `INSERT INTO chat_aliases (telegram_user_id, nickname, avatar)
         VALUES ($1, $2, $3)
         ON CONFLICT (telegram_user_id) DO NOTHING
         RETURNING nickname, avatar`,
        [telegramUserId, nickname, pick(AVATARS)]
      );
      if (created.rows[0]) return created.rows[0] as { nickname: string; avatar: string };
      const again = await pool.query(
        "SELECT nickname, avatar FROM chat_aliases WHERE telegram_user_id = $1",
        [telegramUserId]
      );
      if (again.rows[0]) return again.rows[0] as { nickname: string; avatar: string };
    } catch {
      // apelido repetido, tenta outro
    }
  }
  throw new Error("Não foi possível criar apelido.");
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

export async function chatRoutes(app: FastifyInstance) {
  app.get("/chat/messages", { preHandler: requireTelegramAuth }, async (request) => {
    const userId = request.telegramUser!.id;
    const me = await ensureAlias(userId);
    const after = Number((request.query as { after?: string }).after || 0);

    const { rows } = await pool.query(
      `SELECT m.id, m.body, m.created_at, m.telegram_user_id, a.nickname, a.avatar
       FROM chat_messages m
       JOIN chat_aliases a ON a.telegram_user_id = m.telegram_user_id
       WHERE NOT EXISTS (
         SELECT 1 FROM chat_bans b WHERE b.telegram_user_id = m.telegram_user_id
       )
         AND ($1::bigint = 0 OR m.id > $1)
       ORDER BY m.id DESC
       LIMIT 50`,
      [Number.isFinite(after) ? after : 0]
    );

    const messages = rows.reverse().map((row) => ({
      id: Number(row.id),
      body: row.body as string,
      createdAt: row.created_at,
      nickname: row.nickname as string,
      avatar: row.avatar as string,
      mine: Number(row.telegram_user_id) === userId,
    }));

    return { me, banned: await isBanned(userId), messages };
  });

  app.post("/chat/messages", { preHandler: requireTelegramAuth }, async (request, reply) => {
    const userId = request.telegramUser!.id;
    if (await isBanned(userId)) {
      return reply.code(403).send({ error: "Você não pode escrever na sala." });
    }

    const body = cleanBody((request.body as { body?: string })?.body);
    if (!body) return reply.code(400).send({ error: "Mensagem vazia." });

    await ensureAlias(userId);

    const recent = await pool.query(
      `SELECT created_at FROM chat_messages
       WHERE telegram_user_id = $1
       ORDER BY id DESC LIMIT 1`,
      [userId]
    );
    if (recent.rows[0]) {
      const delta = Date.now() - new Date(recent.rows[0].created_at).getTime();
      if (delta < 1500) return reply.code(429).send({ error: "Espere um instante." });
    }

    const inserted = await pool.query(
      `INSERT INTO chat_messages (telegram_user_id, body)
       VALUES ($1, $2)
       RETURNING id`,
      [userId, body]
    );
    return { ok: true, id: Number(inserted.rows[0].id) };
  });

  app.post("/admin/chat/ban", async (request) => {
    requireAdmin(request);
    const messageId = Number((request.body as { messageId?: number }).messageId);
    if (!messageId) return { ok: false, error: "messageId ausente" };

    const found = await pool.query(
      "SELECT telegram_user_id FROM chat_messages WHERE id = $1",
      [messageId]
    );
    if (!found.rows[0]) return { ok: false, error: "Mensagem não encontrada" };

    await pool.query(
      `INSERT INTO chat_bans (telegram_user_id)
       VALUES ($1)
       ON CONFLICT (telegram_user_id) DO NOTHING`,
      [found.rows[0].telegram_user_id]
    );
    return { ok: true };
  });
}