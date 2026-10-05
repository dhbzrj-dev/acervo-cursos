import { getBotUserStats, upsertBotUser } from "../repositories/botUsers.repo.js";
import { adminTelegramIds, escapeHtml, sendBotMessage } from "./notifyNewCourse.js";

/**
 * Registra quem pode receber mensagens do bot e, na primeira vez, avisa os
 * admins (CHAT_ADMIN_IDS) com o nome e os totais. Falhas no aviso nunca
 * atrapalham o registro.
 */
export async function registerBotUserAndAlert(
  user: { telegramUserId: number; firstName?: string; username?: string },
  via: "start" | "app",
  log: { warn: (obj: unknown, msg?: string) => void }
): Promise<void> {
  const { isNew } = await upsertBotUser(user);
  if (!isNew) return;

  const admins = adminTelegramIds().filter((id) => id !== user.telegramUserId);
  if (admins.length === 0) return;

  try {
    const stats = await getBotUserStats();
    const name = escapeHtml(user.firstName || "Sem nome");
    const handle = user.username ? ` (@${escapeHtml(user.username)})` : "";
    const text = [
      `👤 <b>Novo usuário no bot</b>`,
      `${name}${handle} · ${via === "start" ? "deu /start" : "abriu o app"}`,
      "",
      `Hoje: <b>${stats.today}</b> · Total: <b>${stats.total}</b>`,
    ].join("\n");
    for (const adminId of admins) {
      const result = await sendBotMessage(adminId, { text, photo: null });
      if (!result.ok) log.warn({ adminId, error: result.description }, "Aviso de usuário novo não enviado");
    }
  } catch (err) {
    log.warn({ err }, "Falha ao avisar admins sobre usuário novo");
  }
}
