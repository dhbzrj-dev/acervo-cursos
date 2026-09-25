import { Pool } from "pg";
import { env } from "../config/env.js";

/**
 * Pool único, reutilizado em toda a aplicação. O Fastify já serializa bem
 * o acesso concorrente; não há necessidade de um pool por request.
 */
export const pool = new Pool({
  connectionString: env.databaseUrl,
  // Supabase e a maioria dos provedores gerenciados exigem SSL; em dev
  // local contra um Postgres sem TLS, isso é ignorado pela lib se a URL
  // não pedir sslmode=require.
  ssl: env.databaseUrl.includes("sslmode=require")
    ? { rejectUnauthorized: false }
    : undefined,
});

export async function closePool() {
  await pool.end();
}
