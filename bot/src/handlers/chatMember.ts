import type { Bot } from "grammy";
import { deactivateSubscription, upsertSubscription } from "../services/backendClient.js";
import { findCourseByChannelId, findCourseByInviteLink } from "../services/coursesCache.js";
import { escapeHtml } from "../lib/format.js";
import { isInChat, subscriptionEndsOn } from "../lib/membership.js";

function channelDeepLink(chatId: number): string {
  const raw = String(chatId).replace(/^-100/, "").replace(/^-/, "");
  return `https://t.me/c/${raw}/1`;
}

export function registerChatMemberHandler(bot: Bot) {
  bot.on("chat_member", async (ctx) => {
    const update = ctx.chatMember;
    const { chat, new_chat_member, old_chat_member, invite_link } = update;
    const telegramUserId = new_chat_member.user.id;

    try {
      const course =
        (await findCourseByChannelId(chat.id)) ??
        (invite_link ? await findCourseByInviteLink(invite_link.invite_link) : null);

      if (!course) return;

      const courseName = escapeHtml((course as { name?: string }).name || course.id);

      const wasIn = isInChat(old_chat_member);
      const isIn = isInChat(new_chat_member);
      const renewedOn = subscriptionEndsOn(new_chat_member);
      // Só conta como assinatura quem entrou pagando: o Telegram informa a data
      // de expiração (`until_date`) apenas para assinaturas pagas em Stars.
      // Entradas grátis (link principal, canal público, admin que adicionou)
      // não viram assinatura.
      const becameActive = isIn && !wasIn && renewedOn !== null;
      const becameInactive = !isIn && wasIn;
      const hadSubscription = subscriptionEndsOn(old_chat_member) !== null;

      if (isIn && !wasIn && renewedOn === null) {
        console.log(`[chat_member] entrada sem assinatura paga ignorada: user=${telegramUserId} course=${course.id}`);
      }

      if (becameActive) {
        const renewsAt = renewedOn;

        await upsertSubscription({
          telegramUserId,
          courseId: course.id,
          renewsAt,
          channelDeepLink: channelDeepLink(chat.id),
        });

        const untilLabel = renewsAt.split("-").reverse().join("/");
        try {
          await ctx.api.sendMessage(
            telegramUserId,
            [
              "✅ <b>Assinatura confirmada</b>",
              "",
              `Você entrou em <b>${courseName}</b>.`,
              `Acesso até <b>${untilLabel}</b>.`,
              "",
              "Abra o canal pelo Mini App em <b>Meus cursos</b> se precisar do link de novo.",
            ].join("\n"),
            { parse_mode: "HTML" }
          );
        } catch (notifyErr) {
          console.warn(`[chat_member] não avisou user=${telegramUserId}:`, notifyErr);
        }

        console.log(`[chat_member] ativada: user=${telegramUserId} course=${course.id}`);
      } else if (becameInactive) {
        await deactivateSubscription({ telegramUserId, courseId: course.id });

        // Quem estava de graça no canal não tinha assinatura para encerrar.
        if (hadSubscription) {
          try {
            await ctx.api.sendMessage(
              telegramUserId,
              [
                "⚠️ <b>Acesso encerrado</b>",
                "",
                `Você saiu de <b>${courseName}</b> ou a assinatura expirou.`,
                "Para voltar, abra o catálogo e toque em <b>Assinar</b>.",
              ].join("\n"),
              { parse_mode: "HTML" }
            );
          } catch (notifyErr) {
            console.warn(`[chat_member] não avisou saída user=${telegramUserId}:`, notifyErr);
          }
        }
      } else if (isIn && renewedOn && renewedOn !== subscriptionEndsOn(old_chat_member)) {
        // Renovação: continua no canal, só a data de expiração andou.
        await upsertSubscription({
          telegramUserId,
          courseId: course.id,
          renewsAt: renewedOn,
          channelDeepLink: channelDeepLink(chat.id),
        });
        console.log(`[chat_member] renovada: user=${telegramUserId} course=${course.id} até ${renewedOn}`);
      }
    } catch (err) {
      console.error("[chat_member] falha ao sincronizar assinatura:", err);
    }
  });
}