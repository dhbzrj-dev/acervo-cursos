import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchCourseById, fetchMySubscriptions, formatStars, formatRenewalDate } from "@/lib/api";
import type { Course, UserSubscription } from "@/types";
import { useTelegramBackButton } from "@/hooks/useTelegram";
import { hapticImpact, hapticNotification, openInviteLink } from "@/lib/telegram";

export default function CoursePage() {
  useTelegramBackButton(true);
  const { id } = useParams<{ id: string }>();

  const [course, setCourse] = useState<Course | null>(null);
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      const [c, subs] = await Promise.all([
        fetchCourseById(id as string),
        fetchMySubscriptions(),
      ]);
      if (cancelled) return;
      setCourse(c);
      setSubscription(subs.find((s) => s.courseId === id) ?? null);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) return <CoursePageSkeleton />;

  if (!course) {
    return (
      <div className="flex h-screen items-center justify-center px-8 text-center">
        <p className="text-[15px] text-muted">Curso não encontrado.</p>
      </div>
    );
  }

  const isSubscribed = Boolean(subscription);

  const handleCta = () => {
    hapticImpact("medium");
    setRedirecting(true);
    // O Telegram assume o fluxo de cobrança/entrada; não há callback de
    // sucesso síncrono aqui — a confirmação chega via bot (chat_join_request
    // ou successful_payment) e atualiza `user_subscriptions` no backend.
    openInviteLink(isSubscribed ? subscription!.channelDeepLink : course.inviteLink);
    hapticNotification("success");
    window.setTimeout(() => setRedirecting(false), 1200);
  };

  return (
    <div className="pb-32">
      {/* Capa grande */}
      <div className="aspect-[16/10] w-full bg-[#1a1a1a]">
        <img
          src={course.coverUrl}
          alt={course.name}
          className="h-full w-full object-cover"
        />
      </div>

      <div className="px-4 pt-5">
        <h1 className="text-[24px] font-bold leading-tight text-ink">
          {course.name}
        </h1>

        {/* Preço em destaque */}
        <p className="mt-2 text-[26px] font-extrabold text-ink">
          {formatStars(course.priceStars)} ★
          <span className="ml-1.5 text-[15px] font-medium text-muted">/ mês</span>
        </p>

        {isSubscribed && subscription && (
          <p className="mt-1 text-[13px] font-medium text-muted">
            Assinatura ativa · renova em {formatRenewalDate(subscription.renewsAt)}
          </p>
        )}

        {typeof course.studentsCount === "number" && (
          <p className="mt-1 text-[13px] text-muted">
            {new Intl.NumberFormat("pt-BR").format(course.studentsCount)} alunos
          </p>
        )}

        {/* Descrição curta */}
        <p className="mt-4 text-[15px] leading-relaxed text-ink/90">
          {course.description}
        </p>

        {/* Benefícios */}
        <div className="mt-6">
          <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
            O que está incluído
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {course.benefits.map((benefit) => (
              <li key={benefit} className="flex items-start gap-3">
                <CheckIcon />
                <span className="text-[14px] leading-snug text-ink/90">
                  {benefit}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Botão sticky */}
      <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-border bg-bg/95 backdrop-blur px-4 pt-3 pb-[max(0.75rem,var(--tg-safe-bottom))]">
        <button
          onClick={handleCta}
          disabled={redirecting}
          className="w-full rounded-btn bg-accent py-4 text-[16px] font-bold text-accent-ink active:opacity-80 disabled:opacity-60 transition-opacity"
        >
          {isSubscribed
            ? "Abrir canal"
            : redirecting
            ? "Abrindo Telegram…"
            : `⭐ Assinar por ${formatStars(course.priceStars)} Stars/mês`}
        </button>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
      <circle cx="12" cy="12" r="10" stroke="#A1A1AA" strokeWidth="1.5" />
      <path
        d="m8 12.5 2.5 2.5L16 9.5"
        stroke="#FFFFFF"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CoursePageSkeleton() {
  return (
    <div className="pb-32">
      <div className="aspect-[16/10] w-full skeleton" />
      <div className="px-4 pt-5 space-y-3">
        <div className="skeleton h-6 w-3/4 rounded" />
        <div className="skeleton h-8 w-1/2 rounded" />
        <div className="skeleton h-4 w-1/3 rounded" />
        <div className="skeleton h-24 w-full rounded mt-2" />
      </div>
    </div>
  );
}
