import { useNavigate } from "react-router-dom";
import type { Course } from "@/types";
import { formatStars } from "@/lib/api";
import { hapticImpact, openInviteLink } from "@/lib/telegram";

interface CourseCardProps {
  course: Course;
  isSubscribed?: boolean;
  isFavorite?: boolean;
  onToggleFavorite?: (id: string) => void;
  badge?: "novo" | "top" | null;
}

export default function CourseCard({
  course,
  isSubscribed,
  isFavorite,
  onToggleFavorite,
  badge,
}: CourseCardProps) {
  const navigate = useNavigate();

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("light");
    openInviteLink(course.inviteLink);
  };

  return (
    <button
      type="button"
      onClick={() => navigate(`/curso/${course.id}`)}
      className="group flex flex-col overflow-hidden rounded-card border border-border bg-surface text-left transition-transform active:scale-[0.98]"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#1a1a1a]">
        <img
          src={course.coverUrl}
          alt={course.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        {badge && (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-black">
            {badge === "top" ? "Mais vendido" : "Novo"}
          </span>
        )}
        {onToggleFavorite && (
          <span
            role="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(course.id);
            }}
            className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-sm"
          >
            {isFavorite ? "♥" : "♡"}
          </span>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex-1">
          <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-ink">
            {course.name}
          </h3>
          <p className="mt-1 text-[13px] font-medium text-ink/90">
            {formatStars(course.priceStars)} ★{" "}
            <span className="font-normal text-muted">/ mês</span>
          </p>
        </div>

        <button
          type="button"
          onClick={handleCtaClick}
          className="w-full rounded-btn bg-accent py-2.5 text-[13px] font-semibold text-accent-ink transition-opacity active:opacity-80"
        >
          {isSubscribed ? "Abrir canal" : "Assinar"}
        </button>
      </div>
    </button>
  );
}