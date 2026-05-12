import { describe, expect, it } from "vitest";
import { evaluatePricing, resolvePricingTier } from "@/src/lib/pricing/engine";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";

const componentPrices: ComponentPriceRecord[] = [
  { id: "1", sport: "padel", componentType: "court", tier: "off_peak", currency: "KZT", amount: 12000 },
  { id: "2", sport: "padel", componentType: "court", tier: "peak", currency: "KZT", amount: 17000 },
  { id: "3", sport: "padel", componentType: "instructor", tier: "off_peak", currency: "KZT", amount: 9000 },
  { id: "4", sport: "padel", componentType: "instructor", tier: "peak", currency: "KZT", amount: 11000 },
];

const trainingService: ServiceRecord = {
  id: "padel-coaching",
  name: "Тренировка",
  sport: "padel",
  requiresCourt: true,
  requiresInstructor: true,
  active: true,
};

const courtService: ServiceRecord = {
  id: "padel-court",
  name: "Аренда корта",
  sport: "padel",
  requiresCourt: true,
  requiresInstructor: false,
  active: true,
};

describe("pricing engine", () => {
  it("resolves weekday pricing tiers", () => {
    expect(resolvePricingTier("2026-03-02", "09:00")).toBe("off_peak"); // Monday morning
    expect(resolvePricingTier("2026-03-02", "13:00")).toBe("off_peak"); // Monday midday
    expect(resolvePricingTier("2026-03-02", "17:00")).toBe("peak");     // Monday evening
    expect(resolvePricingTier("2026-03-02", "18:00")).toBe("peak");     // Monday evening
  });

  it("uses peak on weekends", () => {
    expect(resolvePricingTier("2026-03-01", "09:00")).toBe("peak"); // Sunday
    expect(resolvePricingTier("2026-03-07", "10:00")).toBe("peak"); // Saturday
  });

  it("supports instructor-specific override price", () => {
    const result = evaluatePricing({
      service: trainingService,
      bookingDate: "2026-03-02",
      bookingStartTime: "09:00",
      durationMin: 60,
      componentPrices,
      instructorPriceOverrideAmount: 12500,
      currency: "KZT",
    });

    expect(result.tier).toBe("off_peak");
    expect(result.courtPrice).toBe(12000);
    expect(result.instructorPrice).toBe(12500);
    expect(result.total).toBe(24500);
  });

  it("uses off_peak court price during weekday daytime", () => {
    const result = evaluatePricing({
      service: courtService,
      bookingDate: "2026-03-02",
      bookingStartTime: "13:00",
      durationMin: 60,
      componentPrices,
      currency: "KZT",
    });

    expect(result.tier).toBe("off_peak");
    expect(result.courtPrice).toBe(12000);
    expect(result.total).toBe(12000);
  });

  it("uses peak court price during weekday evening", () => {
    const result = evaluatePricing({
      service: courtService,
      bookingDate: "2026-03-02",
      bookingStartTime: "18:00",
      durationMin: 60,
      componentPrices,
      currency: "KZT",
    });

    expect(result.tier).toBe("peak");
    expect(result.courtPrice).toBe(17000);
    expect(result.total).toBe(17000);
  });
});
