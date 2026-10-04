import { InlineKeyboard } from "grammy";
import type { Bot } from "grammy";
import { env } from "../config/env.js";
import { registerBotUser, setNewCourseNotifications } from "../services/backendClient.js";

export function registerStartCommand(bot: Bot) {
  bot.command("start", async (ctx) => {
    if (ctx.from) {
      // Quem deu /start pode receber avisos de cursos novos.
      registerBotUser({
        telegramUserId: ctx.from.id,
        firstName: ctx.from.first_name,
        username: ctx.from.username,
      }).catch((err) => console.warn("[start] não registrou usuário:", err));
    }

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

  // Avisos de cursos novos: liga/desliga.
  bot.command("avisos", async (ctx) => {
    await ctx.reply("🔔 <b>Avisos de cursos novos</b>\n\nQuer receber uma mensagem sempre que um curso novo chegar?", {
      parse_mode: "HTML",
      reply_markup: new InlineKeyboard()
        .text("🔔 Quero receber", "notify_on")
        .text("🔕 Não quero", "notify_off"),
    });
  });

  for (const [data, enabled] of [["notify_on", true], ["notify_off", false]] as const) {
    bot.callbackQuery(data, async (ctx) => {
      try {
        await setNewCourseNotifications(ctx.from.id, enabled);
        await ctx.answerCallbackQuery({
          text: enabled ? "Avisos ligados 🔔" : "Avisos desligados. Para voltar, envie /avisos.",
        });
      } catch (err) {
        console.warn("[avisos] falhou:", err);
        await ctx.answerCallbackQuery({ text: "Não deu agora. Tente de novo em instantes." });
      }
    });
  }
}

const SUPPORT_HANDLE = "@Olimpocursosreal";

function miniAppBase() {
  return env.miniAppUrl.replace(/\/+$/, "");
}

/** Lista de comandos que aparece no menu "/" do Telegram. */
export const BOT_COMMANDS = [
  { command: "start", description: "Abrir o Olimpocursos" },
  { command: "paysupport", description: "Suporte a pagamentos" },
  { command: "avisos", description: "Avisos de cursos novos" },
  { command: "termos", description: "Termos e privacidade" },
];
