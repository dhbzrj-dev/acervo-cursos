import { useNavigate } from "react-router-dom";
import type { Course } from "@/types";
import { formatStars } from "@/lib/api";
import { hapticImpact, openInviteLink } from "@/lib/telegram";

interface CourseCardProps {
  course: Course;
  isSubscribed?: boolean;
}

/**
 * Card de curso usado no grid da Home. Um único CTA ("Assinar" ou "Abrir"),
 * preço sempre em destaque — segue o princípio de retenção do briefing.
 */
export default function CourseCard({ course, isSubscribed }: CourseCardProps) {
  const navigate = useNavigate();

  const handleCtaClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    hapticImpact("light");
    if (isSubscribed) {
      openInviteLink(course.inviteLink);
    } else {
      openInviteLink(course.inviteLink);
    }
  };

  return (
    <button
      onClick={() => navigate(`/curso/${course.id}`)}
      className="group flex flex-col text-left rounded-card bg-surface border border-border overflow-hidden active:scale-[0.98] transition-transform"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-[#1a1a1a]">
        <img
          src={course.coverUrl}
          alt={course.name}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col gap-3 p-3.5">
        <div className="flex-1">
          <h3 className="text-[15px] font-semibold leading-snug text-ink line-clamp-2">
            {course.name}
          </h3>
          <p className="mt-1 text-[13px] font-medium text-ink/90">
            {formatStars(course.priceStars)} ★{" "}
            <span className="text-muted font-normal">/ mês</span>
          </p>
        </div>

        <button
          onClick={handleCtaClick}
          className="w-full rounded-btn bg-accent py-2.5 text-[13px] font-semibold text-accent-ink active:opacity-80 transition-opacity"
        >
          {isSubscribed ? "Abrir canal" : "Assinar"}
        </button>
      </div>
    </button>
  );
}
