export interface Category {
  id: string;
  name: string;
  emoji: string;
  order: number;
}

export interface Course {
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
  createdAt?: string;
  previewUrl?: string;
  studentsCount?: number;
  modulesCount?: number | null;
  lessonsCount?: number | null;
  durationSeconds?: number | null;
  /** Preço do curso original (pagamento único), em centavos. */
  originalPriceCents?: number | null;
}

export interface UserSubscription {
  courseId: string;
  active: boolean;
  renewsAt: string;
  channelDeepLink: string;
}