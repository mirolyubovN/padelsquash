export const CUSTOMER_FREE_CANCELLATION_HOURS = Number.parseInt(
  process.env.CUSTOMER_FREE_CANCELLATION_HOURS ?? "6",
  10,
);

export function getSafeCustomerFreeCancellationHours(): number {
  if (!Number.isFinite(CUSTOMER_FREE_CANCELLATION_HOURS) || CUSTOMER_FREE_CANCELLATION_HOURS < 0) {
    return 6;
  }
  return CUSTOMER_FREE_CANCELLATION_HOURS;
}

export function canCustomerCancelBooking(
  startAtUtc: Date,
  nowUtc = new Date(),
  freeCancellationHours = getSafeCustomerFreeCancellationHours(),
): boolean {
  const diffMs = startAtUtc.getTime() - nowUtc.getTime();
  return diffMs >= freeCancellationHours * 60 * 60 * 1000;
}
