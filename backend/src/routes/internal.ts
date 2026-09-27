import type { FastifyInstance } from "fastify";
import { requireInternalKey } from "../middleware/internalAuth.js";
import {
  deactivateSubscription,
  listSubscriptionsDueInDays,
  markRenewalReminderSent,
  upsertSubscription,
} from "../repositories/subscriptions.repo.js";

interface UpsertBody {
  telegramUserId: number;
  courseId: string;
  renewsAt: string;
  channelDeepLink: string;
}

interface DeactivateBody {
  telegramUserId: number;
  courseId: string;
}

interface ReminderSentBody {
  telegramUserId: number;
  courseId: string;
}

export async function internalRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireInternalKey);

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

  app.get("/internal/subscriptions/due-soon", async (request) => {
    const days = Number((request.query as { days?: string }).days ?? 3);
    return listSubscriptionsDueInDays(Number.isFinite(days) ? days : 3);
  });

  app.post<{ Body: ReminderSentBody }>(
    "/internal/subscriptions/reminder-sent",
    async (request, reply) => {
      const { telegramUserId, courseId } = request.body;

      if (!telegramUserId || !courseId) {
        reply.code(400).send({ error: "Campos obrigatórios ausentes." });
        return;
      }

      await markRenewalReminderSent(telegramUserId, courseId);
      reply.code(204).send();
    }
  );
}