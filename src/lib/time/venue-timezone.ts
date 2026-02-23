import { fromZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Almaty";

const dateFormatter = new Intl.DateTimeFormat("ru-KZ", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat("ru-KZ", {
  timeZone: APP_TIMEZONE,
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const isoDatePartsFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function formatDateInVenueTimezone(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return dateFormatter.format(date);
}

export function formatTimeInVenueTimezone(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return timeFormatter.format(date);
}

export function isoToVenueTimezoneParts(input: Date | string): {
  date: string;
  time: string;
} {
  const date = typeof input === "string" ? new Date(input) : input;
  return {
    date: formatDateInVenueTimezone(date),
    time: formatTimeInVenueTimezone(date),
  };
}

export function toVenueIsoDate(input: Date | string): string {
  const date = typeof input === "string" ? new Date(input) : input;
  const parts = isoDatePartsFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "00";
  const day = parts.find((part) => part.type === "day")?.value ?? "00";
  return `${year}-${month}-${day}`;
}

export function venueDateTimeToUtc(date: string, time: string): Date {
  return fromZonedTime(`${date}T${time}:00`, APP_TIMEZONE);
}

export function venueDateRangeUtc(date: string): { startUtc: Date; endUtc: Date } {
  const startUtc = venueDateTimeToUtc(date, "00:00");
  const nextDate = new Date(`${date}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  const yyyy = nextDate.getUTCFullYear();
  const mm = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(nextDate.getUTCDate()).padStart(2, "0");
  const endUtc = venueDateTimeToUtc(`${yyyy}-${mm}-${dd}`, "00:00");
  return { startUtc, endUtc };
}
