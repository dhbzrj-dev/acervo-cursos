import WebApp from "@twa-dev/sdk";

/**
 * Wrapper fino em torno do @twa-dev/sdk.
 *
 * Mantemos toda a interação direta com `window.Telegram.WebApp` isolada
 * aqui, para que o resto do app não precise checar `typeof window !==
 * "undefined"` ou lidar com o caso de estar rodando fora do Telegram
 * (ex: durante o desenvolvimento local no navegador).
 */

export const isInsideTelegram = (): boolean => {
  return Boolean(window.Telegram?.WebApp?.initData);
};

/**
 * Deve ser chamado uma única vez, no bootstrap do app.
 * - `ready()` avisa o Telegram que a UI já pode ser exibida.
 * - `expand()` abre o Mini App em tela cheia (evita o modo "meia altura").
 * - `setHeaderColor`/`setBackgroundColor` alinham o chrome nativo do
 *   Telegram (barra de status, header) com o nosso tema preto.
 */
export function initTelegram() {
  if (!isInsideTelegram()) return;

  try {
    WebApp.ready();
    WebApp.expand();

    // Força o chrome nativo do Telegram a acompanhar nosso preto, mesmo que
    // o usuário tenha um tema claro no cliente Telegram.
    WebApp.setHeaderColor("#0A0A0A");
    WebApp.setBackgroundColor("#0A0A0A");

    // Habilita o gesto de "voltar" por swipe apenas quando fizer sentido;
    // por padrão deixamos o Telegram controlar o fechamento do app.
    WebApp.enableClosingConfirmation?.();
  } catch (err) {
    // SDKs de Mini App variam entre versões do cliente Telegram; falhas de
    // inicialização não devem quebrar o app fora do Telegram Desktop/Mobile.
    console.warn("[telegram] falha ao inicializar WebApp:", err);
  }
}

/** Dados básicos do usuário autenticado pelo Telegram, quando disponíveis. */
export function getTelegramUser() {
  return WebApp.initDataUnsafe?.user ?? null;
}

/**
 * String bruta de `initData`, assinada pelo Telegram. É isso — e não
 * `initDataUnsafe` — que o backend precisa receber para validar o HMAC e
 * confiar no usuário. Ver `lib/api.ts` (header `Authorization: tma <...>`).
 */
export function getInitDataRaw(): string {
  return WebApp.initData ?? "";
}

/**
 * Abre o link de convite pago do canal (Telegram Stars subscription link).
 * Usar sempre `openTelegramLink`, e não `window.open`/`<a href>`, para que
 * o próprio Telegram trate o fluxo de cobrança e entrada no canal.
 */
export function openInviteLink(inviteLink: string) {
  if (isInsideTelegram()) {
    WebApp.openTelegramLink(inviteLink);
  } else {
    // Fallback para desenvolvimento fora do Telegram.
    window.open(inviteLink, "_blank");
  }
}

/** Feedback tátil leve em ações importantes (assinar, confirmar). */
export function hapticImpact(style: "light" | "medium" | "heavy" = "medium") {
  try {
    WebApp.HapticFeedback?.impactOccurred(style);
  } catch {
    // Nem todo dispositivo/versão suporta haptics — ignora silenciosamente.
  }
}

export function hapticNotification(type: "success" | "error" | "warning") {
  try {
    WebApp.HapticFeedback?.notificationOccurred(type);
  } catch {
    /* noop */
  }
}

export { WebApp };
