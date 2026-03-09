import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts, venueDateRangeUtc } from "@/src/lib/time/venue-timezone";
import { formatMoneyKzt } from "@/src/lib/format/money";

export interface TrainerEarningsRow {
  bookingId: string;
  date: string;
  time: string;
  customerName: string;
  serviceName: string;
  amountKzt: string;
  amountRaw: number;
}

export interface TrainerEarningsSummary {
  totalKzt: string;
  totalRaw: number;
  sessionCount: number;
  rows: TrainerEarningsRow[];
}

export async function getTrainerEarnings(
  instructorId: string,
  dateFrom: string,
  dateTo: string,
): Promise<TrainerEarningsSummary> {
  const { startUtc } = venueDateRangeUtc(dateFrom);
  const { endUtc } = venueDateRangeUtc(dateTo);

  const bookings = await prisma.booking.findMany({
    where: {
      status: "completed",
      resources: {
        some: { resourceType: "instructor", resourceId: instructorId },
      },
      startAt: {
        gte: startUtc,
        lt: endUtc,
      },
    },
    orderBy: { startAt: "desc" },
    select: {
      id: true,
      startAt: true,
      priceTotal: true,
      customer: { select: { name: true } },
      service: { select: { name: true } },
    },
  });

  let totalRaw = 0;
  const rows: TrainerEarningsRow[] = bookings.map((b) => {
    const parts = isoToVenueTimezoneParts(b.startAt);
    const amount = Number(b.priceTotal);
    totalRaw += amount;
    return {
      bookingId: b.id,
      date: parts.date,
      time: parts.time,
      customerName: b.customer.name,
      serviceName: b.service.name,
      amountKzt: formatMoneyKzt(amount),
      amountRaw: amount,
    };
  });

  return {
    totalKzt: formatMoneyKzt(totalRaw),
    totalRaw,
    sessionCount: rows.length,
    rows,
  };
}
