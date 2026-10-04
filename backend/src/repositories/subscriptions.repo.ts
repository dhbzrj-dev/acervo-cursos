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
/**
 * Assinaturas ativas que vencem em até `days` dias — ou que já venceram e
 * continuam marcadas como ativas. O bot confere cada uma com `getChatMember`
 * e corrige a data, já que o Telegram não avisa toda renovação.
 */
export async function listSubscriptionsToSync(days: number) {
  const { rows } = await pool.query(
    `SELECT s.telegram_user_id, s.course_id, s.renews_at, s.channel_deep_link,
            c.channel_id
     FROM user_subscriptions s
     JOIN courses c ON c.id = s.course_id
     WHERE s.active = TRUE
       AND s.renews_at <= (CURRENT_DATE + $1::int)
     ORDER BY s.renews_at ASC`,
    [days]
  );
  return rows.map((row) => ({
    telegramUserId: Number(row.telegram_user_id),
    courseId: row.course_id as string,
    renewsAt: toIsoDay(row.renews_at),
    channelDeepLink: row.channel_deep_link as string,
    channelId: row.channel_id as string,
  }));
}

function toIsoDay(value: unknown): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

export async function listSubscriptionsDueInDays(days: number) {
  const { rows } = await pool.query(
    `SELECT s.telegram_user_id, s.course_id, s.renews_at, c.name AS course_name
     FROM user_subscriptions s
     JOIN courses c ON c.id = s.course_id
     WHERE s.active = TRUE
       AND s.renews_at = (CURRENT_DATE + $1::int)
       AND (s.renewal_reminder_sent_on IS NULL OR s.renewal_reminder_sent_on <> CURRENT_DATE)`,
    [days]
  );
  return rows as {
    telegram_user_id: number;
    course_id: string;
    renews_at: string;
    course_name: string;
  }[];
}

export async function markRenewalReminderSent(telegramUserId: number, courseId: string) {
  await pool.query(
    `UPDATE user_subscriptions
     SET renewal_reminder_sent_on = CURRENT_DATE
     WHERE telegram_user_id = $1 AND course_id = $2`,
    [telegramUserId, courseId]
  );
}