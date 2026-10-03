/**
 * Escapa texto dinâmico (ex: nome do curso) para mensagens enviadas com
 * `parse_mode: "HTML"`. No modo HTML do Telegram só `&`, `<` e `>` precisam
 * de escape — bem mais simples e seguro que o Markdown.
 */
export function escapeHtml(text: string): string {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
