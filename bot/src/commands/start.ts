import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import { env } from "../config/env.js";

export function registerStartCommand(bot: Bot) {
  bot.command("start", async (ctx) => {
    const keyboard = new InlineKeyboard().webApp(
      "📚 Abrir Olimpocursos",
      env.miniAppUrl
    );

    await ctx.reply(
      "Bem-vindo ao *Olimpocursos*!\n\n" +
        "Toque no botão abaixo para explorar o catálogo e assinar canais " +
        "com pagamento direto em Telegram Stars.",
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
  });

  // Suporte a pagamentos: canal oficial de contato para cobranças em Stars.
  bot.command("paysupport", async (ctx) => {
    await ctx.reply(
      [
        "💬 <b>Suporte a pagamentos</b>",
        "",
        `Fale com ${SUPPORT_HANDLE} e informe:`,
        "• seu @usuário do Telegram",
        "• o curso",
        "• a data do pagamento",
        "",
        "Para cancelar uma assinatura, basta sair do canal do curso antes da data de renovação.",
      ].join("\n"),
      { parse_mode: "HTML" }
    );
  });

  bot.command(["termos", "terms"], async (ctx) => {
    await ctx.reply("Termos de uso e política de privacidade do Olimpocursos:", {
      reply_markup: new InlineKeyboard().webApp("📄 Ler termos", `${miniAppBase()}/#/termos`),
    });
  });
}

const SUPPORT_HANDLE = "@Olimpocursosreal";

function miniAppBase() {
  return env.miniAppUrl.replace(/\/+$/, "");
}

/** Lista de comandos que aparece no menu "/" do Telegram. */
export const BOT_COMMANDS = [
  { command: "start", description: "Abrir o Olimpocursos" },
  { command: "paysupport", description: "Suporte a pagamentos" },
  { command: "termos", description: "Termos e privacidade" },
];
