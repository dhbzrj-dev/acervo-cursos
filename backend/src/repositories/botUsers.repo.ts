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
}): Promise<void> {
  await pool.query(
    `INSERT INTO bot_users (telegram_user_id, first_name, username)
     VALUES ($1, $2, $3)
     ON CONFLICT (telegram_user_id) DO UPDATE SET
       first_name = EXCLUDED.first_name,
       username = EXCLUDED.username,
       blocked_at = NULL,
       last_seen_at = now()`,
    [user.telegramUserId, user.firstName ?? null, user.username ?? null]
  );
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
