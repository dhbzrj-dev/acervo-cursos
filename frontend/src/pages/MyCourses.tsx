import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchCourses, fetchMySubscriptions, formatRenewalDate } from "@/lib/api";
import type { Course, UserSubscription } from "@/types";
import EmptyState from "@/components/EmptyState";
import { hapticImpact, openInviteLink } from "@/lib/telegram";
import { useTelegramBackButton } from "@/hooks/useTelegram";

interface Item {
  course: Course;
  subscription: UserSubscription;
}

export default function MyCourses() {
  useTelegramBackButton(false);
  const navigate = useNavigate();

  const [active, setActive] = useState<Item[]>([]);
  const [ended, setEnded] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(false);
      const [courses, subs] = await Promise.all([fetchCourses(), fetchMySubscriptions()]);
      if (cancelled) return;

      const merged = subs
        .map((sub) => {
          const course = courses.find((c) => c.id === sub.courseId);
          return course ? { course, subscription: sub } : null;
        })
        .filter((x): x is Item => x !== null);

      setActive(merged.filter((item) => item.subscription.active));
      setEnded(merged.filter((item) => !item.subscription.active));
      setLoading(false);
    }

    load().catch(() => {
      if (cancelled) return;
      setLoadError(true);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  async function copyLink(id: string, link: string) {
    hapticImpact("light");
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    } catch {
      alert(link);
    }
  }

  function Row({ item, expired }: { item: Item; expired?: boolean }) {
    const { course, subscription } = item;
    return (
      <div className="rounded-card border border-border bg-surface p-3">
        <div className="flex items-center gap-3">
          <img
            src={course.coverUrl}
            alt={course.name}
            className="h-16 w-16 shrink-0 rounded-[10px] object-cover"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold text-ink">{course.name}</h3>
            <p className="mt-0.5 text-[12.5px] text-muted">
              {expired
                ? "Acesso encerrado: você saiu do canal ou a assinatura não renovou."
                : `Renova em ${formatRenewalDate(subscription.renewsAt)}`}
            </p>
            {!expired && (
              <p className="mt-1 text-[12px] text-muted">
                O Telegram cobra de novo sozinho. Para cancelar, saia do canal antes dessa data.
              </p>
            )}
            <p className="mt-1 text-[12px] text-muted">
              Recibo: {course.priceStars} ★
              {expired ? " · encerrado" : " · pago"}
              {" · "}
              {formatRenewalDate(subscription.renewsAt)}
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          {!expired && (
            <button
              type="button"
              onClick={() => {
                hapticImpact("light");
                openInviteLink(subscription.channelDeepLink);
              }}
              className="flex-1 rounded-btn bg-accent py-2.5 text-[13px] font-semibold text-accent-ink"
            >
              Entrar
            </button>
          )}
          <button
            type="button"
            onClick={() => copyLink(course.id, subscription.channelDeepLink)}
            className="flex-1 rounded-btn bg-white/10 py-2.5 text-[13px] font-semibold"
          >
            {copiedId === course.id ? "Copiado" : "Copiar link"}
          </button>
          {expired && (
            <button
              type="button"
              onClick={() => navigate(`/curso/${course.id}`)}
              className="flex-1 rounded-btn bg-accent py-2.5 text-[13px] font-semibold text-accent-ink"
            >
              Assinar de novo
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 px-4 pb-4 pt-[max(1rem,var(--tg-safe-top))] backdrop-blur">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Meus cursos</h1>
      </header>

      <div className="px-4">
        {loading ? (
          <div className="flex flex-col gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="skeleton h-24 w-full rounded-card" />
            ))}
          </div>
        ) : loadError ? (
          <EmptyState
            emoji="⚠️"
            title="Não foi possível carregar"
            description="Verifique sua conexão e tente de novo."
            actionLabel="Tentar de novo"
            onAction={() => setReloadKey((k) => k + 1)}
          />
        ) : active.length === 0 && ended.length === 0 ? (
          <EmptyState
            emoji="🎓"
            title="Você ainda não tem cursos"
            description="Assine um curso do Olimpocursos para acompanhar suas assinaturas ativas aqui."
            actionLabel="Explorar cursos"
            onAction={() => navigate("/")}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {active.length > 0 && (
              <section className="flex flex-col gap-3">
                {active.map((item) => (
                  <Row key={item.course.id} item={item} />
                ))}
              </section>
            )}
            {ended.length > 0 && (
              <section className="flex flex-col gap-3">
                <h2 className="text-sm font-semibold text-muted">Encerrados</h2>
                {ended.map((item) => (
                  <Row key={item.course.id} item={item} expired />
                ))}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}