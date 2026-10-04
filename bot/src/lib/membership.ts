import type { ChatMember } from "grammy/types";

const ACTIVE_STATUSES = new Set(["member", "administrator", "creator"]);

/**
 * Se o usuário está dentro do canal. `restricted` (só existe em supergrupos)
 * pode ser alguém restrito que continua no chat — por isso o `is_member`.
 */
export function isInChat(member: ChatMember): boolean {
  if (member.status === "restricted") return member.is_member;
  return ACTIVE_STATUSES.has(member.status);
}

/** Data (YYYY-MM-DD) em que a assinatura paga expira, se o Telegram informar. */
export function subscriptionEndsOn(member: ChatMember): string | null {
  if (member.status !== "member" || !member.until_date) return null;
  return toIsoDate(member.until_date);
}

export function toIsoDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toISOString().slice(0, 10);
}
