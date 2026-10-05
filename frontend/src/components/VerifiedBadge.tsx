import { useEffect, useRef, useState } from "react";

/**
 * Selo de verificado ao lado da marca. Ao tocar, explica o que significa
 * (selo sem explicação não gera confiança). Fecha ao tocar fora ou após 3s.
 */
export default function VerifiedBadge() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const timer = window.setTimeout(() => setOpen(false), 3000);
    document.addEventListener("pointerdown", close);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("pointerdown", close);
    };
  }, [open]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Verificado: perfil oficial do Olimpocursos"
        aria-expanded={open}
        className="flex h-6 w-6 items-center justify-center rounded-full active:scale-90 transition-transform"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="#2AABEE"
            d="M23 12l-2.44-2.79.34-3.69-3.61-.82-1.89-3.2L12 2.96 8.6 1.54 6.71 4.74l-3.61.81.34 3.68L1 12l2.44 2.79-.34 3.7 3.61.82L8.6 22.5l3.4-1.47 3.4 1.46 1.89-3.19 3.61-.82-.34-3.69L23 12z"
          />
          <path fill="#FFFFFF" d="M10.09 16.72l-3.8-3.81 1.48-1.48 2.32 2.33 5.85-5.87 1.48 1.48-7.33 7.35z" />
        </svg>
      </button>

      {open && (
        <span
          role="status"
          className="absolute left-1/2 top-full z-30 mt-2 w-max max-w-[220px] -translate-x-1/2 rounded-xl border border-border bg-surface px-3 py-2 text-[12.5px] font-normal leading-snug tracking-normal text-ink shadow-lg"
        >
          <span className="block font-semibold">Perfil oficial</span>
          <span className="text-muted">Pagamentos feitos pelo Telegram</span>
        </span>
      )}
    </span>
  );
}
