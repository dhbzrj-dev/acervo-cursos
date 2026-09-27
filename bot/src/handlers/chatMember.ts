import type { Bot } from "grammy";
import { deactivateSubscription, upsertSubscription } from "../services/backendClient.js";
import { findCourseByChannelId, findCourseByInviteLink } from "../services/coursesCache.js";

const ACTIVE_STATUSES = new Set(["member", "administrator", "creator"]);
const INACTIVE_STATUSES = new Set(["left", "kicked", "restricted"]);

function channelDeepLink(chatId: number): string {
  const raw = String(chatId).replace(/^-100/, "").replace(/^-/, "");
  return `https://t.me/c/${raw}/1`;
}

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}

function escapeMd(text: string): string {
  return String(text).replace(/[_*[\]()~`>#+\-=|{}.!]/g, "\\$&");
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

      const courseName = escapeMd((course as { name?: string }).name || course.id);

      const becameActive =
        ACTIVE_STATUSES.has(new_chat_member.status) &&
        !ACTIVE_STATUSES.has(old_chat_member.status);
      const becameInactive =
        INACTIVE_STATUSES.has(new_chat_member.status) &&
        ACTIVE_STATUSES.has(old_chat_member.status);

      if (becameActive) {
        const untilDate =
          "until_date" in new_chat_member && new_chat_member.until_date
            ? new_chat_member.until_date
            : Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;

        await upsertSubscription({
          telegramUserId,
          courseId: course.id,
          renewsAt: toIsoDate(untilDate),
          channelDeepLink: channelDeepLink(chat.id),
        });

        const untilLabel = toIsoDate(untilDate).split("-").reverse().join("/");
        try {
          await ctx.api.sendMessage(
            telegramUserId,
            [
              "✅ *Assinatura confirmada*",
              "",
              `Você entrou em *${courseName}*.`,
              `Acesso até *${untilLabel}*.`,
              "",
              "Abra o canal pelo Mini App em *Meus cursos* se precisar do link de novo.",
            ].join("\n"),
            { parse_mode: "Markdown" }
          );
        } catch (notifyErr) {
          console.warn(`[chat_member] não avisou user=${telegramUserId}:`, notifyErr);
        }

        console.log(`[chat_member] ativada: user=${telegramUserId} course=${course.id}`);
      } else if (becameInactive) {
        await deactivateSubscription({ telegramUserId, courseId: course.id });

        try {
          await ctx.api.sendMessage(
            telegramUserId,
            [
              "⚠️ *Acesso encerrado*",
              "",
              `Você saiu de *${courseName}* ou a assinatura expirou.`,
              "Para voltar, abra o catálogo e toque em *Assinar*.",
            ].join("\n"),
            { parse_mode: "Markdown" }
          );
        } catch (notifyErr) {
          console.warn(`[chat_member] não avisou saída user=${telegramUserId}:`, notifyErr);
        }
      }
    } catch (err) {
      console.error("[chat_member] falha ao sincronizar assinatura:", err);
    }
  });
}