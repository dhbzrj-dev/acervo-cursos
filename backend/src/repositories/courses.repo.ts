import { pool } from "../db/pool.js";

export interface CourseRow {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  benefits: string[];
  coverUrl: string;
  priceStars: number;
  inviteLink: string;
  channelId: string;
  isActive: boolean;
}

// Mapeia snake_case (Postgres) -> camelCase (contrato da API/frontend).
function mapRow(row: any): CourseRow {
  return {
    id: row.id,
    categoryId: row.category_id,
    name: row.name,
    description: row.description,
    benefits: row.benefits ?? [],
    coverUrl: row.cover_url,
    priceStars: row.price_stars,
    inviteLink: row.invite_link,
    channelId: row.channel_id,
    isActive: row.is_active,
  };
}

export async function listActiveCourses(): Promise<CourseRow[]> {
  const { rows } = await pool.query(
    `SELECT id, category_id, name, description, benefits, cover_url,
            price_stars, invite_link, channel_id, is_active
     FROM courses
     WHERE is_active = TRUE
     ORDER BY created_at DESC`
  );
  return rows.map(mapRow);
}

export async function findCourseById(id: string): Promise<CourseRow | null> {
  const { rows } = await pool.query(
    `SELECT id, category_id, name, description, benefits, cover_url,
            price_stars, invite_link, channel_id, is_active
     FROM courses
     WHERE id = $1`,
    [id]
  );
  return rows[0] ? mapRow(rows[0]) : null;
}
