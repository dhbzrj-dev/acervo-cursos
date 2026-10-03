import type { Bot } from "grammy";
import { listDueSoon, markReminderSent } from "../services/backendClient.js";
import { escapeHtml } from "../lib/format.js";

function formatDate(iso: string) {
  return String(iso).slice(0, 10).split("-").reverse().join("/");
}

export function startRenewalReminderJob(bot: Bot) {
  async function tick() {
    try {
      const list = await listDueSoon(3);
      for (const item of list) {
        try {
          await bot.api.sendMessage(
            item.telegram_user_id,
            [
              "⏳ <b>Sua assinatura vence em 3 dias</b>",
              "",
              `Curso: <b>${escapeHtml(item.course_name)}</b>`,
              `Renova em: <b>${formatDate(item.renews_at)}</b>`,
              "",
              "O Telegram Stars cobra de novo automaticamente se você continuar no canal.",
              "Para cancelar, saia do canal antes da data.",
            ].join("\n"),
            { parse_mode: "HTML" }
          );
          await markReminderSent(item.telegram_user_id, item.course_id);
        } catch (err) {
          console.warn("[renewal] falhou user=", item.telegram_user_id, err);
        }
      }
    } catch (err) {
      console.error("[renewal] job:", err);
    }
  }

  tick();
  setInterval(tick, 6 * 60 * 60 * 1000);
}