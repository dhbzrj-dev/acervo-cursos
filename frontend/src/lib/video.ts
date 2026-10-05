/**
 * Vídeo de amostra do curso: aceita link do YouTube (recomendado: vídeo
 * "Não listado") ou link direto para arquivo .mp4/.webm.
 */
export type PreviewSource =
  | { kind: "youtube"; id: string }
  | { kind: "file"; url: string }
  | { kind: "invalid" };

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;

export function youtubeId(raw: string): string | null {
  let url: URL;
  const value = raw.trim();
  try {
    // Aceita link colado sem "https://" (ex.: youtu.be/abc...).
    url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;

  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0];
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v");
    else {
      const match = url.pathname.match(/^\/(embed|shorts|live|v)\/([^/?#]+)/);
      if (match) id = match[2];
    }
  }
  return id && YOUTUBE_ID.test(id) ? id : null;
}

export function parsePreviewUrl(raw: string | undefined | null): PreviewSource | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  const id = youtubeId(value);
  if (id) return { kind: "youtube", id };
  if (/^https?:\/\/.+\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(value)) return { kind: "file", url: value };
  return { kind: "invalid" };
}
