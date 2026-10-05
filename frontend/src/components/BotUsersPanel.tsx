import { useEffect, useState } from "react";

interface Stats {
  total: number;
  today: number;
  last7Days: number;
  notifiable: number;
  blocked: number;
  running: boolean;
  admins: number;
}

type AdminFetch = (path: string, init?: RequestInit) => Promise<Response>;

/** Usuários do bot + envio de mensagem para todos (com teste antes). */
export default function BotUsersPanel({ adminFetch }: { adminFetch: AdminFetch }) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [text, setText] = useState("");
  const [withAppButton, setWithAppButton] = useState(true);
  const [sending, setSending] = useState(false);

  async function loadStats() {
    try {
      setStats((await adminFetch("/admin/bot-users/stats").then((r) => r.json())) as Stats);
    } catch {
      /* sessão expirada: adminFetch já volta ao login */
    }
  }

  useEffect(() => {
    loadStats();
  }, []);

  async function send(test: boolean) {
    if (!text.trim()) return;
    if (!test && !confirm(`Enviar esta mensagem para ${stats?.notifiable ?? 0} pessoa(s) pelo bot?`)) return;
    setSending(true);
    try {
      const res = await adminFetch("/admin/broadcast", {
        method: "POST",
        body: JSON.stringify({ text, withAppButton, test }),
      });
      const data = (await res.json().catch(() => ({}))) as { total?: number; error?: string; message?: string };
      if (!res.ok) {
        alert(data.error || data.message || "Não foi possível enviar.");
        return;
      }
      if (test) alert("Teste enviado. Confira no Telegram.");
      else {
        alert(`Enviando para ${data.total} pessoa(s).`);
        setText("");
      }
      loadStats();
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="mb-8">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Usuários do bot</h2>
        <button type="button" onClick={loadStats} className="text-sm text-muted">
          Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Total" value={stats?.total} />
        <Stat label="Hoje" value={stats?.today} />
        <Stat label="Últimos 7 dias" value={stats?.last7Days} />
        <Stat label="Recebem avisos" value={stats?.notifiable} />
      </div>
      {stats && stats.blocked > 0 && (
        <p className="mt-2 text-xs text-muted">{stats.blocked} bloquearam o bot ou desativaram a conta.</p>
      )}
      {stats && stats.admins === 0 && (
        <p className="mt-2 text-xs text-amber-300">
          ⚠ Configure CHAT_ADMIN_IDS no Railway para receber o aviso de cada usuário novo e o teste de mensagem.
        </p>
      )}

      <UserList adminFetch={adminFetch} total={stats?.total ?? 0} />

      <div className="mt-4 rounded-xl border border-white/10 p-3">
        <p className="mb-2 text-sm font-semibold">Enviar mensagem pelo bot</p>
        <textarea
          className="min-h-[110px] w-full rounded-xl bg-white/10 p-3 text-sm"
          placeholder="Ex.: Chegaram aulas novas no curso MilkAI! Abra o app para ver."
          value={text}
          maxLength={3500}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="mt-1 flex items-center justify-between text-xs text-muted">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={withAppButton}
              onChange={(e) => setWithAppButton(e.target.checked)}
              className="accent-white"
            />
            Incluir botão “📚 Abrir Olimpocursos”
          </label>
          <span>{text.length}/3500</span>
        </div>
        <p className="mt-1 text-xs text-muted">Toda mensagem leva também o botão “🔕 Parar avisos”.</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={sending || !text.trim()}
            onClick={() => send(true)}
            className="flex-1 rounded-xl bg-white/15 p-3 text-sm font-semibold disabled:opacity-40"
          >
            Enviar teste para mim
          </button>
          <button
            type="button"
            disabled={sending || !text.trim() || !stats?.notifiable || stats.running}
            onClick={() => send(false)}
            className="flex-1 rounded-xl bg-white p-3 text-sm font-semibold text-black disabled:opacity-40"
          >
            {stats?.running ? "Envio em andamento…" : `Enviar para ${stats?.notifiable ?? 0}`}
          </button>
        </div>
      </div>
    </section>
  );
}

interface BotUser {
  firstName: string | null;
  username: string | null;
  notify: boolean;
  blocked: boolean;
  createdAt: string;
}

/** Nome e @ de quem usa o bot. Só carrega quando aberta. */
function UserList({ adminFetch, total }: { adminFetch: AdminFetch; total: number }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<BotUser[] | null>(null);

  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(async () => {
      try {
        const res = await adminFetch(`/admin/bot-users?q=${encodeURIComponent(query)}&limit=200`);
        setUsers((await res.json()) as BotUser[]);
      } catch {
        /* sessão expirada */
      }
    }, 250);
    return () => window.clearTimeout(timer);
  }, [open, query]);

  const date = (iso: string) =>
    new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="mt-4 rounded-xl border border-white/10">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between p-3 text-sm font-semibold"
      >
        Ver usuários ({total})
        <span className="text-muted">{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div className="border-t border-white/10 p-3">
          <input
            className="mb-3 w-full rounded-xl bg-white/10 p-2.5 text-sm"
            placeholder="Buscar por nome ou @"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {users === null ? (
            <p className="text-sm text-muted">Carregando…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted">Ninguém encontrado.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
              {users.map((user, index) => (
                <li key={`${user.username}-${user.createdAt}-${index}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate">{user.firstName || "Sem nome"}</span>
                    {user.username ? (
                      <a
                        href={`https://t.me/${user.username}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-sky-400"
                      >
                        @{user.username}
                      </a>
                    ) : (
                      <span className="text-xs text-muted">sem @</span>
                    )}
                  </span>
                  <span className="shrink-0 text-right text-xs text-muted">
                    {date(user.createdAt)}
                    <span className="block">
                      {user.blocked ? "bloqueou o bot" : user.notify ? "🔔 avisos" : "🔕 sem avisos"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value?: number }) {
  return (
    <div className="rounded-xl bg-white/5 p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value ?? "—"}</p>
    </div>
  );
}
