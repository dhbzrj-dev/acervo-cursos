import { pool, closePool } from "../db/pool.js";
import { isCoverStorageConfigured, uploadCoverDataUrl } from "../lib/coverStorage.js";

/**
 * Uso: npm run covers:migrate
 *
 * Sobe para o Vercel Blob as capas que ainda estão em base64 dentro de
 * `courses.cover_url` e troca o valor pela URL. Pode rodar quantas vezes
 * quiser: cursos que já têm URL são ignorados.
 */
async function migrateCovers() {
  if (!isCoverStorageConfigured()) {
    throw new Error("BLOB_READ_WRITE_TOKEN ausente no backend/.env.");
  }

  const { rows } = await pool.query(
    "SELECT id, cover_url FROM courses WHERE cover_url LIKE 'data:%' ORDER BY id"
  );
  console.log(`${rows.length} capa(s) em base64 para migrar.`);

  for (const row of rows) {
    const url = await uploadCoverDataUrl(row.cover_url, row.id);
    await pool.query("UPDATE courses SET cover_url = $1 WHERE id = $2", [url, row.id]);
    console.log(`  ${row.id}: ${Math.round(row.cover_url.length / 1024)} KB -> ${url}`);
  }

  console.log("Pronto.");
}

migrateCovers()
  .catch((err) => {
    console.error("Falha ao migrar capas:", err);
    process.exitCode = 1;
  })
  .finally(closePool);
