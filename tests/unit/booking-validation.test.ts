import { describe, expect, it } from "vitest";
import { availabilityQuerySchema, createBookingSchema } from "@/src/lib/validation/booking";

describe("booking validation", () => {
  it("accepts hour-based booking start time", () => {
    const parsed = createBookingSchema.safeParse({
      serviceId: "padel-rental",
      date: "2026-03-10",
      startTime: "09:00",
      durationMin: 60,
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "+77000000000",
      },
    });

    expect(parsed.success).toBe(true);
  });

  it("rejects non-hour booking start time", () => {
    const parsed = createBookingSchema.safeParse({
      serviceId: "padel-rental",
      date: "2026-03-10",
      startTime: "09:15",
      durationMin: 60,
      customer: {
        name: "Test User",
        email: "test@example.com",
        phone: "+77000000000",
      },
    });

    expect(parsed.success).toBe(false);
  });

  it("defaults availability duration to 60 minutes", () => {
    const parsed = availabilityQuerySchema.parse({
      serviceId: "padel-rental",
      date: "2026-03-10",
    });

    expect(parsed.durationMin).toBe(60);
  });
});
