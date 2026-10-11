import { useEffect, useState } from "react";

type AdminFetch = (path: string, init?: RequestInit) => Promise<Response>;

/**
 * Quanto custam 100 Stars em reais. Com isso a vitrine mostra "≈ R$" ao
 * lado do preço em Stars e calcula o desconto sobre o curso original.
 */
export default function StarsRateSetting({ adminFetch }: { adminFetch: AdminFetch }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    adminFetch("/config")
      .then((r) => r.json())
      .then((data: { brlPer100Stars: number | null }) => {
        setSaved(data.brlPer100Stars);
        setValue(data.brlPer100Stars ? String(data.brlPer100Stars).replace(".", ",") : "");
      })
      .catch(() => {});
  }, []);

  async function save() {
    setSaving(true);
    try {
      const number = value.trim() ? Number(value.replace(/\./g, "").replace(",", ".")) : null;
      const res = await adminFetch("/admin/config", {
        method: "PUT",
        body: JSON.stringify({ brlPer100Stars: number }),
      });
      const data = (await res.json().catch(() => ({}))) as { brlPer100Stars?: number | null; message?: string };
      if (!res.ok) {
        alert(data.message || "Valor inválido.");
        return;
      }
      setSaved(data.brlPer100Stars ?? null);
      alert(number ? "Conversão salva. Os preços em R$ já aparecem no app." : "Conversão removida.");
    } finally {
      setSaving(false);
    }
  }

  const example = saved ? ((250 * saved) / 100).toFixed(2).replace(".", ",") : null;

  return (
    <section className="mb-8 rounded-xl border border-white/10 p-3">
      <h2 className="text-sm font-semibold">Conversão Stars → R$</h2>
      <p className="mb-3 text-xs text-muted">
        Veja no Telegram: Configurações → Minhas Stars → Comprar, e digite quanto custa o pacote de 100 ⭐.
      </p>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-sm">100 ⭐ custam R$</span>
        <input
          inputMode="decimal"
          className="w-28 rounded-xl bg-white/10 p-2.5 text-sm"
          placeholder="ex.: 11,90"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40"
        >
          Salvar
        </button>
      </div>
      <p className="mt-2 text-xs text-muted">
        {example ? `Ex.: um curso de 250 ⭐ aparece como ≈ R$ ${example}/mês.` : "Sem conversão: o app mostra só o preço em Stars."}
      </p>
    </section>
  );
}
