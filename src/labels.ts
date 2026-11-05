export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Черновик",
  SUBMITTED: "Подана",
  IN_REVIEW: "На проверке",
  APPROVED: "Допуск",
  REJECTED: "Отказ",
  WAITLIST: "Очередь",
  SETTLED: "Заселён",
  CANCELLED: "Отменена",
};

export const CATEGORY_LABELS: Record<string, string> = {
  ORPHAN: "Сирота / без попечения",
  DISABILITY: "Инвалидность",
  SOCIAL: "Многодетная или малоимущая семья",
  OUT_OF_TOWN: "Иногородний",
  NONE: "Без льготы",
};

export const DOCUMENT_LABELS: Record<string, string> = {
  PASSPORT: "Паспорт",
  ORPHAN: "Документ о статусе сироты",
  DISABILITY: "Справка об инвалидности",
  LARGE_FAMILY: "Удостоверение многодетной семьи",
  LOW_INCOME: "Справка о малообеспеченности",
  REGISTRATION: "Регистрация по месту жительства",
  OTHER: "Иной документ",
};

export const GENDER_LABELS: Record<string, string> = {
  MALE: "Мужской",
  FEMALE: "Женский",
};

export const ROLE_LABELS: Record<string, string> = {
  APPLICANT: "Абитуриент",
  STAFF: "Сотрудник",
  ADMIN: "Администратор",
};

export const DOCUMENT_STATUS: Record<string, string> = {
  PENDING: "На проверке",
  VERIFIED: "Проверен",
  REJECTED: "Отклонён",
};

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium" }).format(new Date(value));
}

export function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ru-RU", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function formatDistance(km?: number | null) {
  if (km == null) return "нет в справочнике";
  return `${km} км`;
}

export function formatHome(person: { city?: string; region?: string; street?: string; house?: string; apartment?: string }) {
  const place = [person.street, person.house ? `д. ${person.house}` : "", person.apartment ? `кв. ${person.apartment}` : ""]
    .filter(Boolean)
    .join(", ");
  return [person.city, person.region, place].filter(Boolean).join(", ");
}

export function dateInput(value?: string | null) {
  if (!value) return "";
  return value.slice(0, 10);
}
