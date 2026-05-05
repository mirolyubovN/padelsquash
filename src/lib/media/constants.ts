export const MEDIA_CATEGORIES = ["homepage", "gallery", "events", "offers", "instructors"] as const;

export type MediaCategory = (typeof MEDIA_CATEGORIES)[number];

export const MEDIA_CATEGORY_LABELS: Record<MediaCategory, string> = {
  homepage: "Главная",
  gallery: "Галерея",
  events: "Мероприятия",
  offers: "Предложения",
  instructors: "Тренеры",
};
