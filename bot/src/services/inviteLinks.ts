import { Bot } from "grammy";
import { env } from "../config/env.js";

/**
 * Cria um link de convite de ASSINATURA para um canal (Telegram Stars).
 *
 * Usa o método `createChatSubscriptionInviteLink` da Bot API — diferente do
 * `createChatInviteLink` "normal", esse endpoint é o que faz o Telegram
 * cobrar `subscription_price` Stars a cada `subscription_period` segundos
 * automaticamente, sem o bot precisar processar pagamento nenhum.
 *
 * Documentação: https://core.telegram.org/bots/api#createchatsubscriptioninvitelink
 *
 * `subscription_period` atualmente só aceita 2592000 (30 dias) — é uma
 * constante da própria API, não um parâmetro livre.
 */
const SUBSCRIPTION_PERIOD_SECONDS = 2_592_000; // 30 dias — único valor aceito pela API hoje

export async function createCourseInviteLink(params: {
  channelId: string | number;
  priceStars: number;
  name: string;
}): Promise<{ inviteLink: string }> {
  const bot = new Bot(env.botToken);

  const link = await bot.api.createChatSubscriptionInviteLink(
    params.channelId,
    SUBSCRIPTION_PERIOD_SECONDS,
    params.priceStars,
    { name: params.name.slice(0, 32) }
  );

  return { inviteLink: link.invite_link };
}
