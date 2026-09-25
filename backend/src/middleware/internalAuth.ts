import type { FastifyReply, FastifyRequest } from "fastify";
import { env } from "../config/env.js";

/**
 * Autenticação simples por chave compartilhada, usada apenas nas rotas
 * `/internal/*` — chamadas server-to-server pelo processo do bot, nunca
 * pelo Mini App. Header esperado: `x-internal-key: <INTERNAL_API_KEY>`.
 */
export async function requireInternalKey(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const key = request.headers["x-internal-key"];
  if (key !== env.internalApiKey) {
    reply.code(401).send({ error: "Chave interna inválida." });
    return reply;
  }
}
