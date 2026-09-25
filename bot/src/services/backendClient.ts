import { env } from "../config/env.js";

/**
 * Cliente fino para as rotas internas do backend (`/internal/*`).
 * Autentica via header `x-internal-key`, o mesmo `INTERNAL_API_KEY`
 * configurado dos dois lados.
 */

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
  renewsAt: string; // YYYY-MM-DD
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
