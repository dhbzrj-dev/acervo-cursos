import type { Category, Course, UserSubscription } from "@/types";
import { mockCategories, mockCourses, mockSubscriptions } from "@/data/mock";
import { getInitDataRaw, isInsideTelegram } from "@/lib/telegram";

/**
 * Camada de acesso a dados.
 *
 * Se `VITE_API_URL` estiver configurada, fala com o backend (Fastify) de
 * verdade. Sem ela — por exemplo, rodando `npm run dev` sem o backend no
 * ar — cai automaticamente nos mocks locais, com um pequeno delay
 * artificial só para os skeletons terem algo a mostrar. As telas nunca
 * precisam saber qual dos dois caminhos está sendo usado.
 */

const API_URL = import.meta.env.VITE_API_URL as string | undefined;
const USE_MOCKS = !API_URL;

const FAKE_LATENCY_MS = 400;
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function apiGet<T>(path: string, opts?: { auth?: boolean }): Promise<T> {
  const headers: Record<string, string> = {};

  if (opts?.auth) {
    // Rotas /me/* exigem o initData assinado pelo Telegram — é isso que o
    // backend usa pra validar o HMAC e saber quem está pedindo.
    const initData = getInitDataRaw();
    if (!initData) {
      // Fora do Telegram (ex: preview no navegador) não há initData válido;
      // melhor devolver "sem dados" do que quebrar a tela.
      throw new Error("Sem initData do Telegram — não é possível autenticar.");
    }
    headers.Authorization = `tma ${initData}`;
  }

  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error(`GET ${path} falhou: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function apiSend<T>(path: string, body: unknown): Promise<T> {
  const initData = getInitDataRaw();
  if (!initData) {
    throw new Error("Sem initData do Telegram — não é possível autenticar.");
  }
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `tma ${initData}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error || `POST ${path} falhou: ${res.status}`);
  return data as T;
}

export type ChatMessage = {
  id: number;
  body: string;
  createdAt: string;
  nickname: string;
  avatar: string;
  mine: boolean;
};

export type ChatSnapshot = {
  me: { nickname: string; avatar: string };
  banned: boolean;
  messages: ChatMessage[];
};

export async function fetchChat(after = 0): Promise<ChatSnapshot> {
  return apiGet<ChatSnapshot>(`/chat/messages?after=${after}`, { auth: true });
}

export async function sendChat(body: string): Promise<{ ok: boolean; id: number }> {
  return apiSend("/chat/messages", { body });
}

export async function fetchCategories(): Promise<Category[]> {
  if (USE_MOCKS) {
    await delay(FAKE_LATENCY_MS);
    return [...mockCategories].sort((a, b) => a.order - b.order);
  }
  return apiGet<Category[]>("/categories");
}

export async function fetchCourses(): Promise<Course[]> {
  if (USE_MOCKS) {
    await delay(FAKE_LATENCY_MS);
    return mockCourses.filter((c) => c.isActive);
  }
  return apiGet<Course[]>("/courses");
}

export async function fetchCourseById(id: string): Promise<Course | null> {
  if (USE_MOCKS) {
    await delay(FAKE_LATENCY_MS);
    return mockCourses.find((c) => c.id === id) ?? null;
  }
  try {
    return await apiGet<Course>(`/courses/${id}`);
  } catch {
    return null;
  }
}

export async function fetchMySubscriptions(): Promise<UserSubscription[]> {
  if (USE_MOCKS) {
    await delay(FAKE_LATENCY_MS);
    return mockSubscriptions.filter((s) => s.active);
  }
  if (!isInsideTelegram()) {
    // Sem sessão do Telegram não dá pra saber "quem é o usuário", então
    // não há assinaturas para mostrar — isso é esperado, não um erro.
    return [];
  }
  try {
    return await apiGet<UserSubscription[]>("/me/subscriptions", { auth: true });
  } catch (err) {
    console.warn("[api] falha ao buscar assinaturas:", err);
    return [];
  }
}

export function formatStars(amount: number): string {
  return new Intl.NumberFormat("pt-BR").format(amount);
}

export function formatRenewalDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}
