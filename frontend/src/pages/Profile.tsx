import { useTelegramBackButton, useTelegramUser } from "@/hooks/useTelegram";
import { fetchMySubscriptions } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Profile() {
  useTelegramBackButton(false);
  const tgUser = useTelegramUser();
  const [activeCount, setActiveCount] = useState<number | null>(null);

  useEffect(() => {
    fetchMySubscriptions().then((subs) => setActiveCount(subs.length));
  }, []);

  const displayName = tgUser
    ? [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ")
    : "Visitante";
  const initials = displayName.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur pt-[max(1rem,var(--tg-safe-top))] px-4 pb-4">
        <h1 className="text-[22px] font-bold tracking-tight text-ink">Perfil</h1>
      </header>

      <div className="px-4">
        <div className="flex items-center gap-4 rounded-card border border-border bg-surface p-4">
          {tgUser?.photo_url ? (
            <img
              src={tgUser.photo_url}
              alt={displayName}
              className="h-14 w-14 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#1a1a1a] text-lg font-semibold text-ink">
              {initials}
            </div>
          )}
          <div>
            <p className="text-[16px] font-semibold text-ink">{displayName}</p>
            {tgUser?.username && (
              <p className="text-[13px] text-muted">@{tgUser.username}</p>
            )}
          </div>
        </div>

        <div className="mt-3 rounded-card border border-border bg-surface p-4">
          <p className="text-[13px] text-muted">Assinaturas ativas</p>
          <p className="mt-1 text-[24px] font-bold text-ink">
            {activeCount ?? "—"}
          </p>
        </div>

        <div className="mt-3 flex flex-col divide-y divide-border overflow-hidden rounded-card border border-border bg-surface">
          <ProfileLink label="Histórico de pagamentos" />
          <ProfileLink label="Suporte" />
          <ProfileLink label="Termos e privacidade" />
        </div>
      </div>
    </div>
  );
}

function ProfileLink({ label }: { label: string }) {
  return (
    <button className="flex items-center justify-between px-4 py-3.5 text-left active:bg-[#1a1a1a]">
      <span className="text-[14px] text-ink">{label}</span>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
        <path
          d="m9 6 6 6-6 6"
          stroke="#A1A1AA"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
