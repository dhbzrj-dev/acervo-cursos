/** "12h 35min", "45min" ou "2h" a partir de segundos. */
export function formatDuration(totalSeconds: number): string {
  const minutes = Math.round(totalSeconds / 60);
  if (minutes < 60) return `${Math.max(minutes, 1)}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}min` : `${h}h`;
}

/** "6 módulos · 48 aulas · 12h 35min" (só as partes informadas). */
export function formatCourseSize(stats: {
  modulesCount?: number | null;
  lessonsCount?: number | null;
  durationSeconds?: number | null;
}): string {
  const parts: string[] = [];
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  if (stats.modulesCount) parts.push(plural(stats.modulesCount, "módulo", "módulos"));
  if (stats.lessonsCount) parts.push(plural(stats.lessonsCount, "aula", "aulas"));
  if (stats.durationSeconds) parts.push(formatDuration(stats.durationSeconds));
  return parts.join(" · ");
}

const VIDEO_EXT = /\.(mp4|m4v|mov|mkv|webm|avi|wmv|flv|mpe?g|ts|3gp)$/i;

export interface FolderScan {
  modules: { name: string; lessons: number; seconds: number }[];
  modulesCount: number;
  lessonsCount: number;
  durationSeconds: number;
  /** Vídeos cuja duração o navegador não conseguiu ler (ex.: .avi, .wmv). */
  unreadable: string[];
}

/** Lê só os metadados do vídeo no próprio navegador — nada é enviado. */
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    let done = false;
    const finish = (value: number | null) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = setTimeout(() => finish(null), 15000);
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () =>
      finish(Number.isFinite(video.duration) && video.duration > 0 ? video.duration : null);
    video.onerror = () => finish(null);
    video.src = url;
  });
}

/**
 * Recebe os arquivos de uma pasta escolhida no painel (input com
 * `webkitdirectory`) e conta: módulo = subpasta de 1º nível com vídeos;
 * aula = arquivo de vídeo; duração = soma dos metadados.
 */
export async function scanCourseFolder(
  files: File[],
  onProgress?: (done: number, total: number) => void
): Promise<FolderScan> {
  const videos = files.filter((file) => VIDEO_EXT.test(file.name));
  const modules = new Map<string, { lessons: number; seconds: number }>();
  const unreadable: string[] = [];
  let durationSeconds = 0;
  let done = 0;

  const queue = [...videos];
  const worker = async () => {
    for (let file = queue.shift(); file; file = queue.shift()) {
      // webkitRelativePath = "PastaDoCurso/Módulo 1/aula.mp4"
      const parts = (file.webkitRelativePath || file.name).split("/");
      const moduleName = parts.length > 2 ? parts[1] : "";
      const seconds = await readDuration(file);
      if (seconds === null) unreadable.push(parts.slice(1).join("/") || file.name);
      else durationSeconds += seconds;

      const entry = modules.get(moduleName) ?? { lessons: 0, seconds: 0 };
      entry.lessons += 1;
      entry.seconds += seconds ?? 0;
      modules.set(moduleName, entry);
      onProgress?.(++done, videos.length);
    }
  };
  await Promise.all(Array.from({ length: Math.min(4, videos.length) }, worker));

  const list = [...modules.entries()]
    .map(([name, value]) => ({ name: name || "(arquivos soltos na pasta principal)", ...value }))
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { numeric: true }));

  return {
    modules: list,
    modulesCount: [...modules.keys()].filter(Boolean).length,
    lessonsCount: videos.length,
    durationSeconds: Math.round(durationSeconds),
    unreadable: unreadable.sort((a, b) => a.localeCompare(b, "pt-BR", { numeric: true })),
  };
}
