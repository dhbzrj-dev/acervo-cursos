import { pool } from "../db/pool.js";

/**
 * Registra (ou atualiza) alguém que pode receber mensagens do bot. Chamado
 * quando a pessoa dá /start no bot ou abre o Mini App autorizando o bot a
 * escrever para ela. Voltar a usar o bot desfaz um bloqueio antigo.
 */
export async function upsertBotUser(user: {
  telegramUserId: number;
  firstName?: string;
  username?: string;
}): Promise<{ isNew: boolean }> {
  const { rows } = await pool.query(
    `INSERT INTO bot_users (telegram_user_id, first_name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       username = EXCLUDED.username,
       blocked_at = NULL,
       last_seen_at = now()
     RETURNING (xmax = 0) AS inserted`,
    [user.telegramUserId, user.firstName ?? null, user.username ?? null]
  );
  return { isNew: Boolean(rows[0]?.inserted) };
}

export interface BotUserStats {
  total: number;
  today: number;
  last7Days: number;
  notifiable: number;
  blocked: number;
}

/** Números do bot; "hoje" no fuso de São Paulo. */
export async function getBotUserStats(): Promise<BotUserStats> {
  const { rows } = await pool.query(
    `SELECT count(*)::int AS total,
            count(*) FILTER (WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Sao_Paulo') AT TIME ZONE 'America/Sao_Paulo'))::int AS today,
            count(*) FILTER (WHERE created_at >= now() - interval '7 days')::int AS last7,
            count(*) FILTER (WHERE notify_new_courses AND blocked_at IS NULL)::int AS notifiable,
            count(*) FILTER (WHERE blocked_at IS NOT NULL)::int AS blocked
     FROM bot_users`
  );
  const r = rows[0];
  return { total: r.total, today: r.today, last7Days: r.last7, notifiable: r.notifiable, blocked: r.blocked };
}

export async function setNotifyNewCourses(telegramUserId: number, enabled: boolean): Promise<void> {
  await pool.query(
    `INSERT INTO bot_users (telegram_user_id, notify_new_courses)
     VALUES ($1, $2)
     ON CONFLICT (telegram_user_id) DO UPDATE SET notify_new_courses = $2`,
    [telegramUserId, enabled]
  );
}

export async function markBotUserBlocked(telegramUserId: number): Promise<void> {
  await pool.query(
    "UPDATE bot_users SET blocked_at = now() WHERE telegram_user_id = $1",
    [telegramUserId]
  );
}

/** IDs de quem quer (e pode) receber o aviso de curso novo. */
export async function listNotifiableUserIds(): Promise<number[]> {
  const { rows } = await pool.query(
    `SELECT telegram_user_id FROM bot_users
     WHERE notify_new_courses = TRUE AND blocked_at IS NULL
     ORDER BY telegram_user_id`
  );
  return rows.map((row) => Number(row.telegram_user_id));
}
