import { pool } from "../db/pool.js";

export interface SubscriptionRow {
  courseId: string;
  active: boolean;
  renewsAt: string;
  channelDeepLink: string;
}

function mapRow(row: any): SubscriptionRow {
  return {
    courseId: row.course_id,
    active: row.active,
    renewsAt: row.renews_at,
    channelDeepLink: row.channel_deep_link,
  };
}

export async function listSubscriptionsForUser(
  telegramUserId: number
): Promise<SubscriptionRow[]> {
  const { rows } = await pool.query(
    `SELECT course_id, active, renews_at, channel_deep_link
     FROM user_subscriptions
     WHERE telegram_user_id = $1 AND active = TRUE
     ORDER BY renews_at ASC`,
    [telegramUserId]
  );
  return rows.map(mapRow);
}

/**
 * Cria ou atualiza a assinatura de um usuário para um curso. Usado pelo bot
 * quando detecta que alguém entrou no canal via link de assinatura paga
 * (evento `chat_member`), ou quando a assinatura é renovada/cancelada.
 */
export async function upsertSubscription(params: {
  telegramUserId: number;
  courseId: string;
  active: boolean;
  renewsAt: string; // YYYY-MM-DD
  channelDeepLink: string;
}): Promise<void> {
  await pool.query(
    `INSERT INTO user_subscriptions
       (telegram_user_id, course_id, active, renews_at, channel_deep_link)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (telegram_user_id, course_id) DO UPDATE SET
       active = $3, renews_at = $4, channel_deep_link = $5`,
    [
      params.telegramUserId,
      params.courseId,
      params.active,
      params.renewsAt,
      params.channelDeepLink,
    ]
  );
}

/** Marca a assinatura como inativa (usuário saiu do canal ou pagamento falhou). */
export async function deactivateSubscription(
  telegramUserId: number,
  courseId: string
): Promise<void> {
  await pool.query(
    `UPDATE user_subscriptions SET active = FALSE
     WHERE telegram_user_id = $1 AND course_id = $2`,
    [telegramUserId, courseId]
  );
}
