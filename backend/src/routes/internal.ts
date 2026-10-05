import type { FastifyInstance } from "fastify";
import { requireInternalKey } from "../middleware/internalAuth.js";
import {
  deactivateSubscription,
  listSubscriptionsDueInDays,
  listSubscriptionsToSync,
  markRenewalReminderSent,
  upsertSubscription,
} from "../repositories/subscriptions.repo.js";
import { setNotifyNewCourses } from "../repositories/botUsers.repo.js";
import { registerBotUserAndAlert } from "../lib/newUserAlert.js";

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

  // O bot registra quem deu /start (essas pessoas podem receber avisos).
  app.post<{ Body: { telegramUserId: number; firstName?: string; username?: string } }>(
    "/internal/bot-users",
    async (request, reply) => {
      const { telegramUserId, firstName, username } = request.body ?? ({} as never);
      if (!telegramUserId) return reply.code(400).send({ error: "telegramUserId ausente." });
      await registerBotUserAndAlert({ telegramUserId, firstName, username }, "start", request.log);
      reply.code(204).send();
    }
  );

  // Liga/desliga o aviso de cursos novos (botão "Parar avisos" e /avisos).
  app.post<{ Body: { telegramUserId: number; enabled: boolean } }>(
    "/internal/bot-users/notify",
    async (request, reply) => {
      const { telegramUserId, enabled } = request.body ?? ({} as never);
      if (!telegramUserId || typeof enabled !== "boolean") {
        return reply.code(400).send({ error: "Campos obrigatórios ausentes." });
      }
      await setNotifyNewCourses(telegramUserId, enabled);
      reply.code(204).send();
    }
  );

  app.get("/internal/subscriptions/to-sync", async (request) => {
    const days = Number((request.query as { days?: string }).days ?? 3);
    return listSubscriptionsToSync(Number.isFinite(days) ? days : 3);
  });

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