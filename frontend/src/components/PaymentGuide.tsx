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
    {
      title: "O Telegram abre a tela de assinatura",
      text: "Você sai do app por um instante e vê a página do canal do curso.",
    },
    {
      title: `Confirme “Assinar por ${price}/mês”`,
      text: "Não tem Stars? O próprio Telegram oferece a compra ali mesmo, antes de confirmar.",
    },
    {
      title: "Pronto, acesso liberado",
      text: "Você entra no canal, recebe a confirmação do bot e o curso aparece em Meus cursos.",
    },
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
          {price} por mês, pagos em Telegram Stars direto pelo Telegram.
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

/**
 * Pix no Brasil: o Pix compra as Stars (compra avulsa na loja do celular);
 * a mensalidade do curso é descontada do saldo de Stars.
 */
function PixBox() {
  return (
    <div className="mt-4 rounded-card border border-[#32BCAD]/40 bg-[#32BCAD]/10 p-4">
      <p className="flex items-center gap-2 text-[14px] font-semibold text-ink">
        <span className="rounded-md bg-[#32BCAD] px-1.5 py-0.5 text-[11px] font-bold tracking-wide text-black">PIX</span>
        Dá para pagar com Pix
      </p>
      <ul className="mt-3 flex flex-col gap-2.5 text-[13px] leading-snug text-ink/85">
        <li>
          <b className="text-ink">Android:</b> ao comprar as Stars, escolha <b className="text-ink">Pix</b> na tela do
          Google Play. Pague o QR Code ou o código no app do seu banco — as Stars caem em até 10 minutos.
        </li>
        <li>
          <b className="text-ink">iPhone:</b> coloque saldo na sua Conta Apple com um cartão-presente comprado via Pix
          (no app do seu banco ou em lojas) e use esse saldo para comprar as Stars.
        </li>
      </ul>
      <p className="mt-3 rounded-lg bg-black/30 px-3 py-2 text-[12.5px] leading-snug text-muted">
        ⚠️ O Pix compra as Stars; a mensalidade sai do seu saldo de Stars. Antes de cada renovação, deixe saldo
        suficiente — o bot avisa 3 dias antes.
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
  {
    q: "O que são Telegram Stars?",
    a: "É a moeda digital do próprio Telegram, usada para pagar dentro do app. A cobrança do curso acontece toda pelo Telegram — você não informa cartão para nós.",
  },
  {
    q: "Posso pagar com Pix?",
    a: "Sim, comprando as Stars com Pix. No Android, ao comprar Stars escolha “Pix” na tela do Google Play e pague o QR Code ou o código no app do seu banco; as Stars caem em até 10 minutos. No iPhone, coloque saldo na Conta Apple com um cartão-presente comprado via Pix e use esse saldo para comprar as Stars.",
  },
  {
    q: "Como compro Stars?",
    a: "Na hora de assinar, se faltar saldo, o Telegram oferece a compra na mesma tela. Você também pode comprar antes em Configurações → Minhas Stars, no app do Telegram. O pagamento é feito pela loja do seu celular (Google Play ou App Store), com cartão, Pix ou saldo da loja.",
  },
  {
    q: "Quando sou cobrado?",
    a: "No momento em que entra no canal e, depois, automaticamente a cada 30 dias, pelo mesmo valor, enquanto continuar no canal. A cobrança sai do seu saldo de Stars: se você compra Stars com Pix, deixe saldo suficiente antes de cada renovação — o bot avisa 3 dias antes.",
  },
  {
    q: "Como cancelo?",
    a: "Basta sair do canal do curso antes da data de renovação. Não há multa: o acesso termina e não há novas cobranças. O bot avisa 3 dias antes de cada renovação.",
  },
  {
    q: "Paguei, mas o curso não apareceu em Meus cursos",
    a: "Pode levar alguns segundos. Feche e abra o app de novo. Se continuar sem aparecer, envie /paysupport ao bot com seu @usuário, o curso e a data.",
  },
  {
    q: "Posso pedir reembolso?",
    a: "Fale com o suporte pelo /paysupport no bot ou em @Olimpocursosreal informando o curso e a data do pagamento.",
  },
  {
    q: "Já assino. Vou pagar de novo?",
    a: "Não. Enquanto a assinatura estiver ativa, o botão do curso vira “Abrir canal” e leva direto às aulas.",
  },
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
