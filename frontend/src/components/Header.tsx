interface HeaderProps {
  query: string;
  onQueryChange: (value: string) => void;
}

export default function Header({ query, onQueryChange }: HeaderProps) {
  return (
    <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur pt-[max(1rem,var(--tg-safe-top))] px-4 pb-3">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">
        Acervo de Cursos
      </h1>

      <div className="mt-3 flex items-center gap-2 rounded-btn border border-border bg-surface px-3.5 py-2.5">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-muted"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m21 21-4.3-4.3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Buscar cursos"
          className="w-full bg-transparent text-[15px] text-ink placeholder:text-muted outline-none"
        />
      </div>
    </header>
  );
}
