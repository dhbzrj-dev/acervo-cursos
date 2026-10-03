import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import { env } from "../config/env.js";

export function registerStartCommand(bot: Bot) {
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
      "📚 Abrir Acervo de Cursos",
      env.miniAppUrl
    );

    await ctx.reply(
      "Bem-vindo ao *Acervo de Cursos*!\n\n" +
        "Toque no botão abaixo para explorar o catálogo e assinar canais " +
        "com pagamento direto em Telegram Stars.",
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  });
}
