import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { evaluatePricing } from "@/src/lib/pricing/engine";
import { applyPromoToPricing, PROMO_ERROR_MESSAGES, type PromoIneligibleCode } from "@/src/lib/promo/apply";
import { prisma } from "@/src/lib/prisma";
import { resolveLocationBySlug } from "@/src/lib/locations/service";
import type { ComponentPriceRecord, ServiceRecord } from "@/src/lib/domain/types";

export const dynamic = "force-dynamic";

const previewSchema = z.object({
  code: z.string().trim().toUpperCase().min(1),
  serviceCode: z.string().min(1),
  location: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots: z.array(z.object({ startTime: z.string().regex(/^\d{2}:\d{2}$/) })).min(1),
  instructorId: z.string().optional(),
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ ok: false, code: "not_found", message: "Не авторизован" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = previewSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, code: "not_found", message: "Некорректные данные" },
      { status: 400 },
    );
  }

  const { code, serviceCode, location, date, slots, instructorId } = parsed.data;

  const promo = await prisma.promoCode.findUnique({ where: { code } });
  if (!promo) {
    return NextResponse.json({ ok: false, code: "not_found", message: PROMO_ERROR_MESSAGES.not_found });
  }

  const service = await prisma.service.findUnique({
    where: { code: serviceCode },
    include: { sport: { select: { slug: true } } },
  });
  if (!service || !service.active) {
    return NextResponse.json({ ok: false, code: "not_found", message: "Услуга не найдена" });
  }

  const locationSelection = await resolveLocationBySlug(location);
  const selectedLocation = locationSelection.selected;

  const dbComponentPrices = await prisma.componentPrice.findMany({
    where: {
      locationId: selectedLocation.id,
      sportId: service.sportId,
      currency: "KZT",
      componentType: { in: ["court", "instructor"] },
    },
    include: { sport: { select: { slug: true } } },
  });

  const componentPrices: ComponentPriceRecord[] = dbComponentPrices.map((item) => ({
    id: item.id,
    sport: item.sport.slug,
    componentType: item.componentType,
    tier: item.period,
    currency: item.currency,
    amount: Number(item.amount),
  }));

  const serviceRecord: ServiceRecord = {
    id: service.code,
    name: service.name,
    sport: service.sport.slug,
    requiresCourt: service.requiresCourt,
    requiresInstructor: service.requiresInstructor,
    active: service.active,
  };

  let instructorPriceOverrideAmount: number | undefined;
  if (service.requiresInstructor && instructorId) {
    const instructor = await prisma.instructor.findUnique({
      where: { id: instructorId },
      select: {
        instructorSports: {
          where: { sportId: service.sportId },
          select: { pricePerHour: true },
        },
      },
    });
    instructorPriceOverrideAmount = instructor?.instructorSports[0]
      ? Number(instructor.instructorSports[0].pricePerHour)
      : undefined;
  }

  const customerId = session.user.id;

  const [customerRedemptionCount, totalRedemptionCount, existingBookingsCount] = await Promise.all([
    prisma.promoCodeRedemption.count({ where: { promoCodeId: promo.id, customerId } }),
    prisma.promoCodeRedemption.count({ where: { promoCodeId: promo.id } }),
    prisma.booking.count({ where: { customerId, status: { not: "cancelled" } } }),
  ]);

  const context = {
    customerId,
    serviceCode: service.code,
    sportId: service.sportId,
    existingCustomerRedemptions: customerRedemptionCount,
    existingTotalRedemptions: totalRedemptionCount,
    isFirstBooking: existingBookingsCount === 0,
    bookingDate: date,
  };

  let totalBase = 0;
  let totalDiscount = 0;
  const breakdown: Array<{ startTime: string; base: number; discount: number; after: number }> = [];

  for (const slot of slots) {
    const pricing = evaluatePricing({
      service: serviceRecord,
      bookingDate: date,
      bookingStartTime: slot.startTime,
      durationMin: 60,
      componentPrices,
      instructorPriceOverrideAmount,
      currency: "KZT",
    });

    try {
      const result = applyPromoToPricing(pricing, promo, context);
      totalBase += pricing.total;
      totalDiscount += result.discountKzt;
      breakdown.push({
        startTime: slot.startTime,
        base: pricing.total,
        discount: result.discountKzt,
        after: result.totalAfterDiscount,
      });
    } catch (err) {
      const promoCode = err instanceof Error && "code" in err ? (err as { code: PromoIneligibleCode }).code : "not_found";
      const message = err instanceof Error ? err.message : PROMO_ERROR_MESSAGES.not_found;
      return NextResponse.json({ ok: false, code: promoCode, message });
    }
  }

  return NextResponse.json({
    ok: true,
    discountKzt: totalDiscount,
    totalBase,
    totalAfterDiscount: totalBase - totalDiscount,
    breakdown,
  });
}
