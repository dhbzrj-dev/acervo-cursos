import { listNotifiableUserIds, markBotUserBlocked } from "../repositories/botUsers.repo.js";

/**
 * Mensagens do bot para muitos usuários: aviso de curso novo e mensagens
 * livres do painel. Roda em segundo plano (a rota responde na hora) e envia
 * ~20 mensagens por segundo, abaixo do limite do Telegram (~30/s). Quem
 * bloqueou o bot é marcado e sai das próximas listas.
 */

const DELAY_MS = 50;
const MINI_APP_URL = (process.env.MINI_APP_URL || "https://acervo-cursos.vercel.app").replace(/\/+$/, "");

export interface BotMessage {
  text: string;
  photo: string | null;
  reply_markup?: { inline_keyboard: Record<string, unknown>[][] };
}

export interface NewCourseInfo {
  id: string;
  name: string;
  description: string;
  priceStars: number;
  coverUrl: string;
  categoryName: string;
  categoryEmoji: string;
}

type Log = { info: (obj: unknown, msg?: string) => void; warn: (obj: unknown, msg?: string) => void };

let running = false;

export function isBroadcastRunning(): boolean {
  return running;
}

export function escapeHtml(text: string): string {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function excerpt(text: string, max = 180): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

const STOP_BUTTON = { text: "🔕 Parar avisos", callback_data: "notify_off" };

/** IDs do Telegram dos admins (mesma variável da moderação da Sala). */
export function adminTelegramIds(): number[] {
  return String(process.env.CHAT_ADMIN_IDS || "")
    .split(/[,\s]+/)
    .map((id) => Number(id.trim()))
    .filter((id) => Number.isFinite(id) && id > 0);
}

export function buildNewCourseMessage(course: NewCourseInfo): BotMessage {
  const price = new Intl.NumberFormat("pt-BR").format(course.priceStars);
  const lines = [
    `🆕 <b>Novo curso em ${escapeHtml(course.categoryEmoji)} ${escapeHtml(course.categoryName)}</b>`,
    "",
    `<b>${escapeHtml(course.name)}</b>`,
  ];
  const summary = excerpt(course.description);
  if (summary) lines.push(escapeHtml(summary));
  lines.push("", `⭐ ${price} Stars/mês`);

  return {
    text: lines.join("\n"),
    reply_markup: {
      inline_keyboard: [
        [{ text: "📚 Ver curso", web_app: { url: `${MINI_APP_URL}/#/curso/${encodeURIComponent(course.id)}` } }],
        [STOP_BUTTON],
      ],
    },
    photo: /^https?:\/\//.test(course.coverUrl) ? course.coverUrl : null,
  };
}

/** Mensagem livre do painel: texto puro (escapado) + botão opcional do app. */
export function buildCustomMessage(text: string, withAppButton: boolean): BotMessage {
  const rows: Record<string, unknown>[][] = [];
  if (withAppButton) rows.push([{ text: "📚 Abrir Olimpocursos", web_app: { url: MINI_APP_URL } }]);
  rows.push([STOP_BUTTON]);
  return { text: escapeHtml(text.trim()), photo: null, reply_markup: { inline_keyboard: rows } };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

type TelegramResult = {
  ok: boolean;
  error_code?: number;
  description?: string;
  parameters?: { retry_after?: number };
};

export async function sendBotMessage(chatId: number, message: BotMessage): Promise<TelegramResult> {
  const token = process.env.BOT_TOKEN;
  const method = message.photo ? "sendPhoto" : "sendMessage";
  const body = message.photo
    ? { chat_id: chatId, photo: message.photo, caption: message.text, parse_mode: "HTML", reply_markup: message.reply_markup }
    : { chat_id: chatId, text: message.text, parse_mode: "HTML", reply_markup: message.reply_markup };

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    return (await res.json()) as TelegramResult;
  } catch (err) {
    return { ok: false, description: String(err) };
  }
}

/**
 * Envia `message` para `ids` em segundo plano. Só um envio por vez.
 * Retorna na hora com o total de destinatários.
 */
export function startBroadcast(label: string, ids: number[], message: BotMessage, log: Log): { total: number } {
  if (running) throw new Error("Já existe um envio em andamento. Aguarde terminar.");
  running = true;

  (async () => {
    let sent = 0;
    let blocked = 0;
    let failed = 0;
    try {
      for (const chatId of ids) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await sendBotMessage(chatId, message);
          if (result.ok) {
            sent++;
            break;
          }
          if (result.error_code === 429) {
            await sleep(((result.parameters?.retry_after ?? 1) + 1) * 1000);
            continue;
          }
          if (result.error_code === 403 || /chat not found/i.test(result.description || "")) {
            blocked++;
            await markBotUserBlocked(chatId).catch(() => {});
          } else {
            failed++;
            log.warn({ chatId, error: result.description }, `Falha no envio: ${label}`);
          }
          break;
        }
        await sleep(DELAY_MS);
      }
    } finally {
      running = false;
      log.info({ label, total: ids.length, sent, blocked, failed }, "Envio concluído");
    }
  })();

  return { total: ids.length };
}

export async function broadcastNewCourse(course: NewCourseInfo, log: Log): Promise<{ total: number }> {
  if (running) throw new Error("Já existe um envio em andamento. Aguarde terminar.");
  const ids = await listNotifiableUserIds();
  return startBroadcast(`curso novo ${course.id}`, ids, buildNewCourseMessage(course), log);
}
