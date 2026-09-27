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
  createdAt: string;
  studentsCount: number;
}

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
    createdAt: row.created_at,
    studentsCount: Number(row.students_count ?? 0),
  };
}

const SELECT = `
  SELECT c.id, c.category_id, c.name, c.description, c.benefits, c.cover_url,
         c.price_stars, c.invite_link, c.channel_id, c.is_active, c.created_at,
         (SELECT COUNT(*)::int FROM user_subscriptions s
          WHERE s.course_id = c.id AND s.active = TRUE) AS students_count
  FROM courses c
`;

export async function listActiveCourses(): Promise<CourseRow[]> {
  const { rows } = await pool.query(
    `${SELECT} WHERE c.is_active = TRUE ORDER BY c.created_at DESC`
  );
  return rows.map(mapRow);
}

export async function findCourseById(id: string): Promise<CourseRow | null> {
  const { rows } = await pool.query(`${SELECT} WHERE c.id = $1`, [id]);
  return rows[0] ? mapRow(rows[0]) : null;
}