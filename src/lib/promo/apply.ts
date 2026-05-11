import type { PromoCode } from "@prisma/client";
import { APP_TIMEZONE } from "@/src/lib/time/venue-timezone";
import type { PricingResult } from "@/src/lib/pricing/engine";

export type PromoIneligibleCode =
  | "not_found"
  | "inactive"
  | "expired"
  | "not_started"
  | "min_order"
  | "service_excluded"
  | "sport_excluded"
  | "per_customer_limit"
  | "total_limit"
  | "first_booking_only";

export class PromoIneligibleError extends Error {
  constructor(
    public readonly code: PromoIneligibleCode,
    message: string,
  ) {
    super(message);
    this.name = "PromoIneligibleError";
  }
}

export const PROMO_ERROR_MESSAGES: Record<PromoIneligibleCode, string> = {
  not_found: "Промокод не найден",
  inactive: "Промокод неактивен",
  expired: "Срок действия промокода истёк",
  not_started: "Промокод ещё не действует",
  min_order: "Сумма заказа меньше минимальной для промокода",
  service_excluded: "Промокод не действует на выбранную услугу",
  sport_excluded: "Промокод не действует на выбранный вид спорта",
  per_customer_limit: "Вы уже использовали этот промокод максимальное количество раз",
  total_limit: "Промокод исчерпан",
  first_booking_only: "Промокод действует только для первого бронирования",
};

export interface PromoContext {
  customerId: string;
  serviceCode: string;
  sportId: string;
  existingCustomerRedemptions: number;
  existingTotalRedemptions: number;
  isFirstBooking: boolean;
  bookingDate: string; // YYYY-MM-DD venue date
}

export interface PromoApplyResult {
  discountKzt: number;
  totalAfterDiscount: number;
  promoLine: {
    componentType: "promo";
    code: string;
    discountType: "percent" | "fixed_kzt";
    discountValue: number;
    discountKzt: number;
  };
}

function venueNow(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function applyPromoToPricing(
  pricing: PricingResult,
  promo: PromoCode,
  context: PromoContext,
): PromoApplyResult {
  const today = venueNow();

  if (promo.status !== "active") {
    throw new PromoIneligibleError("inactive", PROMO_ERROR_MESSAGES.inactive);
  }

  if (promo.validFrom) {
    const fromDate = toVenueDateString(promo.validFrom);
    if (today < fromDate) {
      throw new PromoIneligibleError("not_started", PROMO_ERROR_MESSAGES.not_started);
    }
  }

  if (promo.validUntil) {
    const untilDate = toVenueDateString(promo.validUntil);
    if (context.bookingDate > untilDate) {
      throw new PromoIneligibleError("expired", PROMO_ERROR_MESSAGES.expired);
    }
  }

  if (promo.appliesToServiceCodes.length > 0 && !promo.appliesToServiceCodes.includes(context.serviceCode)) {
    throw new PromoIneligibleError("service_excluded", PROMO_ERROR_MESSAGES.service_excluded);
  }

  if (promo.appliesToSportIds.length > 0 && !promo.appliesToSportIds.includes(context.sportId)) {
    throw new PromoIneligibleError("sport_excluded", PROMO_ERROR_MESSAGES.sport_excluded);
  }

  if (promo.minOrderKzt !== null) {
    const minOrder = Number(promo.minOrderKzt);
    if (pricing.total < minOrder) {
      throw new PromoIneligibleError("min_order", PROMO_ERROR_MESSAGES.min_order);
    }
  }

  if (promo.firstBookingOnly && !context.isFirstBooking) {
    throw new PromoIneligibleError("first_booking_only", PROMO_ERROR_MESSAGES.first_booking_only);
  }

  const perLimit = promo.perCustomerLimit ?? 1;
  if (perLimit > 0 && context.existingCustomerRedemptions >= perLimit) {
    throw new PromoIneligibleError("per_customer_limit", PROMO_ERROR_MESSAGES.per_customer_limit);
  }

  if (promo.totalRedemptionLimit !== null) {
    if (context.existingTotalRedemptions >= promo.totalRedemptionLimit) {
      throw new PromoIneligibleError("total_limit", PROMO_ERROR_MESSAGES.total_limit);
    }
  }

  const discountType = promo.discountType;
  const discountValue = Number(promo.discountValue);

  let rawDiscount: number;
  if (discountType === "percent") {
    rawDiscount = (pricing.total * discountValue) / 100;
    if (promo.maxDiscountKzt !== null) {
      rawDiscount = Math.min(rawDiscount, Number(promo.maxDiscountKzt));
    }
  } else {
    rawDiscount = discountValue;
  }

  const discountKzt = Math.min(Math.round(rawDiscount), pricing.total);
  const totalAfterDiscount = pricing.total - discountKzt;

  return {
    discountKzt,
    totalAfterDiscount,
    promoLine: {
      componentType: "promo",
      code: promo.code,
      discountType,
      discountValue,
      discountKzt,
    },
  };
}

function toVenueDateString(utcDate: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(utcDate);
}
