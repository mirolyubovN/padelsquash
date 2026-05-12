import { describe, expect, it } from "vitest";
import { applyPromoToPricing, PromoIneligibleError } from "@/src/lib/promo/apply";
import type { PromoCode } from "@prisma/client";
import type { PricingResult } from "@/src/lib/pricing/engine";
import { Decimal } from "@prisma/client/runtime/library";

function makePromo(overrides: Partial<PromoCode> = {}): PromoCode {
  return {
    id: "promo-1",
    code: "TEST10",
    description: null,
    discountType: "percent",
    discountValue: new Decimal(10),
    maxDiscountKzt: null,
    minOrderKzt: null,
    validFrom: null,
    validUntil: null,
    totalRedemptionLimit: null,
    perCustomerLimit: 1,
    appliesToServiceCodes: [],
    appliesToSportIds: [],
    firstBookingOnly: false,
    status: "active",
    createdByUserId: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

function makePricing(total: number): PricingResult {
  return {
    currency: "KZT",
    tier: "off_peak",
    courtPrice: total,
    instructorPrice: 0,
    hourlyRate: total,
    total,
    breakdown: [{ componentType: "court", tier: "off_peak", amount: total }],
  };
}

const baseContext = {
  customerId: "cust-1",
  serviceCode: "padel-court",
  sportId: "sport-1",
  existingCustomerRedemptions: 0,
  existingTotalRedemptions: 0,
  isFirstBooking: true,
  bookingDate: "2026-06-15",
};

describe("applyPromoToPricing", () => {
  it("applies percent discount correctly", () => {
    const result = applyPromoToPricing(makePricing(10000), makePromo({ discountValue: new Decimal(10) }), baseContext);
    expect(result.discountKzt).toBe(1000);
    expect(result.totalAfterDiscount).toBe(9000);
    expect(result.promoLine.componentType).toBe("promo");
    expect(result.promoLine.discountKzt).toBe(1000);
  });

  it("applies fixed discount correctly", () => {
    const result = applyPromoToPricing(
      makePricing(10000),
      makePromo({ discountType: "fixed_kzt", discountValue: new Decimal(2000) }),
      baseContext,
    );
    expect(result.discountKzt).toBe(2000);
    expect(result.totalAfterDiscount).toBe(8000);
  });

  it("caps discount at order total (no negative totals)", () => {
    const result = applyPromoToPricing(
      makePricing(500),
      makePromo({ discountType: "fixed_kzt", discountValue: new Decimal(2000) }),
      baseContext,
    );
    expect(result.discountKzt).toBe(500);
    expect(result.totalAfterDiscount).toBe(0);
  });

  it("applies percent with maxDiscountKzt cap", () => {
    const result = applyPromoToPricing(
      makePricing(100000),
      makePromo({ discountValue: new Decimal(20), maxDiscountKzt: new Decimal(5000) }),
      baseContext,
    );
    expect(result.discountKzt).toBe(5000);
    expect(result.totalAfterDiscount).toBe(95000);
  });

  it("throws inactive for paused promo", () => {
    expect(() =>
      applyPromoToPricing(makePricing(10000), makePromo({ status: "paused" }), baseContext),
    ).toThrow(PromoIneligibleError);
    try {
      applyPromoToPricing(makePricing(10000), makePromo({ status: "paused" }), baseContext);
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("inactive");
    }
  });

  it("throws inactive for archived promo", () => {
    try {
      applyPromoToPricing(makePricing(10000), makePromo({ status: "archived" }), baseContext);
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("inactive");
    }
  });

  it("throws not_started when validFrom is in the future", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ validFrom: new Date("2099-01-01") }),
        baseContext,
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("not_started");
    }
  });

  it("throws expired when bookingDate is after validUntil", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ validUntil: new Date("2020-12-31") }),
        { ...baseContext, bookingDate: "2026-06-15" },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("expired");
    }
  });

  it("throws min_order when pricing total is below minimum", () => {
    try {
      applyPromoToPricing(
        makePricing(5000),
        makePromo({ minOrderKzt: new Decimal(10000) }),
        baseContext,
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("min_order");
    }
  });

  it("throws service_excluded when serviceCode not in appliesToServiceCodes", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ appliesToServiceCodes: ["training-only"] }),
        { ...baseContext, serviceCode: "padel-court" },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("service_excluded");
    }
  });

  it("throws sport_excluded when sportId not in appliesToSportIds", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ appliesToSportIds: ["squash-sport-id"] }),
        { ...baseContext, sportId: "padel-sport-id" },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("sport_excluded");
    }
  });

  it("throws per_customer_limit when customer hit the limit", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ perCustomerLimit: 1 }),
        { ...baseContext, existingCustomerRedemptions: 1 },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("per_customer_limit");
    }
  });

  it("throws total_limit when global redemptions exhausted", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ totalRedemptionLimit: 5 }),
        { ...baseContext, existingTotalRedemptions: 5 },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("total_limit");
    }
  });

  it("throws first_booking_only for returning customer", () => {
    try {
      applyPromoToPricing(
        makePricing(10000),
        makePromo({ firstBookingOnly: true }),
        { ...baseContext, isFirstBooking: false },
      );
    } catch (e) {
      expect((e as PromoIneligibleError).code).toBe("first_booking_only");
    }
  });

  it("allows unlimited redemptions when perCustomerLimit is 0", () => {
    const result = applyPromoToPricing(
      makePricing(10000),
      makePromo({ perCustomerLimit: 0 }),
      { ...baseContext, existingCustomerRedemptions: 100 },
    );
    expect(result.discountKzt).toBe(1000);
  });

  it("passes when service is in allowlist", () => {
    const result = applyPromoToPricing(
      makePricing(10000),
      makePromo({ appliesToServiceCodes: ["padel-court"] }),
      { ...baseContext, serviceCode: "padel-court" },
    );
    expect(result.discountKzt).toBe(1000);
  });
});
