import type { Category } from "@/types";

interface CategoryPillProps {
  category: Category;
  active: boolean;
  onClick: () => void;
}

export default function CategoryPill({ category, active, onClick }: CategoryPillProps) {
  return (
    <button
      onClick={onClick}
      className={[
        "shrink-0 rounded-full border px-4 py-2 text-[13px] font-medium transition-colors",
        active
          ? "bg-accent text-accent-ink border-accent"
          : "bg-surface text-muted border-border active:bg-[#1a1a1a]",
      ].join(" ")}
    >
      <span className="mr-1.5">{category.emoji}</span>
      {category.name}
    </button>
  );
}
