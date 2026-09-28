import { useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

type Props = {
  onDone: (dataUrl: string) => void;
};

export default function CoverCropper({ onDone }: Props) {
  const [image, setImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);

  function onFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!image || !area) return;
    const img = new Image();
    img.src = image;
    await img.decode();
    const canvas = document.createElement("canvas");
    canvas.width = 800;
    canvas.height = 450;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 800, 450);
    onDone(canvas.toDataURL("image/jpeg", 0.82));
    setImage(null);
  }

  return (
    <div>
      <p className="mb-2 text-sm text-muted">Capa 16:9</p>
      <input
        type="file"
        accept="image/*"
        className="text-sm"
        onChange={(e) => onFile(e.target.files?.[0])}
      />
      {image && (
        <div className="mt-3">
          <div className="relative h-64 w-full overflow-hidden bg-black">
            <Cropper
              image={image}
              crop={crop}
              zoom={zoom}
              aspect={16 / 9}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, pixels) => setArea(pixels)}
            />
          </div>
          <input
            className="mt-3 w-full"
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
          />
          <button
            type="button"
            onClick={save}
            className="mt-2 rounded-xl bg-white px-4 py-2 font-semibold text-black"
          >
            Usar este recorte
          </button>
        </div>
      )}
    </div>
  );
}