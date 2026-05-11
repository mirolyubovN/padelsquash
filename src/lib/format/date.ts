export function getTodayDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function getDateDiffDays(fromIso: string, toIso: string): number {
  const fromDate = new Date(`${fromIso}T00:00:00`).getTime();
  const toDate = new Date(`${toIso}T00:00:00`).getTime();
  return Math.round((toDate - fromDate) / 86400000);
}

export function formatShortDate(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    day: "numeric",
    month: "short",
  })
    .format(new Date(`${dateIso}T00:00:00`))
    .replace(".", "");
}

export function formatShortWeekday(dateIso: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    weekday: "short",
  })
    .format(new Date(`${dateIso}T00:00:00`))
    .replace(".", "");
}

export function getRelativeDateLabel(dateIso: string, todayIso: string): string | null {
  const diffDays = getDateDiffDays(todayIso, dateIso);
  if (diffDays === 0) return "Сегодня";
  if (diffDays === 1) return "Завтра";
  if (diffDays === 2) return "Послезавтра";
  return null;
}
