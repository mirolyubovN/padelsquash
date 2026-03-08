import { describe, expect, it } from "vitest";
import {
  canCustomerCancelBooking,
  getCustomerCancellationDeadline,
} from "@/src/lib/bookings/policy";
import { venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

describe("customer cancellation policy", () => {
  it("allows cancellation exactly at hours-based cutoff for non-morning slots", () => {
    const startAt = venueDateTimeToUtc("2026-03-01", "15:00");
    const now = venueDateTimeToUtc("2026-03-01", "09:00");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(true);
  });

  it("blocks cancellation inside hours-based cutoff for non-morning slots", () => {
    const startAt = venueDateTimeToUtc("2026-03-01", "15:00");
    const now = venueDateTimeToUtc("2026-03-01", "09:01");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(false);
  });

  it("allows morning-slot cancellation before midnight of previous day", () => {
    const startAt = venueDateTimeToUtc("2026-03-02", "09:00");
    const now = venueDateTimeToUtc("2026-03-01", "23:59");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(true);
  });

  it("blocks morning-slot cancellation at midnight of booking day", () => {
    const startAt = venueDateTimeToUtc("2026-03-02", "09:00");
    const now = venueDateTimeToUtc("2026-03-02", "00:00");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(false);
  });

  it("returns morning policy kind for slots in 08:00-12:00 range", () => {
    const startAt = venueDateTimeToUtc("2026-03-02", "12:00");

    expect(getCustomerCancellationDeadline(startAt, 6).policyKind).toBe("morning_previous_day_midnight");
  });
});
