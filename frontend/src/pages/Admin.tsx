import { useEffect, useState } from "react";
import CoverCropper from "@/components/CoverCropper";

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
};

const SESSION_KEY = "admin_session";

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
    const res = await fetch(`${api}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session}` },
    });
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
      alert(data.error || data.message || "Não foi possível salvar a categoria.");
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
      alert(data.error || data.message || "Não foi possível apagar a categoria.");
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
    });
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    const path = editingId ? `/admin/courses/${editingId}` : "/admin/courses";
    const res = await adminFetch(path, {
      method: editingId ? "PUT" : "POST",
      body: JSON.stringify(form),
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
    };
    if (!data.ok || !data.invite_link) {
      alert(data.error || "Falha ao gerar invite");
      return;
    }
    setForm({ ...form, invite_link: data.invite_link });
    alert("Invite gerado. Clique em salvar.");
  }

  async function removeCourse(id: string) {
    if (!confirm("Apagar este curso?")) return;
    const res = await adminFetch(`/admin/courses/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { notice?: string; error?: string; message?: string };
    alert(res.ok ? data.notice || "Curso apagado." : data.error || data.message || "Não foi possível apagar o curso.");
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
            placeholder="Vídeo de amostra .mp4"
            value={form.preview_url}
            onChange={(e) => setForm({ ...form, preview_url: e.target.value })}
          />
          <input
            className="rounded-xl bg-white/10 p-3"
            type="number"
            value={form.price_stars}
            onChange={(e) => setForm({ ...form, price_stars: Number(e.target.value) })}
          />
          <input
            className="rounded-xl bg-white/10 p-3"
            placeholder="Channel ID -100..."
            value={form.channel_id}
            onChange={(e) => setForm({ ...form, channel_id: e.target.value })}
          />
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
            <li key={c.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <span>
                {c.name} — {c.price_stars} ★{c.is_active === false ? " (oculto)" : ""}
              </span>
              <span className="flex gap-3">
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