import { useEffect, useState } from "react";
import { formatStars } from "@/lib/api";

const SEEN_KEY = "olimpo_payment_guide_seen";

/** Se o aluno já pediu para não ver o passo a passo antes de pagar. */
export function hasSeenPaymentGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function rememberPaymentGuide(seen: boolean) {
  try {
    if (seen) localStorage.setItem(SEEN_KEY, "1");
    else localStorage.removeItem(SEEN_KEY);
  } catch {
    /* sem storage: o guia só volta a aparecer, nada quebra */
  }
}

interface PaymentSheetProps {
  open: boolean;
  priceStars: number;
  /** "checkout" mostra o botão de continuar; "info" só explica. */
  mode: "checkout" | "info";
  onContinue: () => void;
  onClose: () => void;
}

/**
 * Bottom sheet com o passo a passo do pagamento, mostrado ao tocar em
 * "Assinar" — o aluno sabe o que vai acontecer antes de sair do app.
 */
export function PaymentSheet({ open, priceStars, mode, onContinue, onClose }: PaymentSheetProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const price = `${formatStars(priceStars)} ⭐`;
  const steps = [
    { title: "O Telegram abre a assinatura", text: "Você vai para a página do canal." },
    { title: `Confirme ${price}/mês`, text: "Sem Stars? Compre na hora, com Pix ou cartão." },
    { title: "Acesso liberado", text: "O curso aparece em Meus cursos." },
  ];

  function handleContinue() {
    rememberPaymentGuide(dontShowAgain);
    onContinue();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end bg-black/60" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-sheet-title"
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl border-t border-border bg-surface px-5 pt-3"
        style={{ paddingBottom: "calc(1.25rem + var(--tg-safe-bottom, 0px))" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15" />

        <h2 id="payment-sheet-title" className="text-[19px] font-bold text-ink">
          Como funciona o pagamento
        </h2>
        <p className="mt-1 text-[13px] text-muted">
          {price} por mês, em Telegram Stars.
        </p>

        <ol className="mt-5 flex flex-col">
          {steps.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-bg">
                  {index + 1}
                </span>
                {index < steps.length - 1 && <span className="my-1 w-px flex-1 bg-border" />}
              </div>
              <div className={index < steps.length - 1 ? "pb-4" : ""}>
                <p className="text-[14px] font-semibold leading-7 text-ink">{step.title}</p>
                <p className="text-[13px] leading-snug text-muted">{step.text}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="mt-5 grid grid-cols-3 gap-2">
          <Fact icon="🔁" text="Renova a cada 30 dias" />
          <Fact icon="✋" text="Cancele saindo do canal" />
          <Fact icon="🔔" text="Aviso 3 dias antes" />
        </div>

        <PixBox />

        {mode === "checkout" ? (
          <>
            <label className="mt-5 flex items-center gap-2 text-[13px] text-muted">
              <input
                type="checkbox"
                checked={dontShowAgain}
                onChange={(event) => setDontShowAgain(event.target.checked)}
                className="h-4 w-4 accent-white"
              />
              Já entendi, não mostrar de novo
            </label>
            <button
              type="button"
              onClick={handleContinue}
              className="mt-3 w-full rounded-btn bg-accent py-4 text-[16px] font-bold text-accent-ink active:opacity-80"
            >
              Continuar para o pagamento
            </button>
            <button type="button" onClick={onClose} className="mt-1 w-full py-3 text-[14px] text-muted">
              Agora não
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-btn bg-white/10 py-3.5 text-[15px] font-semibold text-ink"
          >
            Entendi
          </button>
        )}
      </div>
    </div>
  );
}

/** Pix compra as Stars; a mensalidade sai do saldo de Stars. */
function PixBox() {
  return (
    <div className="mt-4 flex items-start gap-3 rounded-card border border-[#32BCAD]/40 bg-[#32BCAD]/10 p-4">
      <span className="mt-0.5 shrink-0 rounded-md bg-[#32BCAD] px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-black">
        PIX
      </span>
      <p className="text-[13px] leading-snug text-ink/85">
        <b className="text-ink">Aceita Pix.</b> Ao comprar as Stars, escolha Pix. Deixe saldo para a renovação.
      </p>
    </div>
  );
}

function Fact({ icon, text }: { icon: string; text: string }) {
  return (
    <div className="flex flex-col items-center gap-1 rounded-xl border border-border bg-bg px-2 py-3 text-center">
      <span className="text-[18px]" aria-hidden="true">
        {icon}
      </span>
      <span className="text-[11.5px] leading-tight text-muted">{text}</span>
    </div>
  );
}

const FAQ: { q: string; a: string }[] = [
  { q: "O que são Stars?", a: "A moeda do Telegram. O pagamento é todo feito pelo Telegram." },
  { q: "Posso pagar com Pix?", a: "Sim. Ao comprar as Stars, escolha Pix." },
  { q: "Como compro Stars?", a: "Na hora de assinar, o Telegram oferece a compra." },
  { q: "Quando sou cobrado?", a: "Ao entrar e a cada 30 dias, do seu saldo de Stars." },
  { q: "Como cancelo?", a: "Saia do canal antes da renovação. Sem multa." },
  { q: "Paguei e o curso não apareceu", a: "Reabra o app. Se continuar, envie /paysupport ao bot." },
  { q: "Reembolso?", a: "Envie /paysupport ao bot." },
];

/** Perguntas frequentes sobre pagamento, em acordeão nativo (<details>). */
export function PaymentFaq({ onShowSteps }: { onShowSteps: () => void }) {
  return (
    <section className="mt-8">
      <div className="flex items-baseline justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Dúvidas sobre pagamento
        </h2>
        <button type="button" onClick={onShowSteps} className="text-[13px] font-semibold text-ink">
          Ver passo a passo
        </button>
      </div>
      <div className="mt-3 divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
        {FAQ.map((item) => (
          <details key={item.q} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 text-[14px] text-ink [&::-webkit-details-marker]:hidden">
              {item.q}
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
                className="shrink-0 transition-transform group-open:rotate-90"
              >
                <path d="m9 6 6 6-6 6" stroke="#A1A1AA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </summary>
            <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
