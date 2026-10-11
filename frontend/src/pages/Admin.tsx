import { useEffect, useState } from "react";
import CoverCropper from "@/components/CoverCropper";
import { parsePreviewUrl } from "@/lib/video";
import CourseSizePicker from "@/components/CourseSizePicker";
import BotUsersPanel from "@/components/BotUsersPanel";
import StarsRateSetting from "@/components/StarsRateSetting";
import { centsToInput, parseBRLToCents } from "@/lib/pricing";

/** IDs de canal começam com "-100"; aceita o número colado sem o "-". */
function normalizeChannelId(raw: string): string {
  const value = raw.replace(/\s+/g, "");
  return /^100\d{6,}$/.test(value) ? `-${value}` : value;
}

/** Diz na hora se o link do vídeo de amostra vai funcionar no app. */
function PreviewHint({ url }: { url: string }) {
  const source = parsePreviewUrl(url);
  if (!source) return null;
  if (source.kind === "youtube") {
    return <p className="-mt-1 text-xs text-emerald-400">✓ Vídeo do YouTube reconhecido</p>;
  }
  if (source.kind === "file") {
    return <p className="-mt-1 text-xs text-emerald-400">✓ Arquivo de vídeo reconhecido</p>;
  }
  return (
    <p className="-mt-1 text-xs text-amber-300">
      ⚠ Link não reconhecido: o vídeo não vai aparecer. Use um link do YouTube ou de um arquivo .mp4.
    </p>
  );
}

type Category = { id: string; name: string; emoji?: string; order?: number };
type Course = {
  id: string;
  name: string;
  category_id: string;
  description?: string;
  benefits?: string[];
  cover_url?: string;
  price_stars: number;
  invite_link?: string;
  channel_id?: string;
  is_active?: boolean;
  preview_url?: string;
  notified_at?: string | null;
  modules_count?: number | null;
  lessons_count?: number | null;
  duration_seconds?: number | null;
  original_price_cents?: number | null;
};

const SESSION_KEY = "admin_session";

/**
 * Erros nossos vêm em `error` com a explicação; erros do Fastify vêm com
 * `error: "Bad Request"` genérico e o motivo real em `message`.
 */
function errorText(data: { error?: string; message?: string; statusCode?: number }): string {
  if (data.statusCode && data.message) return data.message;
  return data.error || data.message || "";
}

function readSession(): string {
  try {
    // Versões antigas guardavam a própria senha em "admin_token".
    localStorage.removeItem("admin_token");
    return localStorage.getItem(SESSION_KEY) || "";
  } catch {
    return "";
  }
}

export default function Admin() {
  const api = import.meta.env.VITE_API_URL;
  const [password, setPassword] = useState("");
  const [session, setSession] = useState(readSession);
  const ok = Boolean(session);
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📁");
  const [catEditingId, setCatEditingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    category_id: "",
    description: "",
    benefits: "",
    cover_url: "",
    price_stars: 100,
    invite_link: "",
    channel_id: "",
    is_active: true,
    preview_url: "",
    modules_count: "" as number | "",
    lessons_count: "" as number | "",
    duration_seconds: "" as number | "",
    original_price_brl: "",
  });
  function logout() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch {
      /* noop */
    }
    setSession("");
  }

  /** fetch autenticado; sessão expirada ou inválida volta para a tela de login. */
  async function adminFetch(path: string, init: RequestInit = {}) {
    const headers: Record<string, string> = { Authorization: `Bearer ${session}` };
    // Só declara JSON quando há corpo: o Fastify recusa (400) JSON vazio.
    if (init.body !== undefined) headers["Content-Type"] = "application/json";
    const res = await fetch(`${api}${path}`, { ...init, headers });
    if (res.status === 401) {
      logout();
      throw new Error("Sessão expirada. Entre de novo.");
    }
    return res;
  }

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${api}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = (await res.json().catch(() => ({}))) as { token?: string };
    if (!res.ok || !data.token) {
      alert("Senha errada");
      return;
    }
    try {
      localStorage.setItem(SESSION_KEY, data.token);
    } catch {
      /* sessão vale só enquanto a aba estiver aberta */
    }
    setPassword("");
    setSession(data.token);
  }

  async function load() {
    try {
      const [cats, list] = await Promise.all([
        adminFetch("/admin/categories").then((r) => r.json()),
        adminFetch("/admin/courses").then((r) => r.json()),
      ]);
      setCategories(cats);
      setCourses(list);
    } catch {
      /* adminFetch já tratou 401 */
    }
  }

  useEffect(() => {
    if (ok) load();
  }, [ok]);

  async function saveCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!catName.trim()) return;
    const editing = categories.find((c) => c.id === catEditingId);
    const res = await adminFetch(editing ? `/admin/categories/${editing.id}` : "/admin/categories", {
      method: editing ? "PUT" : "POST",
      body: JSON.stringify({
        name: catName.trim(),
        emoji: catEmoji,
        order: editing ? editing.order ?? 0 : categories.length + 1,
      }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
      alert(errorText(data) || "Não foi possível salvar a categoria.");
      return;
    }
    cancelCategoryEdit();
    load();
  }

  function editCategory(category: Category) {
    setCatEditingId(category.id);
    setCatName(category.name);
    setCatEmoji(category.emoji || "📁");
  }

  function cancelCategoryEdit() {
    setCatEditingId(null);
    setCatName("");
    setCatEmoji("📁");
  }

  async function removeCategory(category: Category) {
    if (!confirm(`Apagar a categoria "${category.name}"?`)) return;
    const res = await adminFetch(`/admin/categories/${category.id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string };
    if (!res.ok) {
      alert(errorText(data) || "Não foi possível apagar a categoria.");
      return;
    }
    if (catEditingId === category.id) cancelCategoryEdit();
    load();
  }

  function editCourse(course: Course) {
    setEditingId(course.id);
    setForm({
      name: course.name || "",
      category_id: course.category_id || "",
      description: course.description || "",
      benefits: Array.isArray(course.benefits) ? course.benefits.join("\n") : "",
      cover_url: course.cover_url || "",
      price_stars: course.price_stars || 0,
      invite_link: course.invite_link || "",
      channel_id: course.channel_id || "",
      is_active: course.is_active !== false,
      preview_url: course.preview_url || "",
      modules_count: course.modules_count ?? "",
      lessons_count: course.lessons_count ?? "",
      duration_seconds: course.duration_seconds ?? "",
      original_price_brl: centsToInput(course.original_price_cents),
    });
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    const path = editingId ? `/admin/courses/${editingId}` : "/admin/courses";
    const res = await adminFetch(path, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify({ ...form, original_price_cents: parseBRLToCents(form.original_price_brl) }),
    });
    if (!res.ok) {
      alert("Erro ao salvar curso");
      return;
    }
    alert("Curso salvo");
    setEditingId(null);
    load();
  }

  async function generateInvite() {
    if (!form.channel_id || !form.price_stars) {
      alert("Preencha Channel ID e Stars");
      return;
    }
    const res = await adminFetch("/admin/invite-link", {
      method: "POST",
      body: JSON.stringify({
        channel_id: form.channel_id,
        price_stars: form.price_stars,
        name: form.name,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      error?: string;
      invite_link?: string;
      channel_id?: string;
    };
    if (!data.ok || !data.invite_link) {
      alert(data.error || "Falha ao gerar invite");
      return;
    }
    setForm({ ...form, invite_link: data.invite_link, channel_id: data.channel_id || form.channel_id });
    alert("Invite gerado. Clique em salvar.");
  }

  async function notifyCourse(course: Course) {
    const audience = (await adminFetch("/admin/notify/audience").then((r) => r.json())) as {
      count: number;
      running: boolean;
    };
    if (audience.running) {
      alert("Já existe um aviso sendo enviado. Aguarde alguns minutos.");
      return;
    }
    if (audience.count === 0) {
      alert("Ainda ninguém pode receber avisos. Quem der /start no bot ou abrir o app pelo bot entra na lista.");
      return;
    }
    if (
      !confirm(
        `Enviar o aviso de curso novo "${course.name}" para ${audience.count} pessoa(s) pelo bot?\n\nCada curso só pode ser avisado uma vez.`
      )
    )
      return;
    const res = await adminFetch(`/admin/courses/${course.id}/notify`, { method: "POST" });
    const data = (await res.json().catch(() => ({}))) as { total?: number; error?: string; message?: string };
    alert(
      res.ok
        ? `Enviando para ${data.total} pessoa(s). Leva cerca de ${Math.max(1, Math.ceil((data.total ?? 0) / 1200))} minuto(s).`
        : errorText(data) || "Não foi possível enviar o aviso."
    );
    load();
  }

  async function removeCourse(id: string) {
    if (!confirm("Apagar este curso?")) return;
    const res = await adminFetch(`/admin/courses/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { notice?: string; error?: string; message?: string };
    alert(res.ok ? data.notice || "Curso apagado." : errorText(data) || "Não foi possível apagar o curso.");
    load();
  }

  if (!ok) {
    return (
      <form onSubmit={login} className="mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-2xl font-bold">Admin</h1>
        <input
          type="password"
          className="mb-3 w-full rounded-xl bg-white/10 p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
        />
        <button className="w-full rounded-xl bg-white p-3 font-semibold text-black">Entrar</button>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 pb-20">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Painel admin</h1>
        <button type="button" onClick={logout} className="text-sm text-muted">
          Sair
        </button>
      </div>

      <BotUsersPanel adminFetch={adminFetch} />
      <StarsRateSetting adminFetch={adminFetch} />

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">
          {catEditingId ? "Editar categoria" : "Nova categoria"}
        </h2>
        <form onSubmit={saveCategory} className="flex gap-2">
          <input
            className="w-20 rounded-xl bg-white/10 p-3"
            value={catEmoji}
            onChange={(e) => setCatEmoji(e.target.value)}
          />
          <input
            className="flex-1 rounded-xl bg-white/10 p-3"
            value={catName}
            onChange={(e) => setCatName(e.target.value)}
            placeholder="Nome da categoria"
          />
          <button className="rounded-xl bg-white px-4 font-semibold text-black">
            {catEditingId ? "Salvar" : "Criar"}
          </button>
          {catEditingId && (
            <button type="button" onClick={cancelCategoryEdit} className="rounded-xl bg-white/10 px-4">
              Cancelar
            </button>
          )}
        </form>
        <ul className="mt-3 space-y-2">
          {categories.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <span>
                {c.emoji} {c.name}
              </span>
              <span className="flex gap-3">
                <button type="button" onClick={() => editCategory(c)} className="text-sky-400">
                  Editar
                </button>
                <button type="button" onClick={() => removeCategory(c)} className="text-red-400">
                  Apagar
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{editingId ? "Editar curso" : "Novo curso"}</h2>
        <form onSubmit={saveCourse} className="grid gap-3">
          <input
            className="rounded-xl bg-white/10 p-3"
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <select
            className="rounded-xl bg-white/10 p-3 [color-scheme:dark]"
            value={form.category_id}
            onChange={(e) => setForm({ ...form, category_id: e.target.value })}
          >
            <option value="" className="bg-[#1a1a1a] text-white">
              Categoria
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#1a1a1a] text-white">
                {c.emoji} {c.name}
              </option>
            ))}
          </select>
          <textarea
            className="rounded-xl bg-white/10 p-3"
            placeholder="Descrição"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <textarea
            className="rounded-xl bg-white/10 p-3"
            placeholder="Benefícios (um por linha)"
            value={form.benefits}
            onChange={(e) => setForm({ ...form, benefits: e.target.value })}
          />
          <CoverCropper onDone={(url) => setForm({ ...form, cover_url: url })} />
          {form.cover_url && (
            <img src={form.cover_url} alt="" className="h-28 w-full rounded-xl object-cover" />
          )}
          <input
            className="rounded-xl bg-white/10 p-3"
            placeholder="Vídeo de amostra: link do YouTube (não listado) ou .mp4"
            value={form.preview_url}
            onChange={(e) => setForm({ ...form, preview_url: e.target.value })}
          />
          <PreviewHint url={form.preview_url} />
          <CourseSizePicker
            value={{
              modules_count: form.modules_count,
              lessons_count: form.lessons_count,
              duration_seconds: form.duration_seconds,
            }}
            onChange={(size) => setForm({ ...form, ...size })}
          />
          <div className="grid grid-cols-2 gap-2">
            <label className="flex flex-col gap-1 text-xs text-muted">
              Preço do curso original (R$)
              <input
                inputMode="decimal"
                className="rounded-xl bg-white/10 p-3 text-sm text-ink"
                placeholder="ex.: 857,90"
                value={form.original_price_brl}
                onChange={(e) => setForm({ ...form, original_price_brl: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1 text-xs text-muted">
              Preço no Olimpocursos (⭐/mês)
              <input
                className="rounded-xl bg-white/10 p-3 text-sm text-ink"
                type="number"
                min={1}
                max={2500}
                value={form.price_stars}
                onChange={(e) => setForm({ ...form, price_stars: Number(e.target.value) })}
              />
            </label>
          </div>
          <input
            className="rounded-xl bg-white/10 p-3"
            placeholder="Channel ID -100..."
            value={form.channel_id}
            onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
            onBlur={() => setForm((f) => ({ ...f, channel_id: normalizeChannelId(f.channel_id) }))}
          />
          {form.channel_id && !/^-100\d{6,}$/.test(normalizeChannelId(form.channel_id)) && (
            <p className="-mt-1 text-xs text-amber-300">
              ⚠ O ID do canal começa com -100 (ex.: -1003371971167). Abra o canal em web.telegram.org/a/ e copie o
              número da barra de endereço.
            </p>
          )}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-xl bg-white/10 p-3"
              placeholder="Invite link"
              value={form.invite_link}
              onChange={(e) => setForm({ ...form, invite_link: e.target.value })}
            />
            <button type="button" onClick={generateInvite} className="rounded-xl bg-white/20 px-4">
              Gerar invite
            </button>
          </div>
          <button className="rounded-xl bg-white p-3 font-semibold text-black">
            {editingId ? "Atualizar curso" : "Salvar curso"}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Cursos</h2>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white/5 p-3">
              <span>
                {c.name} — {c.price_stars} ★{c.is_active === false ? " (oculto)" : ""}
                {c.notified_at && (
                  <span className="ml-2 text-xs text-muted">
                    · avisado em {new Date(c.notified_at).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </span>
              <span className="flex gap-3">
                {!c.notified_at && c.is_active !== false && (
                  <button type="button" onClick={() => notifyCourse(c)} className="text-amber-300">
                    📣 Notificar alunos
                  </button>
                )}
                <button type="button" onClick={() => editCourse(c)} className="text-sky-400">
                  Editar
                </button>
                <button type="button" onClick={() => removeCourse(c.id)} className="text-red-400">
                  Apagar
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}