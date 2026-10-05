import { useRef, useState } from "react";
import { parsePreviewUrl } from "@/lib/video";

function PlayOverlay({ onPlay }: { onPlay: () => void }) {
  return (
    <button
      type="button"
      onClick={onPlay}
      className="absolute inset-0 flex items-center justify-center bg-black/20"
      aria-label="Reproduzir vídeo de amostra"
    >
      <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-black shadow-lg">
        ▶
      </span>
    </button>
  );
}

/**
 * YouTube: mostra só a miniatura até o toque e então carrega o player
 * (domínio sem cookies, sem vídeos de outros canais no final). Assim a
 * página não carrega o YouTube à toa e a interface dele só aparece no play.
 */
function YouTubePreview({ id }: { id: string }) {
  const [playing, setPlaying] = useState(false);
  const params = new URLSearchParams({
    autoplay: "1",
    playsinline: "1",
    rel: "0",
    modestbranding: "1",
    iv_load_policy: "3",
  });

  if (playing) {
    return (
      <iframe
        src={`https://www.youtube-nocookie.com/embed/${id}?${params}`}
        title="Vídeo de amostra"
        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
        allowFullScreen
        className="h-full w-full border-0"
      />
    );
  }

  return (
    <>
      <img
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        className="h-full w-full object-cover"
        loading="lazy"
      />
      <PlayOverlay onPlay={() => setPlaying(true)} />
    </>
  );
}

function FilePreview({ url }: { url: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  return (
    <>
      <video
        ref={ref}
        src={url}
        playsInline
        controls={playing}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        onEnded={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!playing && (
        <PlayOverlay
          onPlay={() => {
            ref.current?.play();
            setPlaying(true);
          }}
        />
      )}
    </>
  );
}

export default function PreviewPlayer({ src }: { src: string }) {
  const source = parsePreviewUrl(src);
  if (!source || source.kind === "invalid") return null;

  return (
    <div className="relative mt-6 aspect-video overflow-hidden rounded-card bg-black">
      {source.kind === "youtube" ? <YouTubePreview id={source.id} /> : <FilePreview url={source.url} />}
    </div>
  );
}
