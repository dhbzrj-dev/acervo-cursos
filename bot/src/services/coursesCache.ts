import { env } from "../config/env.js";

interface CourseSummary {
  id: string;
  channelId: string;
  inviteLink: string;
}

/**
 * O bot não tem acesso direto ao Postgres (só o backend tem) — em vez
 * disso, busca a lista pública de cursos (`GET /courses`) e mantém um
 * cache em memória para resolver rapidamente "esse update de chat_member
 * veio de qual curso?" sem bater na API a cada evento.
 *
 * Refresh a cada 5 minutos é suficiente: novos cursos não precisam
 * aparecer no mapeamento instantaneamente.
 */

let cache: CourseSummary[] = [];
let lastFetch = 0;
const TTL_MS = 5 * 60 * 1000;

async function refresh(): Promise<void> {
  const res = await fetch(`${env.backendUrl}/courses`);
  if (!res.ok) {
    throw new Error(`Falha ao buscar /courses: ${res.status}`);
  }
  const courses = (await res.json()) as CourseSummary[];
  cache = courses;
  lastFetch = Date.now();
}

async function ensureFresh(): Promise<void> {
  if (Date.now() - lastFetch > TTL_MS) {
    await refresh();
  }
}

/** Encontra o curso cujo canal corresponde ao chat_id do update do Telegram. */
export async function findCourseByChannelId(
  channelId: number | string
): Promise<CourseSummary | null> {
  await ensureFresh();
  const id = String(channelId);
  return cache.find((c) => c.channelId === id) ?? null;
}

/** Fallback: encontra o curso pelo link de convite usado para entrar. */
export async function findCourseByInviteLink(
  inviteLink: string
): Promise<CourseSummary | null> {
  await ensureFresh();
  return cache.find((c) => c.inviteLink === inviteLink) ?? null;
}
