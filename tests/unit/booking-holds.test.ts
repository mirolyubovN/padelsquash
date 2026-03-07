import { describe, expect, it } from "vitest";
import {
  buildActiveBookingHoldOverlapWhere,
  DEFAULT_BOOKING_HOLD_TTL_MINUTES,
  getBookingHoldExpiresAt,
} from "@/src/lib/bookings/holds";

describe("booking hold helpers", () => {
  it("uses a 10 minute default expiry window", () => {
    const now = new Date("2026-03-07T10:00:00.000Z");
    const expiresAt = getBookingHoldExpiresAt(DEFAULT_BOOKING_HOLD_TTL_MINUTES, now);

    expect(expiresAt.toISOString()).toBe("2026-03-07T10:10:00.000Z");
  });

  it("builds an overlap filter for the reserved resources", () => {
    const where = buildActiveBookingHoldOverlapWhere({
      locationId: "loc-1",
      startAt: new Date("2026-03-07T09:00:00.000Z"),
      endAt: new Date("2026-03-07T10:00:00.000Z"),
      courtId: "court-1",
      instructorId: "coach-1",
      excludeHoldId: "hold-1",
    });

    expect(where).toMatchObject({
      locationId: "loc-1",
      status: "active",
      id: { not: "hold-1" },
      OR: [{ courtId: "court-1" }, { instructorId: "coach-1" }],
    });
  });
});
