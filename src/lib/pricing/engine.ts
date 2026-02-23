import type {
  ComponentPriceRecord,
  PriceComponentType,
  PricingTier,
  ServiceRecord,
} from "@/src/lib/domain/types";

interface PricingInput {
  service: ServiceRecord;
  bookingDate: string;
  bookingStartTime: string;
  durationMin: number;
  componentPrices: ComponentPriceRecord[];
  instructorPriceOverrideAmount?: number;
  currency?: string;
}

interface PricingBreakdownItem {
  componentType: PriceComponentType;
  tier: PricingTier;
  amount: number;
}

export interface PricingResult {
  currency: string;
  tier: PricingTier;
  courtPrice: number;
  instructorPrice: number;
  hourlyRate: number;
  total: number;
  breakdown: PricingBreakdownItem[];
}

export function evaluatePricing(input: PricingInput): PricingResult {
  if (input.durationMin !== 60) {
    throw new Error("MVP поддерживает только 60-минутные сессии.");
  }

  const currency = input.currency ?? "KZT";
  const tier = resolvePricingTier(input.bookingDate, input.bookingStartTime);
  const breakdown: PricingBreakdownItem[] = [];

  let courtPrice = 0;
  if (input.service.requiresCourt) {
    courtPrice = getComponentPrice({
      componentPrices: input.componentPrices,
      sport: input.service.sport,
      componentType: "court",
      tier,
      currency,
    });
    breakdown.push({ componentType: "court", tier, amount: courtPrice });
  }

  let instructorPrice = 0;
  if (input.service.requiresInstructor) {
    instructorPrice =
      input.instructorPriceOverrideAmount ??
      getComponentPrice({
        componentPrices: input.componentPrices,
        sport: input.service.sport,
        componentType: "instructor",
        tier,
        currency,
      });
    breakdown.push({ componentType: "instructor", tier, amount: instructorPrice });
  }

  const hourlyRate = roundMoney(courtPrice + instructorPrice);

  return {
    currency,
    tier,
    courtPrice: roundMoney(courtPrice),
    instructorPrice: roundMoney(instructorPrice),
    hourlyRate,
    total: hourlyRate,
    breakdown,
  };
}

export function resolvePricingTier(date: string, time: string): PricingTier {
  const dayOfWeek = new Date(`${date}T00:00:00`).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  if (isWeekend) {
    return "evening_weekend";
  }

  const minutes = hhmmToMinutes(time);
  if (minutes < hhmmToMinutes("12:00")) {
    return "morning";
  }
  if (minutes < hhmmToMinutes("17:00")) {
    return "day";
  }
  return "evening_weekend";
}

function getComponentPrice(args: {
  componentPrices: ComponentPriceRecord[];
  sport: ServiceRecord["sport"];
  componentType: PriceComponentType;
  tier: PricingTier;
  currency: string;
}): number {
  const record = args.componentPrices.find(
    (item) =>
      item.sport === args.sport &&
      item.componentType === args.componentType &&
      item.tier === args.tier &&
      item.currency === args.currency,
  );

  if (!record) {
    throw new Error(
      `Не найдена цена: sport=${args.sport}, component=${args.componentType}, tier=${args.tier}`,
    );
  }

  return record.amount;
}

function hhmmToMinutes(value: string): number {
  const [hh, mm] = value.split(":").map(Number);
  return hh * 60 + mm;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
