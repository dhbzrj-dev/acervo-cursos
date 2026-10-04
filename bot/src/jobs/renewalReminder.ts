import type { Bot } from "grammy";
import {
  deactivateSubscription,
  listDueSoon,
  listToSync,
  markReminderSent,
  upsertSubscription,
} from "../services/backendClient.js";
import { escapeHtml } from "../lib/format.js";
import { isInChat, subscriptionEndsOn } from "../lib/membership.js";

function formatDate(iso: string) {
  return String(iso).slice(0, 10).split("-").reverse().join("/");
}

/**
 * O Telegram não garante um evento `chat_member` a cada renovação mensal.
 * Antes de lembrar alguém, pergunta ao Telegram a situação real de cada
 * assinatura que vence em breve (ou que já venceu no banco):
 * - renovou   -> grava a nova data (e o lembrete deixa de valer);
 * - saiu      -> desativa a assinatura;
 * - sem dados -> deixa como está.
 */
async function syncSubscriptions(bot: Bot) {
  const list = await listToSync(3);
  let renewed = 0;
  let ended = 0;

  for (const sub of list) {
    try {
      const member = await bot.api.getChatMember(sub.channelId, sub.telegramUserId);

      if (!isInChat(member)) {
        await deactivateSubscription({ telegramUserId: sub.telegramUserId, courseId: sub.courseId });
        ended++;
        continue;
      }

      const endsOn = subscriptionEndsOn(member);
      if (endsOn && endsOn !== sub.renewsAt) {
        await upsertSubscription({
          telegramUserId: sub.telegramUserId,
          courseId: sub.courseId,
          renewsAt: endsOn,
          channelDeepLink: sub.channelDeepLink,
        });
        renewed++;
      }
    } catch (err) {
      console.warn(`[sync] falhou user=${sub.telegramUserId} course=${sub.courseId}:`, err);
    }
  }

  if (list.length > 0) {
    console.log(`[sync] ${list.length} conferida(s): ${renewed} renovada(s), ${ended} encerrada(s).`);
  }
}

export function startRenewalReminderJob(bot: Bot) {
  async function tick() {
    try {
      await syncSubscriptions(bot);
    } catch (err) {
      console.error("[sync] job:", err);
    }

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
              "O Telegram cobra de novo automaticamente, do seu saldo de Stars, se você continuar no canal.",
              "💠 Compra Stars com Pix? Garanta saldo suficiente antes dessa data.",
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
