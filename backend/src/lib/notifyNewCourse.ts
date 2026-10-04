import { listNotifiableUserIds, markBotUserBlocked } from "../repositories/botUsers.repo.js";

/**
 * Aviso de "curso novo" para todos que aceitam receber avisos do bot.
 *
 * Roda em segundo plano (a rota do admin responde na hora) e envia ~20
 * mensagens por segundo, abaixo do limite do Telegram (~30/s). Quem
 * bloqueou o bot é marcado e sai das próximas listas.
 */

const DELAY_MS = 50;
const MINI_APP_URL = (process.env.MINI_APP_URL || "https://acervo-cursos.vercel.app").replace(/\/+$/, "");

export interface NewCourseInfo {
  id: string;
  name: string;
  description: string;
  priceStars: number;
  coverUrl: string;
  categoryName: string;
  categoryEmoji: string;
}

let running = false;

export function isBroadcastRunning(): boolean {
  return running;
}

function escapeHtml(text: string): string {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function excerpt(text: string, max = 180): string {
  const clean = String(text || "").replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

export function buildNewCourseMessage(course: NewCourseInfo) {
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
        [{ text: "🔕 Parar avisos", callback_data: "notify_off" }],
      ],
    },
    photo: /^https?:\/\//.test(course.coverUrl) ? course.coverUrl : null,
  };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendTo(chatId: number, message: ReturnType<typeof buildNewCourseMessage>) {
  const token = process.env.BOT_TOKEN;
  const method = message.photo ? "sendPhoto" : "sendMessage";
  const body = message.photo
    ? { chat_id: chatId, photo: message.photo, caption: message.text, parse_mode: "HTML", reply_markup: message.reply_markup }
    : { chat_id: chatId, text: message.text, parse_mode: "HTML", reply_markup: message.reply_markup };

  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as {
    ok: boolean;
    error_code?: number;
    description?: string;
    parameters?: { retry_after?: number };
  };
}

export async function broadcastNewCourse(
  course: NewCourseInfo,
  log: { info: (obj: unknown, msg?: string) => void; warn: (obj: unknown, msg?: string) => void }
): Promise<{ total: number }> {
  if (running) throw new Error("Já existe um envio em andamento. Aguarde terminar.");
  const ids = await listNotifiableUserIds();
  const message = buildNewCourseMessage(course);
  running = true;

  (async () => {
    let sent = 0;
    let blocked = 0;
    let failed = 0;
    try {
      for (const chatId of ids) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const result = await sendTo(chatId, message).catch((err) => ({
            ok: false,
            description: String(err),
          }) as Awaited<ReturnType<typeof sendTo>>);

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
            log.warn({ chatId, error: result.description }, "Falha ao avisar curso novo");
          }
          break;
        }
        await sleep(DELAY_MS);
      }
    } finally {
      running = false;
      log.info({ course: course.id, total: ids.length, sent, blocked, failed }, "Aviso de curso novo concluído");
    }
  })();

  return { total: ids.length };
}
