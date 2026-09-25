import type { Bot } from "grammy";
import { deactivateSubscription, upsertSubscription } from "../services/backendClient.js";
import { findCourseByChannelId, findCourseByInviteLink } from "../services/coursesCache.js";

/**
 * `chat_member` é o update que o Telegram manda quando o status de alguém
 * muda num canal onde o bot é admin — inclusive quando a assinatura paga
 * (Stars) é criada, renovada ou expira.
 *
 * Referência dos campos usados aqui:
 * https://core.telegram.org/bots/api#chatmemberupdated
 * https://core.telegram.org/bots/api#chatmembermember (campo `until_date`,
 * presente quando o membro entrou via link de assinatura)
 *
 * Importante: como esse é um recurso relativamente novo da Bot API, vale
 * conferir a documentação oficial ao subir para produção — o Telegram já
 * mudou detalhes desse fluxo antes (ex: quais status exatos ocorrem quando
 * uma cobrança falha vs. quando o usuário cancela manualmente).
 */

const ACTIVE_STATUSES = new Set(["member", "administrator", "creator"]);
const INACTIVE_STATUSES = new Set(["left", "kicked", "restricted"]);

/** Remove o prefixo -100 do id do canal para montar o link t.me/c/<id>/1. */
function channelDeepLink(chatId: number): string {
  const raw = String(chatId).replace(/^-100/, "").replace(/^-/, "");
  return `https://t.me/c/${raw}/1`;
}

function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10); // YYYY-MM-DD
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

      if (!course) {
        // chat_member de um canal que não é nenhum dos nossos cursos —
        // ignora silenciosamente (o bot pode estar em outros grupos/canais).
        return;
      }

      const becameActive =
        ACTIVE_STATUSES.has(new_chat_member.status) &&
        !ACTIVE_STATUSES.has(old_chat_member.status);
      const becameInactive =
        INACTIVE_STATUSES.has(new_chat_member.status) &&
        ACTIVE_STATUSES.has(old_chat_member.status);

      if (becameActive) {
        // `until_date` só existe em ChatMemberMember, quando o ingresso foi
        // via link de assinatura paga; fora desse fluxo, cai no fallback de
        // 30 dias a partir de agora.
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

        console.log(
          `[chat_member] assinatura ativada: user=${telegramUserId} course=${course.id}`
        );
      } else if (becameInactive) {
        await deactivateSubscription({ telegramUserId, courseId: course.id });
      }
    } catch (err) {
      console.error("[chat_member] falha ao sincronizar assinatura:", err);
    }
  });
}
