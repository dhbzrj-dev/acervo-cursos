interface EmptyStateProps {
  emoji: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Estado vazio elegante — usado em "Meus cursos" e na busca sem resultado. */
export default function EmptyState({
  emoji,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 px-8 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-3xl">
        {emoji}
      </div>
      <h3 className="text-[17px] font-semibold text-ink">{title}</h3>
      <p className="max-w-[26ch] text-[14px] leading-relaxed text-muted">
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-3 rounded-btn bg-accent px-5 py-2.5 text-[13px] font-semibold text-accent-ink active:opacity-80"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
