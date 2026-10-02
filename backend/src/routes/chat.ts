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

function isChatAdmin(userId: number): boolean {
  const ids = String(process.env.CHAT_ADMIN_IDS || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
  return ids.includes(String(userId));
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

async function aliasByNickname(nickname: string) {
  const { rows } = await pool.query(
    `SELECT telegram_user_id, nickname FROM chat_aliases WHERE lower(nickname) = lower($1)`,
    [nickname]
  );
  return rows[0] as { telegram_user_id: string; nickname: string } | undefined;
}

async function aliasByMessage(messageId: number) {
  const { rows } = await pool.query(
    `SELECT m.telegram_user_id, a.nickname
     FROM chat_messages m
     JOIN chat_aliases a ON a.telegram_user_id = m.telegram_user_id
     WHERE m.id = $1`,
    [messageId]
  );
  return rows[0] as { telegram_user_id: string; nickname: string } | undefined;
}

async function liveMessageIds() {
  const { rows } = await pool.query(
    `SELECT m.id
     FROM chat_messages m
     WHERE NOT EXISTS (
       SELECT 1 FROM chat_bans b WHERE b.telegram_user_id = m.telegram_user_id
     )
     ORDER BY m.id DESC
     LIMIT 50`
  );
  return rows.map((row) => Number(row.id)).reverse();
}

async function bannedNicknames() {
  const { rows } = await pool.query(
    `SELECT a.nickname
     FROM chat_bans b
     JOIN chat_aliases a ON a.telegram_user_id = b.telegram_user_id
     ORDER BY a.nickname`
  );
  return rows.map((row) => String(row.nickname));
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
    const admin = isChatAdmin(userId);

    const { rows } = await pool.query(
      `SELECT m.id, m.body, m.created_at, m.telegram_user_id, a.nickname, a.avatar,
              m.reply_to_id, p.body AS reply_body, pa.nickname AS reply_nickname
       FROM chat_messages m
       JOIN chat_aliases a ON a.telegram_user_id = m.telegram_user_id
       LEFT JOIN chat_messages p ON p.id = m.reply_to_id
       LEFT JOIN chat_aliases pa ON pa.telegram_user_id = p.telegram_user_id
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
      reply: row.reply_to_id
        ? {
            id: Number(row.reply_to_id),
            nickname: (row.reply_nickname as string) || "Alguém",
            body: (row.reply_body as string) || "",
          }
        : null,
    }));

    return {
      me: { ...me, telegramId: userId },
      banned: await isBanned(userId),
      admin,
      bans: admin ? await bannedNicknames() : [],
      liveIds: await liveMessageIds(),
      messages,
    };
  });

  app.post("/chat/messages", { preHandler: requireTelegramAuth }, async (request, reply) => {
    const userId = request.telegramUser!.id;
    if (await isBanned(userId)) {
      return reply.code(403).send({ error: "Você não pode escrever na sala." });
    }

    const payload = (request.body || {}) as { body?: string; replyTo?: number };
    const body = cleanBody(payload.body);
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

    let replyTo: number | null = null;
    const wanted = Number(payload.replyTo || 0);
    if (wanted) {
      const parent = await pool.query("SELECT id FROM chat_messages WHERE id = $1", [wanted]);
      if (parent.rows[0]) replyTo = wanted;
    }

    const inserted = await pool.query(
      `INSERT INTO chat_messages (telegram_user_id, body, reply_to_id)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, body, replyTo]
    );
    return { ok: true, id: Number(inserted.rows[0].id) };
  });

  app.post("/chat/moderation", { preHandler: requireTelegramAuth }, async (request, reply) => {
    const userId = request.telegramUser!.id;
    if (!isChatAdmin(userId)) return reply.code(403).send({ error: "Só o admin." });

    const payload = (request.body || {}) as { action?: string; messageId?: number; nickname?: string };
    const action = payload.action;

    if (action === "delete") {
      const id = Number(payload.messageId);
      if (!id) return reply.code(400).send({ error: "Mensagem ausente." });
      await pool.query("UPDATE chat_messages SET reply_to_id = NULL WHERE reply_to_id = $1", [id]);
      const removed = await pool.query("DELETE FROM chat_messages WHERE id = $1", [id]);
      if (!removed.rowCount) return reply.code(404).send({ error: "Mensagem não encontrada." });
      return { ok: true, notice: "Mensagem apagada." };
    }

    if (action === "ban") {
      const target = await aliasByMessage(Number(payload.messageId));
      if (!target) return reply.code(404).send({ error: "Mensagem não encontrada." });
      if (String(target.telegram_user_id) === String(userId)) {
        return reply.code(400).send({ error: "Você não pode se banir." });
      }
      await pool.query(
        `INSERT INTO chat_bans (telegram_user_id) VALUES ($1)
         ON CONFLICT (telegram_user_id) DO NOTHING`,
        [target.telegram_user_id]
      );
      return { ok: true, notice: `${target.nickname} foi banido.` };
    }

    if (action === "unban") {
      const nickname = String(payload.nickname || "").trim();
      const target = nickname ? await aliasByNickname(nickname) : undefined;
      if (!target) return reply.code(404).send({ error: "Apelido não encontrado." });
      await pool.query("DELETE FROM chat_bans WHERE telegram_user_id = $1", [target.telegram_user_id]);
      return { ok: true, notice: `${target.nickname} pode escrever de novo.` };
    }

    return reply.code(400).send({ error: "Ação inválida." });
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