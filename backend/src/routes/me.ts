import type { FastifyInstance } from "fastify";
import { requireTelegramAuth } from "../middleware/telegramAuth.js";
import { listSubscriptionsForUser } from "../repositories/subscriptions.repo.js";
import { upsertBotUser } from "../repositories/botUsers.repo.js";

export async function meRoutes(app: FastifyInstance) {
  // Todas as rotas abaixo exigem o header `Authorization: tma <initData>`.
  app.addHook("preHandler", requireTelegramAuth);

  // GET /me/subscriptions — assinaturas ativas do usuário logado.
  app.get("/me/subscriptions", async (request) => {
    const user = request.telegramUser!;
    // Chamado a cada abertura do app: quem permite mensagens do bot entra
    // na lista de avisos de cursos novos.
    if (user.allows_write_to_pm) {
      upsertBotUser({ telegramUserId: user.id, firstName: user.first_name, username: user.username }).catch(
        (err) => request.log.warn({ err }, "Falha ao registrar usuário do bot")
      );
    }
    return listSubscriptionsForUser(user.id);
  });

  // GET /me — dados básicos do usuário, úteis para depurar a autenticação.
  app.get("/me", async (request) => {
    return { user: request.telegramUser };
  });
}
