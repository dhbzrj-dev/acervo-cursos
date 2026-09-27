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

  bot.command("testenotif", async (ctx) => {
    await ctx.reply(
      [
        "✅ *Assinatura confirmada*",
        "",
        "Você entrou em *Curso de teste*.",
        "Acesso até *26/10/2026*.",
        "",
        "Abra o canal pelo Mini App em *Meus cursos* se precisar do link de novo.",
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
  });

  bot.command("testenovacao", async (ctx) => {
    await ctx.reply(
      [
        "⏳ *Sua assinatura vence em 3 dias*",
        "",
        "Curso: *Curso de teste*",
        "Renova em: *29/09/2026*",
        "",
        "O Telegram Stars cobra de novo automaticamente se você continuar no canal.",
        "Para cancelar, saia do canal antes da data.",
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
  });

  bot.command("testenovo", async (ctx) => {
    await ctx.reply(
      [
        "🆕 *Novo curso na sua categoria*",
        "",
        "*Curso de teste*",
        "100 Stars",
        "",
        "Abra o Acervo para ver.",
      ].join("\n"),
      { parse_mode: "Markdown" }
    );
  });
}