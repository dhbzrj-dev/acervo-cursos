import { pool } from "../db/pool.js";

export interface CategoryRow {
  id: string;
  name: string;
  emoji: string;
  order: number;
}

export async function listCategories(): Promise<CategoryRow[]> {
  const { rows } = await pool.query(
    `SELECT id, name, emoji, "order" FROM categories ORDER BY "order" ASC`
  );
  return rows;
}
