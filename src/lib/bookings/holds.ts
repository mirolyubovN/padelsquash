import { Prisma } from "@prisma/client";
import type { BookingHold, BookingHoldStatus, PrismaClient } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export const DEFAULT_BOOKING_HOLD_TTL_MINUTES = 10;

type HoldDbClient = PrismaClient | Prisma.TransactionClient;

export interface CreateBookingHoldArgs {
  customerId: string;
  serviceId: string;
  locationId: string;
  startAt: Date;
  endAt: Date;
  amountRequiredKzt: number;
  pricingBreakdownJson: Prisma.InputJsonValue;
  courtId?: string;
  instructorId?: string;
  holdTtlMinutes?: number;
}

function toDecimalAmount(amountKzt: number): Prisma.Decimal {
  return new Prisma.Decimal(amountKzt.toFixed(2));
}

export function getBookingHoldExpiresAt(
  holdTtlMinutes = DEFAULT_BOOKING_HOLD_TTL_MINUTES,
  now = new Date(),
): Date {
  return new Date(now.getTime() + holdTtlMinutes * 60 * 1000);
}

export async function createBookingHold(
  args: CreateBookingHoldArgs,
  tx: HoldDbClient = prisma,
): Promise<BookingHold> {
  return tx.bookingHold.create({
    data: {
      customerId: args.customerId,
      serviceId: args.serviceId,
      locationId: args.locationId,
      courtId: args.courtId,
      instructorId: args.instructorId,
      startAt: args.startAt,
      endAt: args.endAt,
      amountRequired: toDecimalAmount(args.amountRequiredKzt),
      currency: "KZT",
      pricingBreakdownJson: args.pricingBreakdownJson,
      expiresAt: getBookingHoldExpiresAt(args.holdTtlMinutes),
    },
  });
}

export async function expireStaleBookingHolds(tx: HoldDbClient = prisma): Promise<number> {
  const result = await tx.bookingHold.updateMany({
    where: {
      status: "active",
      expiresAt: { lt: new Date() },
    },
    data: { status: "expired" },
  });

  return result.count;
}

export async function getActiveBookingHoldById(args: {
  holdId: string;
  customerId: string;
  tx?: HoldDbClient;
}): Promise<BookingHold | null> {
  return (args.tx ?? prisma).bookingHold.findFirst({
    where: {
      id: args.holdId,
      customerId: args.customerId,
      status: "active",
      expiresAt: { gt: new Date() },
    },
  });
}

export async function markBookingHoldStatus(args: {
  holdId: string;
  status: Exclude<BookingHoldStatus, "active">;
  convertedBookingId?: string;
  tx?: HoldDbClient;
}): Promise<BookingHold> {
  return (args.tx ?? prisma).bookingHold.update({
    where: { id: args.holdId },
    data: {
      status: args.status,
      convertedBookingId: args.convertedBookingId,
    },
  });
}

export function buildActiveBookingHoldOverlapWhere(args: {
  locationId: string;
  startAt: Date;
  endAt: Date;
  courtId?: string;
  instructorId?: string;
  excludeHoldId?: string;
}): Prisma.BookingHoldWhereInput {
  return {
    locationId: args.locationId,
    status: "active",
    expiresAt: { gt: new Date() },
    id: args.excludeHoldId ? { not: args.excludeHoldId } : undefined,
    startAt: { lt: args.endAt },
    endAt: { gt: args.startAt },
    OR: [
      ...(args.courtId ? [{ courtId: args.courtId }] : []),
      ...(args.instructorId ? [{ instructorId: args.instructorId }] : []),
    ],
  };
}
