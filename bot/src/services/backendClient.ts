import { env } from "../config/env.js";

async function callInternalApi(path: string, body: unknown): Promise<void> {
  const res = await fetch(`${env.backendUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-internal-key": env.internalApiKey,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao chamar ${path}: ${res.status} ${text}`);
  }
}

export function upsertSubscription(params: {
  telegramUserId: number;
  courseId: string;
  renewsAt: string;
  channelDeepLink: string;
}): Promise<void> {
  return callInternalApi("/internal/subscriptions", params);
}

export function deactivateSubscription(params: {
  telegramUserId: number;
  courseId: string;
}): Promise<void> {
  return callInternalApi("/internal/subscriptions/deactivate", params);
}

/** Guarda quem deu /start: essas pessoas podem receber avisos de cursos novos. */
export function registerBotUser(params: {
  telegramUserId: number;
  firstName?: string;
  username?: string;
}): Promise<void> {
  return callInternalApi("/internal/bot-users", params);
}

export function setNewCourseNotifications(telegramUserId: number, enabled: boolean): Promise<void> {
  return callInternalApi("/internal/bot-users/notify", { telegramUserId, enabled });
}

export async function listToSync(days = 3) {
  const res = await fetch(
    `${env.backendUrl}/internal/subscriptions/to-sync?days=${days}`,
    { headers: { "x-internal-key": env.internalApiKey } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao listar assinaturas para sincronizar: ${res.status} ${text}`);
  }
  return res.json() as Promise<
    {
      telegramUserId: number;
      courseId: string;
      renewsAt: string;
      channelDeepLink: string;
      channelId: string;
    }[]
  >;
}

export async function listDueSoon(days = 3) {
  const res = await fetch(
    `${env.backendUrl}/internal/subscriptions/due-soon?days=${days}`,
    { headers: { "x-internal-key": env.internalApiKey } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Falha ao listar vencimentos: ${res.status} ${text}`);
  }
  return res.json() as Promise<
    {
      telegram_user_id: number;
      course_id: string;
      renews_at: string;
      course_name: string;
    }[]
  >;
}

export function markReminderSent(telegramUserId: number, courseId: string) {
  return callInternalApi("/internal/subscriptions/reminder-sent", {
    telegramUserId,
    courseId,
  });
}