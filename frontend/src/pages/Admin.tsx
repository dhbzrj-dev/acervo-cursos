import { useEffect, useState } from "react";

type Category = { id: string; name: string; emoji?: string; order?: number };
type Course = {
  id: string; name: string; category_id: string; description?: string;
  benefits?: string[]; cover_url?: string; price_stars: number;
  invite_link?: string; channel_id?: string; is_active?: boolean;
};

export default function Admin() {
  const api = import.meta.env.VITE_API_URL;
  const [password, setPassword] = useState(localStorage.getItem("admin_token") || "");
  const [ok, setOk] = useState(!!localStorage.getItem("admin_token"));
  const [categories, setCategories] = useState<Category[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [catName, setCatName] = useState("");
  const [catEmoji, setCatEmoji] = useState("📁");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "", category_id: "", description: "", benefits: "",
    cover_url: "", price_stars: 100, invite_link: "", channel_id: "", is_active: true,
  });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${password}` };

  async function login(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch(`${api}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) { alert("Senha errada"); return; }
    localStorage.setItem("admin_token", password);
    setOk(true);
  }

  async function load() {
    const [cats, list] = await Promise.all([
      fetch(`${api}/admin/categories`, { headers }).then((r) => r.json()),
      fetch(`${api}/admin/courses`, { headers }).then((r) => r.json()),
    ]);
    setCategories(cats);
    setCourses(list);
  }

  useEffect(() => { if (ok) load(); }, [ok]);

  async function createCategory(e: React.FormEvent) {
    e.preventDefault();
    await fetch(`${api}/admin/categories`, {
      method: "POST", headers,
      body: JSON.stringify({ name: catName, emoji: catEmoji, order: categories.length + 1 }),
    });
    setCatName("");
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
    });
  }

  async function saveCourse(e: React.FormEvent) {
    e.preventDefault();
    const url = editingId ? `${api}/admin/courses/${editingId}` : `${api}/admin/courses`;
    const res = await fetch(url, { method: editingId ? "PUT" : "POST", headers, body: JSON.stringify(form) });
    if (!res.ok) { alert("Erro ao salvar curso"); return; }
    alert("Curso salvo");
    setEditingId(null);
    load();
  }

  async function generateInvite() {
    if (!form.channel_id || !form.price_stars) { alert("Preencha Channel ID e Stars"); return; }
    const res = await fetch(`${api}/admin/invite-link`, {
      method: "POST", headers,
      body: JSON.stringify({ channel_id: form.channel_id, price_stars: form.price_stars, name: form.name }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      description?: string;
      result?: { invite_link: string };
    };
    if (!data.ok) { alert(data.error || "Falha ao gerar invite"); return; }
    setForm({ ...form, invite_link: data.invite_link });
    alert("Invite gerado. Clique em salvar.");
  }

  async function removeCourse(id: string) {
    if (!confirm("Apagar este curso?")) return;
    await fetch(`${api}/admin/courses/${id}`, { method: "DELETE", headers });
    load();
  }

  if (!ok) {
    return (
      <form onSubmit={login} className="mx-auto max-w-sm p-6">
        <h1 className="mb-4 text-2xl font-bold">Admin</h1>
        <input type="password" className="mb-3 w-full rounded-xl bg-white/10 p-3" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Senha" />
        <button className="w-full rounded-xl bg-white p-3 font-semibold text-black">Entrar</button>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 pb-20">
      <h1 className="mb-6 text-2xl font-bold">Painel admin</h1>
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Nova categoria</h2>
        <form onSubmit={createCategory} className="flex gap-2">
          <input className="w-20 rounded-xl bg-white/10 p-3" value={catEmoji} onChange={(e) => setCatEmoji(e.target.value)} />
          <input className="flex-1 rounded-xl bg-white/10 p-3" value={catName} onChange={(e) => setCatName(e.target.value)} placeholder="Nome da categoria" />
          <button className="rounded-xl bg-white px-4 font-semibold text-black">Criar</button>
        </form>
        <ul className="mt-3 space-y-1">{categories.map((c) => <li key={c.id}>{c.emoji} {c.name}</li>)}</ul>
      </section>
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">{editingId ? "Editar curso" : "Novo curso"}</h2>
        <form onSubmit={saveCourse} className="grid gap-3">
          <input className="rounded-xl bg-white/10 p-3" placeholder="Nome" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <select className="rounded-xl bg-white/10 p-3" value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
            <option value="">Categoria</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.name}</option>)}
          </select>
          <textarea className="rounded-xl bg-white/10 p-3" placeholder="Descrição" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <textarea className="rounded-xl bg-white/10 p-3" placeholder="Benefícios (um por linha)" value={form.benefits} onChange={(e) => setForm({ ...form, benefits: e.target.value })} />
          <input className="rounded-xl bg-white/10 p-3" placeholder="URL da capa" value={form.cover_url} onChange={(e) => setForm({ ...form, cover_url: e.target.value })} />
          <input className="rounded-xl bg-white/10 p-3" type="number" value={form.price_stars} onChange={(e) => setForm({ ...form, price_stars: Number(e.target.value) })} />
          <input className="rounded-xl bg-white/10 p-3" placeholder="Channel ID -100..." value={form.channel_id} onChange={(e) => setForm({ ...form, channel_id: e.target.value })} />
          <div className="flex gap-2">
            <input className="flex-1 rounded-xl bg-white/10 p-3" placeholder="Invite link" value={form.invite_link} onChange={(e) => setForm({ ...form, invite_link: e.target.value })} />
            <button type="button" onClick={generateInvite} className="rounded-xl bg-white/20 px-4">Gerar invite</button>
          </div>
          <button className="rounded-xl bg-white p-3 font-semibold text-black">{editingId ? "Atualizar curso" : "Salvar curso"}</button>
        </form>
      </section>
      <section>
        <h2 className="mb-3 text-lg font-semibold">Cursos</h2>
        <ul className="space-y-2">
          {courses.map((c) => (
            <li key={c.id} className="flex items-center justify-between rounded-xl bg-white/5 p-3">
              <span>{c.name} — {c.price_stars} ★</span>
              <span className="flex gap-3">
                <button type="button" onClick={() => editCourse(c)} className="text-sky-400">Editar</button>
                <button type="button" onClick={() => removeCourse(c.id)} className="text-red-400">Apagar</button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
