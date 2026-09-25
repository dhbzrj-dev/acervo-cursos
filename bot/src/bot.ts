import { Bot } from "grammy";
import { env } from "./config/env.js";
import { registerStartCommand } from "./commands/start.js";
import { registerChatMemberHandler } from "./handlers/chatMember.js";

const bot = new Bot(env.botToken);

registerStartCommand(bot);
registerChatMemberHandler(bot);

bot.catch((err) => {
  console.error("Erro não tratado no bot:", err.error);
});

async function main() {
  console.log("Iniciando bot do Acervo de Cursos...");

  // `chat_member` não vem por padrão no long polling — precisa ser pedido
  // explicitamente em allowed_updates, junto dos updates "normais".
  await bot.start({
    allowed_updates: ["message", "callback_query", "chat_member"],
    onStart: (info) => {
      console.log(`Bot @${info.username} rodando (long polling).`);
    },
  });
}

main();
