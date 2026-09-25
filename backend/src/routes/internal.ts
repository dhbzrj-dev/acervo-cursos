import type { FastifyInstance } from "fastify";
import { requireInternalKey } from "../middleware/internalAuth.js";
import {
  deactivateSubscription,
  upsertSubscription,
} from "../repositories/subscriptions.repo.js";

interface UpsertBody {
  telegramUserId: number;
  courseId: string;
  renewsAt: string; // YYYY-MM-DD
  channelDeepLink: string;
}

interface DeactivateBody {
  telegramUserId: number;
  courseId: string;
}

/**
 * Rotas server-to-server, chamadas pelo processo do bot quando ele recebe
 * updates do Telegram (`chat_member`) sobre entradas/saídas em canais com
 * assinatura paga. Nunca exposta ao Mini App diretamente.
 */
export async function internalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireInternalKey);

  // POST /internal/subscriptions — cria/atualiza uma assinatura ativa.
  app.post<{ Body: UpsertBody }>("/internal/subscriptions", async (request, reply) => {
    const { telegramUserId, courseId, renewsAt, channelDeepLink } = request.body;

    if (!telegramUserId || !courseId || !renewsAt || !channelDeepLink) {
      reply.code(400).send({ error: "Campos obrigatórios ausentes." });
      return;
    }

    await upsertSubscription({
      telegramUserId,
      courseId,
      active: true,
      renewsAt,
      channelDeepLink,
    });

    reply.code(204).send();
  });

  // POST /internal/subscriptions/deactivate — usuário saiu do canal ou
  // teve a cobrança recusada pelo Telegram.
  app.post<{ Body: DeactivateBody }>(
    "/internal/subscriptions/deactivate",
    async (request, reply) => {
      const { telegramUserId, courseId } = request.body;

      if (!telegramUserId || !courseId) {
        reply.code(400).send({ error: "Campos obrigatórios ausentes." });
        return;
      }

      await deactivateSubscription(telegramUserId, courseId);
      reply.code(204).send();
    }
  );
}
