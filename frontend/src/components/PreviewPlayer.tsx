import { useRef, useState } from "react";

export default function PreviewPlayer({ src }: { src: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  function play() {
    ref.current?.play();
    setPlaying(true);
  }

  if (!src || /youtube\.com|youtu\.be/i.test(src)) return null;

  return (
    <div className="relative mt-6 aspect-video overflow-hidden rounded-card bg-black">
      <video
        ref={ref}
        src={src}
        playsInline
        controls={playing}
        controlsList="nodownload noremoteplayback noplaybackrate"
        disablePictureInPicture
        onEnded={() => setPlaying(false)}
        className="h-full w-full object-cover"
      />
      {!playing && (
        <button
          type="button"
          onClick={play}
          className="absolute inset-0 flex items-center justify-center"
          aria-label="Reproduzir"
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-2xl text-black">
            ▶
          </span>
        </button>
      )}
    </div>
  );
}