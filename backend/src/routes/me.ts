import type { FastifyInstance } from "fastify";
import { requireTelegramAuth } from "../middleware/telegramAuth.js";
import { listSubscriptionsForUser } from "../repositories/subscriptions.repo.js";

export async function meRoutes(app: FastifyInstance) {
  // Todas as rotas abaixo exigem o header `Authorization: tma <initData>`.
  app.addHook("preHandler", requireTelegramAuth);

  // GET /me/subscriptions — assinaturas ativas do usuário logado.
  app.get("/me/subscriptions", async (request) => {
    const userId = request.telegramUser!.id;
    return listSubscriptionsForUser(userId);
  });

  // GET /me — dados básicos do usuário, úteis para depurar a autenticação.
  app.get("/me", async (request) => {
    return { user: request.telegramUser };
  });
}
