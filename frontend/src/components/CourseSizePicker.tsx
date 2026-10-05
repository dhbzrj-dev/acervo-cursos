import { useState } from "react";
import { formatCourseSize, formatDuration, scanCourseFolder, type FolderScan } from "@/lib/courseStats";

export interface CourseSize {
  modules_count: number | "";
  lessons_count: number | "";
  duration_seconds: number | "";
}

const directoryProps = { webkitdirectory: "", directory: "" } as Record<string, string>;

/**
 * Lê a pasta do curso no próprio navegador (nada é enviado) e preenche
 * módulos, aulas e duração. Os números continuam editáveis à mão.
 */
export default function CourseSizePicker({
  value,
  onChange,
}: {
  value: CourseSize;
  onChange: (next: CourseSize) => void;
}) {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [scan, setScan] = useState<FolderScan | null>(null);
  const [error, setError] = useState("");

  async function onFolder(list: FileList | null) {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setError("");
    setScan(null);
    setProgress({ done: 0, total: 0 });
    try {
      const result = await scanCourseFolder(files, (done, total) => setProgress({ done, total }));
      if (!result.lessonsCount) {
        setError("Nenhum vídeo encontrado nessa pasta.");
        return;
      }
      setScan(result);
      onChange({
        modules_count: result.modulesCount,
        lessons_count: result.lessonsCount,
        duration_seconds: result.durationSeconds,
      });
    } finally {
      setProgress(null);
    }
  }

  const minutes = value.duration_seconds === "" ? "" : Math.round(value.duration_seconds / 60);
  const summary = formatCourseSize({
    modulesCount: value.modules_count || null,
    lessonsCount: value.lessons_count || null,
    durationSeconds: value.duration_seconds || null,
  });
  const toNumber = (raw: string) => (raw === "" ? "" : Math.max(0, Math.round(Number(raw))));

  return (
    <div className="rounded-xl border border-white/10 p-3">
      <p className="text-sm font-semibold">Tamanho do curso</p>
      <p className="mb-3 text-xs text-muted">
        Escolha a pasta do curso: cada subpasta com vídeos conta como um módulo. Os vídeos não são enviados.
      </p>

      <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-white/15 px-4 py-2.5 text-sm font-semibold">
        📂 Escolher pasta do curso
        <input
          type="file"
          multiple
          className="hidden"
          disabled={progress !== null}
          onChange={(e) => {
            onFolder(e.target.files);
            e.target.value = "";
          }}
          {...directoryProps}
        />
      </label>

      {progress && (
        <p className="mt-3 text-sm text-muted">
          Lendo vídeos… {progress.total ? `${progress.done}/${progress.total}` : ""}
        </p>
      )}
      {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}

      {scan && (
        <div className="mt-3 rounded-lg bg-white/5 p-3 text-sm">
          <details>
            <summary className="cursor-pointer">Ver por módulo ({scan.modules.length})</summary>
            <ul className="mt-2 space-y-1 text-xs text-muted">
              {scan.modules.map((m) => (
                <li key={m.name} className="flex justify-between gap-3">
                  <span className="truncate">{m.name}</span>
                  <span className="shrink-0">
                    {m.lessons} aula{m.lessons === 1 ? "" : "s"} · {m.seconds ? formatDuration(m.seconds) : "sem duração"}
                  </span>
                </li>
              ))}
            </ul>
          </details>
          {scan.unreadable.length > 0 && (
            <details className="mt-2 text-amber-300">
              <summary className="cursor-pointer">
                ⚠ {scan.unreadable.length} vídeo(s) sem duração lida (contados como aula, mas fora da soma)
              </summary>
              <ul className="mt-1 space-y-0.5 text-xs">
                {scan.unreadable.map((name) => (
                  <li key={name} className="truncate">
                    {name}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2">
        <NumberField
          label="Módulos"
          value={value.modules_count}
          onChange={(raw) => onChange({ ...value, modules_count: toNumber(raw) })}
        />
        <NumberField
          label="Aulas"
          value={value.lessons_count}
          onChange={(raw) => onChange({ ...value, lessons_count: toNumber(raw) })}
        />
        <NumberField
          label="Duração (min)"
          value={minutes}
          onChange={(raw) => {
            const m = toNumber(raw);
            onChange({ ...value, duration_seconds: m === "" ? "" : m * 60 });
          }}
        />
      </div>
      {summary && <p className="mt-2 text-xs text-emerald-400">Na página do curso: 🎬 {summary}</p>}
    </div>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | "";
  onChange: (raw: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs text-muted">
      {label}
      <input
        type="number"
        min={0}
        inputMode="numeric"
        className="rounded-xl bg-white/10 p-2.5 text-sm text-ink"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
