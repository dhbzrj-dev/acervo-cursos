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

const MAX_SECONDS = 48 * 3600;
const plausible = (seconds: number) => (Number.isFinite(seconds) && seconds > 0 && seconds < MAX_SECONDS ? seconds : null);

async function bytes(file: File, start: number, length: number): Promise<DataView> {
  const buffer = await file.slice(start, Math.min(file.size, start + length)).arrayBuffer();
  return new DataView(buffer);
}

function ascii(view: DataView, offset: number, length = 4): string {
  let out = "";
  for (let i = 0; i < length && offset + i < view.byteLength; i++) out += String.fromCharCode(view.getUint8(offset + i));
  return out;
}

function indexOf(view: DataView, pattern: number[], from = 0): number {
  outer: for (let i = from; i <= view.byteLength - pattern.length; i++) {
    for (let j = 0; j < pattern.length; j++) if (view.getUint8(i + j) !== pattern[j]) continue outer;
    return i;
  }
  return -1;
}

/** MP4/MOV/M4V/3GP: duração do box "mvhd" dentro de "moov" (que pode estar no fim do arquivo). */
async function mp4Duration(file: File): Promise<number | null> {
  let offset = 0;
  for (let guard = 0; guard < 1000 && offset + 8 <= file.size; guard++) {
    const head = await bytes(file, offset, 16);
    let size = head.getUint32(0);
    const type = ascii(head, 4);
    let headerSize = 8;
    if (size === 1 && head.byteLength >= 16) {
      size = head.getUint32(8) * 2 ** 32 + head.getUint32(12);
      headerSize = 16;
    } else if (size === 0) {
      size = file.size - offset;
    }
    if (size < headerSize) return null;

    if (type === "moov") {
      const moov = await bytes(file, offset, Math.min(size, 64 * 1024 * 1024));
      const at = indexOf(moov, [0x6d, 0x76, 0x68, 0x64], headerSize); // "mvhd"
      if (at < 4) return null;
      const box = at - 4;
      const version = moov.getUint8(box + 8);
      const timescale = version === 1 ? moov.getUint32(box + 28) : moov.getUint32(box + 20);
      const duration =
        version === 1 ? moov.getUint32(box + 32) * 2 ** 32 + moov.getUint32(box + 36) : moov.getUint32(box + 24);
      return timescale ? plausible(duration / timescale) : null;
    }
    offset += size;
  }
  return null;
}

/** AVI: quadros × microssegundos por quadro (usa "dmlh" quando o arquivo passa de 1 GB). */
async function aviDuration(file: File): Promise<number | null> {
  const view = await bytes(file, 0, 256 * 1024);
  if (ascii(view, 0) !== "RIFF" || ascii(view, 8) !== "AVI ") return null;
  const avih = indexOf(view, [0x61, 0x76, 0x69, 0x68]); // "avih"
  if (avih < 0) return null;
  const usPerFrame = view.getUint32(avih + 8, true);
  let frames = view.getUint32(avih + 8 + 16, true);
  const dmlh = indexOf(view, [0x64, 0x6d, 0x6c, 0x68]); // "dmlh"
  if (dmlh >= 0) frames = Math.max(frames, view.getUint32(dmlh + 8, true));
  return plausible((frames * usPerFrame) / 1e6);
}

/** MKV/WebM: elementos EBML Duration (0x4489) × TimecodeScale (0x2AD7B1). */
async function mkvDuration(file: File): Promise<number | null> {
  const view = await bytes(file, 0, 512 * 1024);
  if (view.byteLength < 4 || view.getUint32(0) !== 0x1a45dfa3) return null;
  let scale = 1_000_000;
  const ts = indexOf(view, [0x2a, 0xd7, 0xb1]);
  if (ts >= 0) {
    const len = view.getUint8(ts + 3) & 0x0f; // vint de 1 byte: 0x8N
    if (len >= 1 && len <= 8) {
      let value = 0;
      for (let i = 0; i < len; i++) value = value * 256 + view.getUint8(ts + 4 + i);
      if (value > 0) scale = value;
    }
  }
  for (let at = indexOf(view, [0x44, 0x89]); at >= 0; at = indexOf(view, [0x44, 0x89], at + 1)) {
    const sizeByte = view.getUint8(at + 2);
    const raw = sizeByte === 0x88 ? view.getFloat64(at + 3) : sizeByte === 0x84 ? view.getFloat32(at + 3) : NaN;
    const seconds = plausible((raw * scale) / 1e9);
    if (seconds) return seconds;
  }
  return null;
}

/** Lê a duração pelo cabeçalho do arquivo (funciona com qualquer codec, ex. H.265). */
async function headerDuration(file: File): Promise<number | null> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  try {
    if (["mp4", "m4v", "mov", "3gp"].includes(ext)) return await mp4Duration(file);
    if (ext === "avi") return await aviDuration(file);
    if (["mkv", "webm"].includes(ext)) return await mkvDuration(file);
  } catch {
    /* cabeçalho fora do padrão: tenta pelo player */
  }
  return null;
}

/** Duração do vídeo lida no próprio navegador — nada é enviado. */
async function readDuration(file: File): Promise<number | null> {
  return (await headerDuration(file)) ?? (await playerDuration(file));
}

/** Reserva: pede ao player do navegador (falha em codecs que ele não toca). */
function playerDuration(file: File): Promise<number | null> {
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
