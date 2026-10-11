import { pool } from "../db/pool.js";

const BRL_PER_100_STARS = "brl_per_100_stars";

/** Quanto custam 100 Stars em reais (para mostrar "≈ R$" nos preços). */
export async function getBrlPer100Stars(): Promise<number | null> {
  const { rows } = await pool.query("SELECT value FROM app_settings WHERE key = $1", [BRL_PER_100_STARS]);
  const value = Number(rows[0]?.value);
  return Number.isFinite(value) && value > 0 ? value : null;
}

export async function setBrlPer100Stars(value: number | null): Promise<void> {
  if (value === null) {
    await pool.query("DELETE FROM app_settings WHERE key = $1", [BRL_PER_100_STARS]);
    return;
  }
  await pool.query(
    `INSERT INTO app_settings (key, value) VALUES ($1, $2)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [BRL_PER_100_STARS, String(value)]
  );
}
