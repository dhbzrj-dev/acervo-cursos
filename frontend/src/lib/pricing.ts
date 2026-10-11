const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/** 85790 -> "R$ 857,90" */
export function formatBRL(cents: number): string {
  return brl.format(cents / 100);
}

/** Preço do curso em Stars convertido para centavos de real (null sem taxa configurada). */
export function starsToBrlCents(stars: number, brlPer100Stars: number | null | undefined): number | null {
  if (!brlPer100Stars || !stars) return null;
  return Math.round((stars * brlPer100Stars) / 100 * 100);
}

export interface PriceView {
  /** Preço do curso original (pagamento único), se cadastrado. */
  originalCents: number | null;
  /** Nosso preço mensal em reais, se a taxa Stars -> R$ estiver configurada. */
  monthlyCents: number | null;
  /** Desconto do 1º mês sobre o original, em % inteiro (só quando faz sentido). */
  discountPercent: number | null;
  /** Economia no 1º mês em centavos. */
  savingsCents: number | null;
}

export function priceView(
  course: { priceStars: number; originalPriceCents?: number | null },
  brlPer100Stars: number | null | undefined
): PriceView {
  const originalCents = course.originalPriceCents && course.originalPriceCents > 0 ? course.originalPriceCents : null;
  const monthlyCents = starsToBrlCents(course.priceStars, brlPer100Stars);
  let discountPercent: number | null = null;
  let savingsCents: number | null = null;
  if (originalCents && monthlyCents && monthlyCents < originalCents) {
    discountPercent = Math.floor(((originalCents - monthlyCents) / originalCents) * 100);
    savingsCents = originalCents - monthlyCents;
    if (discountPercent < 5) {
      // desconto irrelevante não vira selo nem "você economiza"
      discountPercent = null;
      savingsCents = null;
    }
  }
  return { originalCents, monthlyCents, discountPercent, savingsCents };
}

/** "857,90" / "857.90" / "R$ 1.299,00" -> centavos (null se vazio ou inválido). */
export function parseBRLToCents(raw: string): number | null {
  const clean = raw.replace(/[^\d,.]/g, "");
  if (!clean) return null;
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? Math.round(value * 100) : null;
}

/** 85790 -> "857,90" (para preencher o campo do painel). */
export function centsToInput(cents: number | null | undefined): string {
  if (!cents) return "";
  return (cents / 100).toFixed(2).replace(".", ",");
}
