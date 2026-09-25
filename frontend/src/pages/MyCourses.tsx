import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, fetchMySubscriptions, formatRenewalDate } from "@/lib/api";
import type { Course, UserSubscription } from "@/types";
import EmptyState from "@/components/EmptyState";
import { hapticImpact, openInviteLink } from "@/lib/telegram";
import { useTelegramBackButton } from "@/hooks/useTelegram";

interface ActiveCourse {
  course: Course;
  subscription: UserSubscription;
}

export default function MyCourses() {
  useTelegramBackButton(false);
  const navigate = useNavigate();

  const [items, setItems] = useState<ActiveCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [courses, subs] = await Promise.all([fetchCourses(), fetchMySubscriptions()]);
      if (cancelled) return;

      const merged = subs
        .map((sub) => {
          const course = courses.find((c) => c.id === sub.courseId);
          return course ? { course, subscription: sub } : null;
        })
        .filter((x): x is ActiveCourse => x !== null);

      setItems(merged);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur pt-[max(1rem,var(--tg-safe-top))] px-4 pb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Meus cursos</h1>
      </header>

      <div className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-24 w-full rounded-card" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            emoji="🎓"
            title="Você ainda não tem cursos"
            description="Assine um curso do acervo para acompanhar suas assinaturas ativas aqui."
            actionLabel="Explorar cursos"
            onAction={() => navigate("/")}
          />
        ) : (
          <div className="flex flex-col gap-3">
            {items.map(({ course, subscription }) => (
              <div
                key={course.id}
                className="flex items-center gap-3 rounded-card border border-border bg-surface p-3"
              >
                <img
                  src={course.coverUrl}
                  alt={course.name}
                  className="h-16 w-16 shrink-0 rounded-[10px] object-cover"
                />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-[15px] font-semibold text-ink">
                    {course.name}
                  </h3>
                  <p className="mt-0.5 text-[12.5px] text-muted">
                    Renova em {formatRenewalDate(subscription.renewsAt)}
                  </p>
                </div>
                <button
                  onClick={() => {
                    hapticImpact("light");
                    openInviteLink(subscription.channelDeepLink);
                  }}
                  className="shrink-0 rounded-btn bg-accent px-4 py-2.5 text-[13px] font-semibold text-accent-ink active:opacity-80"
                >
                  Abrir canal
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
