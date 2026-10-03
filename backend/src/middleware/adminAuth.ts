import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Sessão do painel /admin. O login troca a senha por um token assinado
 * (`<expiração>.<hmac>`), e só o token fica salvo no navegador — a senha
 * nunca mais trafega depois do login.
 *
 * A assinatura usa a própria ADMIN_PASSWORD como chave: trocar a senha no
 * Railway invalida na hora todas as sessões abertas.
 */
const SESSION_SECONDS = 7 * 24 * 60 * 60;

function adminPassword(): string {
  return process.env.ADMIN_PASSWORD || "";
}

function sign(payload: string, key: string): string {
  return createHmac("sha256", key).update(`admin-session:${payload}`).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function checkAdminPassword(candidate: unknown): boolean {
  const password = adminPassword();
  return Boolean(password) && safeEqual(String(candidate ?? ""), password);
}

export function createAdminToken(): string {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_SECONDS);
  return `${expiresAt}.${sign(expiresAt, adminPassword())}`;
}

function isValidAdminToken(token: string): boolean {
  const password = adminPassword();
  const [expiresAt, signature] = token.split(".");
  if (!password || !expiresAt || !signature) return false;
  if (!safeEqual(signature, sign(expiresAt, password))) return false;
  return Number(expiresAt) > Date.now() / 1000;
}

/** Lança 401 se o header `Authorization: Bearer <token>` não for uma sessão válida. */
export function requireAdmin(request: { headers: Record<string, unknown> }) {
  const header = String(request.headers.authorization || "");
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!isValidAdminToken(token)) {
    const err: Error & { statusCode?: number } = new Error("Unauthorized");
    err.statusCode = 401;
    throw err;
  }
}
