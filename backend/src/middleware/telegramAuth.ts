import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

/**
 * Validação de `Telegram.WebApp.initData`, seguindo o algoritmo oficial:
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 * 1. Extrai o campo `hash` e remove ele da string.
 * 2. Ordena os pares `key=value` restantes alfabeticamente e junta com "\n"
 *    -> essa é a "data-check-string".
 * 3. `secret_key = HMAC_SHA256("WebAppData", bot_token)`.
 * 4. `hash_calculado = HMAC_SHA256(secret_key, data_check_string)`.
 * 5. Compara `hash_calculado` com o `hash` recebido (comparação de tempo
 *    constante, para não vazar informação por timing attack).
 *
 * Isso garante que os dados (`user`, `auth_date`, etc.) realmente vieram do
 * Telegram e não foram forjados por quem chama a API diretamente.
 */

export interface TelegramInitDataUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

export interface ParsedInitData {
  raw: string;
  user: TelegramInitDataUser;
  authDate: number;
  startParam?: string;
}

class InitDataValidationError extends Error {}

function computeSecretKey(botToken: string): Buffer {
  // secret_key = HMAC_SHA256(key="WebAppData", data=bot_token)
  return createHmac("sha256", "WebAppData").update(botToken).digest();
}

export function parseAndValidateInitData(
  initData: string,
  botToken: string,
  maxAgeSeconds: number
): ParsedInitData {
  if (!initData) {
    throw new InitDataValidationError("initData ausente");
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    throw new InitDataValidationError("initData sem campo hash");
  }
  params.delete("hash");

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");

  const secretKey = computeSecretKey(botToken);
  const computedHash = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const computedBuf = Buffer.from(computedHash, "hex");
  const receivedBuf = Buffer.from(hash, "hex");
  const isValid =
    computedBuf.length === receivedBuf.length &&
    timingSafeEqual(computedBuf, receivedBuf);

  if (!isValid) {
    throw new InitDataValidationError("assinatura HMAC inválida");
  }

  const authDate = Number(params.get("auth_date") ?? 0);
  const ageSeconds = Date.now() / 1000 - authDate;
  if (!authDate || ageSeconds > maxAgeSeconds) {
    throw new InitDataValidationError("initData expirado");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new InitDataValidationError("initData sem campo user");
  }

  let user: TelegramInitDataUser;
  try {
    user = JSON.parse(userRaw);
  } catch {
    throw new InitDataValidationError("campo user malformado");
  }

  return {
    raw: initData,
    user,
    authDate,
    startParam: params.get("start_param") ?? undefined,
  };
}

// Extensão de tipos do Fastify para carregar o usuário autenticado no request.
declare module "fastify" {
  interface FastifyRequest {
    telegramUser?: TelegramInitDataUser;
  }
}

/**
 * Hook de autenticação para rotas protegidas (`/me/*`). Espera o header
 * `Authorization: tma <initData>` — convenção recomendada pelo próprio
 * Telegram para Mini Apps (o prefixo "tma" identifica o esquema).
 */
export async function requireTelegramAuth(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const authHeader = request.headers.authorization ?? "";
  const [scheme, initData] = authHeader.split(" ");

  if (scheme !== "tma" || !initData) {
    reply.code(401).send({ error: "Cabeçalho Authorization ausente ou inválido. Esperado: 'tma <initData>'." });
    return reply;
  }

  try {
    const parsed = parseAndValidateInitData(
      initData,
      env.botToken,
      env.initDataMaxAgeSeconds
    );
    request.telegramUser = parsed.user;
  } catch (err) {
    request.log.warn({ err }, "Falha ao validar initData");
    reply.code(401).send({ error: "initData inválido ou expirado." });
    return reply;
  }
}

// Exportado apenas para testes unitários do algoritmo de validação.
export function hashPreview(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 8);
}
