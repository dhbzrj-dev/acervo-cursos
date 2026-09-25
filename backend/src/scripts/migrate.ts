import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { pool, closePool } from "../db/pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const schemaPath = path.resolve(__dirname, "../../db/schema.sql");

async function migrate() {
  const sql = await readFile(schemaPath, "utf-8");
  console.log(`Aplicando schema de ${schemaPath}...`);
  await pool.query(sql);
  console.log("Schema aplicado com sucesso.");
}

migrate()
  .catch((err) => {
    console.error("Falha ao aplicar migração:", err);
    process.exitCode = 1;
  })
  .finally(closePool);
