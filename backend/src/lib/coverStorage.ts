import { put } from "@vercel/blob";

/**
 * Capas dos cursos ficam no Vercel Blob (store público), e o banco guarda só
 * a URL. Antes, a imagem inteira ia em base64 para `courses.cover_url` e era
 * baixada junto com o catálogo a cada abertura do Mini App.
 *
 * O SDK lê o token de `BLOB_READ_WRITE_TOKEN`. Sem ele, o painel continua
 * salvando a capa em base64 (comportamento antigo) em vez de quebrar.
 */
export function isCoverStorageConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/;

export async function uploadCoverDataUrl(dataUrl: string, name: string): Promise<string> {
  const match = DATA_URL.exec(dataUrl);
  if (!match) throw new Error("Imagem inválida: esperado data URL JPEG, PNG ou WebP.");
  const [, contentType, base64] = match;
  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const blob = await put(`covers/${name || "capa"}.${ext}`, Buffer.from(base64, "base64"), {
    access: "public",
    contentType,
    addRandomSuffix: true,
  });
  return blob.url;
}
