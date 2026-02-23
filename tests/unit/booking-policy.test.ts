import { describe, expect, it } from "vitest";
import { canCustomerCancelBooking } from "@/src/lib/bookings/policy";

describe("customer cancellation policy", () => {
  it("allows cancellation exactly at cutoff", () => {
    const now = new Date("2026-03-01T00:00:00.000Z");
    const startAt = new Date("2026-03-01T06:00:00.000Z");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(true);
  });

  it("blocks cancellation inside cutoff window", () => {
    const now = new Date("2026-03-01T00:01:00.000Z");
    const startAt = new Date("2026-03-01T06:00:00.000Z");

    expect(canCustomerCancelBooking(startAt, now, 6)).toBe(false);
  });
});
