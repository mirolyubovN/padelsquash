import { afterEach, describe, expect, it } from "vitest";
import { shouldDmTrainersForEvent } from "@/src/lib/notifications/trainer-dm-policy";

describe("trainer DM policy", () => {
  afterEach(() => {
    delete process.env.TRAINER_DM_CREATE_HORIZON_HOURS;
    delete process.env.TRAINER_DM_CANCEL_HORIZON_HOURS;
  });

  const now = new Date("2026-05-10T10:00:00.000Z");

  it("does not DM for past created bookings", () => {
    expect(
      shouldDmTrainersForEvent({
        event: "created",
        bookingStartAt: new Date("2026-05-10T09:00:00.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("still DMs cancellations shortly after the booking start", () => {
    expect(
      shouldDmTrainersForEvent({
        event: "cancelled",
        bookingStartAt: new Date("2026-05-10T09:00:00.000Z"),
        now,
      }),
    ).toBe(true);
  });

  it("skips cancellations long after the booking start", () => {
    expect(
      shouldDmTrainersForEvent({
        event: "cancelled",
        bookingStartAt: new Date("2026-05-08T09:00:00.000Z"),
        now,
      }),
    ).toBe(false);
  });

  it("uses separate create and cancel horizons", () => {
    const start = new Date("2026-05-13T09:00:00.000Z");

    expect(shouldDmTrainersForEvent({ event: "created", bookingStartAt: start, now })).toBe(false);
    expect(shouldDmTrainersForEvent({ event: "cancelled", bookingStartAt: start, now })).toBe(true);
  });

  it("can disable a horizon with zero", () => {
    process.env.TRAINER_DM_CANCEL_HORIZON_HOURS = "0";

    expect(
      shouldDmTrainersForEvent({
        event: "cancelled",
        bookingStartAt: new Date("2026-05-10T11:00:00.000Z"),
        now,
      }),
    ).toBe(false);
  });
});
