import { formatTimeInVenueTimezone, toVenueIsoDate, venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

export const CUSTOMER_FREE_CANCELLATION_HOURS = Number.parseInt(
  process.env.CUSTOMER_FREE_CANCELLATION_HOURS ?? "6",
  10,
);

export const MORNING_CANCELLATION_START_HOUR = Number.parseInt(
  process.env.CUSTOMER_MORNING_CANCELLATION_START_HOUR ?? "8",
  10,
);

export const MORNING_CANCELLATION_END_HOUR = Number.parseInt(
  process.env.CUSTOMER_MORNING_CANCELLATION_END_HOUR ?? "12",
  10,
);

export type CustomerCancellationPolicyKind = "morning_previous_day_midnight" | "hours_before_start";

export function getSafeCustomerFreeCancellationHours(): number {
  if (!Number.isFinite(CUSTOMER_FREE_CANCELLATION_HOURS) || CUSTOMER_FREE_CANCELLATION_HOURS < 0) {
    return 6;
  }
  return CUSTOMER_FREE_CANCELLATION_HOURS;
}

function getSafeMorningStartHour(): number {
  if (!Number.isFinite(MORNING_CANCELLATION_START_HOUR) || MORNING_CANCELLATION_START_HOUR < 0) {
    return 8;
  }
  return MORNING_CANCELLATION_START_HOUR;
}

function getSafeMorningEndHour(): number {
  if (!Number.isFinite(MORNING_CANCELLATION_END_HOUR) || MORNING_CANCELLATION_END_HOUR > 23) {
    return 12;
  }
  return MORNING_CANCELLATION_END_HOUR;
}

function getVenueHour(date: Date): number {
  const hourText = formatTimeInVenueTimezone(date).slice(0, 2);
  const parsed = Number.parseInt(hourText, 10);
  if (Number.isFinite(parsed)) {
    return parsed;
  }
  return 0;
}

function isMorningSlot(startAtUtc: Date): boolean {
  const hour = getVenueHour(startAtUtc);
  const startHour = getSafeMorningStartHour();
  const endHour = getSafeMorningEndHour();
  return hour >= startHour && hour <= endHour;
}

export function getMorningCancellationWindowLabel(): string {
  const start = String(getSafeMorningStartHour()).padStart(2, "0");
  const end = String(getSafeMorningEndHour()).padStart(2, "0");
  return `${start}:00-${end}:00`;
}

export function getCustomerCancellationDeadline(
  startAtUtc: Date,
  freeCancellationHours = getSafeCustomerFreeCancellationHours(),
): {
  deadlineUtc: Date;
  policyKind: CustomerCancellationPolicyKind;
} {
  if (isMorningSlot(startAtUtc)) {
    const bookingDate = toVenueIsoDate(startAtUtc);
    return {
      deadlineUtc: venueDateTimeToUtc(bookingDate, "00:00"),
      policyKind: "morning_previous_day_midnight",
    };
  }

  return {
    deadlineUtc: new Date(startAtUtc.getTime() - freeCancellationHours * 60 * 60 * 1000),
    policyKind: "hours_before_start",
  };
}

export function getCustomerCancellationPolicySummary(
  freeCancellationHours = getSafeCustomerFreeCancellationHours(),
): string {
  return `Для слотов ${getMorningCancellationWindowLabel()} отмена доступна только до 00:00 предыдущего дня. Для остальных слотов — минимум за ${freeCancellationHours} часов до начала.`;
}

export function canCustomerCancelBooking(
  startAtUtc: Date,
  nowUtc = new Date(),
  freeCancellationHours = getSafeCustomerFreeCancellationHours(),
): boolean {
  const { deadlineUtc, policyKind } = getCustomerCancellationDeadline(startAtUtc, freeCancellationHours);

  if (policyKind === "morning_previous_day_midnight") {
    return nowUtc.getTime() < deadlineUtc.getTime();
  }

  return nowUtc.getTime() <= deadlineUtc.getTime();
}
