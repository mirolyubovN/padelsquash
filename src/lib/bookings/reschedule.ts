import { prisma } from "@/src/lib/prisma";
import { withBookingConcurrencyGuard } from "@/src/lib/bookings/concurrency";
import { evaluatePricing } from "@/src/lib/pricing/engine";
import { creditUserWallet, debitUserWallet } from "@/src/lib/wallet/service";
import { logAuditEvent } from "@/src/lib/audit/log";
import { venueDateTimeToUtc, toVenueIsoDate } from "@/src/lib/time/venue-timezone";
import type { Prisma } from "@prisma/client";

export interface RescheduleBookingArgs {
  bookingId: string;
  newDate: string;
  newStartTime: string; // HH:MM
  newCourtId?: string;
  actorUserId?: string;
}

export interface RescheduleBookingResult {
  bookingId: string;
  oldDate: string;
  newDate: string;
  priceDiff: number; // positive = charged extra, negative = refunded
  newTotal: number;
}

export async function rescheduleBooking(args: RescheduleBookingArgs): Promise<RescheduleBookingResult> {
  const booking = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      customerId: true,
      serviceId: true,
      locationId: true,
      startAt: true,
      endAt: true,
      status: true,
      priceTotal: true,
      currency: true,
      pricingBreakdownJson: true,
      resources: { select: { id: true, resourceType: true, resourceId: true } },
      service: {
        select: {
          id: true,
          code: true,
          requiresCourt: true,
          requiresInstructor: true,
          sport: { select: { slug: true } },
        },
      },
      payment: { select: { id: true, status: true } },
      walletTransactions: {
        where: { type: { in: ["booking_charge", "booking_refund"] } },
        select: { type: true },
      },
    },
  });

  if (!booking) throw new Error("Бронирование не найдено");
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show") {
    throw new Error("Невозможно перенести бронирование в данном статусе");
  }

  const durationMin = Math.round(
    (booking.endAt.getTime() - booking.startAt.getTime()) / 60000,
  );

  const newStartAt = venueDateTimeToUtc(args.newDate, args.newStartTime);
  const newEndAt = new Date(newStartAt.getTime() + durationMin * 60000);

  const oldDate = toVenueIsoDate(booking.startAt);

  // Determine court for the new slot
  const existingCourtResource = booking.resources.find((r) => r.resourceType === "court");
  const newCourtId = args.newCourtId ?? existingCourtResource?.resourceId;

  const instructorResource = booking.resources.find((r) => r.resourceType === "instructor");

  // Build resource locks
  const resourceLocks = [
    ...(newCourtId ? [{ resourceType: "court" as const, resourceId: newCourtId }] : []),
    ...(instructorResource ? [{ resourceType: "instructor" as const, resourceId: instructorResource.resourceId }] : []),
  ];

  return withBookingConcurrencyGuard({
    prisma,
    resourceLocks,
    run: async (tx) => {
      const typedTx = tx as Prisma.TransactionClient;

      // Check court conflict (excluding this booking)
      if (newCourtId) {
        const conflict = await typedTx.booking.findFirst({
          where: {
            id: { not: args.bookingId },
            status: { in: ["confirmed", "pending_payment"] },
            resources: { some: { resourceType: "court", resourceId: newCourtId } },
            startAt: { lt: newEndAt },
            endAt: { gt: newStartAt },
          },
          select: { id: true },
        });
        if (conflict) {
          throw new Error("Выбранный корт уже занят в это время");
        }
      }

      // Check instructor conflict (excluding this booking)
      if (instructorResource) {
        const instructorConflict = await typedTx.booking.findFirst({
          where: {
            id: { not: args.bookingId },
            status: { in: ["confirmed", "pending_payment"] },
            resources: { some: { resourceType: "instructor", resourceId: instructorResource.resourceId } },
            startAt: { lt: newEndAt },
            endAt: { gt: newStartAt },
          },
          select: { id: true },
        });
        if (instructorConflict) {
          throw new Error("Тренер уже занят в это время");
        }
      }

      // Recalculate pricing for the new time slot
      const componentPrices = await typedTx.componentPrice.findMany({
        where: { locationId: booking.locationId, sport: { slug: booking.service.sport.slug } },
        select: {
          componentType: true,
          period: true,
          amount: true,
          currency: true,
          sport: { select: { slug: true } },
          location: { select: { id: true } },
        },
      });

      // Fetch instructor price if needed
      let instructorPriceOverride: number | undefined;
      if (instructorResource && booking.service.requiresInstructor) {
        const instrSport = await typedTx.instructorSport.findFirst({
          where: { instructorId: instructorResource.resourceId, sport: { slug: booking.service.sport.slug } },
          select: { pricePerHour: true },
        });
        instructorPriceOverride = instrSport ? Number(instrSport.pricePerHour) : undefined;
      }

      const newPricing = evaluatePricing({
        service: {
          id: booking.service.id,
          name: booking.service.code,
          sport: booking.service.sport.slug,
          requiresCourt: booking.service.requiresCourt,
          requiresInstructor: booking.service.requiresInstructor,
          active: true,
        },
        bookingDate: args.newDate,
        bookingStartTime: args.newStartTime,
        durationMin,
        componentPrices: componentPrices.map((cp) => ({
          id: `${cp.location.id}:${cp.componentType}`,
          sport: cp.sport.slug,
          componentType: cp.componentType,
          tier: cp.period as import("@/src/lib/domain/types").PricingTier,
          amount: Number(cp.amount),
          currency: cp.currency,
        })),
        instructorPriceOverrideAmount: instructorPriceOverride,
        currency: booking.currency,
      });

      const oldTotal = Number(booking.priceTotal);
      const newTotal = newPricing.total;
      const priceDiff = newTotal - oldTotal;

      // Adjust wallet if payment was made via wallet
      const hasWalletCharge = booking.walletTransactions.some((t) => t.type === "booking_charge");
      if (hasWalletCharge && priceDiff !== 0) {
        if (priceDiff > 0) {
          // Charge extra
          await debitUserWallet({
            tx: typedTx,
            userId: booking.customerId,
            amountKzt: priceDiff,
            type: "booking_charge",
            bookingId: booking.id,
            note: "Доплата при переносе бронирования",
            metadataJson: { source: "reschedule" },
          });
        } else {
          // Refund diff
          await creditUserWallet({
            tx: typedTx,
            userId: booking.customerId,
            amountKzt: Math.abs(priceDiff),
            type: "booking_refund",
            bookingId: booking.id,
            note: "Возврат разницы при переносе бронирования",
            metadataJson: { source: "reschedule" },
          });
        }
      }

      // Update booking dates and price
      await typedTx.booking.update({
        where: { id: booking.id },
        data: {
          startAt: newStartAt,
          endAt: newEndAt,
          priceTotal: newTotal,
          pricingBreakdownJson: newPricing.breakdown as unknown as Prisma.InputJsonValue,
        },
      });

      // Update court resource if changed
      if (newCourtId && existingCourtResource && newCourtId !== existingCourtResource.resourceId) {
        await typedTx.bookingResource.update({
          where: { id: existingCourtResource.id },
          data: { resourceId: newCourtId },
        });
      }

      return {
        bookingId: booking.id,
        oldDate,
        newDate: args.newDate,
        priceDiff,
        newTotal,
      };
    },
  });
}
