import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts, venueDateRangeUtc } from "@/src/lib/time/venue-timezone";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { completePastConfirmedBookings } from "@/src/lib/bookings/auto-complete";

export interface TrainerEarningsRow {
  id: string;
  source: "booking" | "event";
  date: string;
  time: string;
  customerName: string;
  serviceName: string;
  grossKzt: string;
  grossRaw: number;
  amountKzt: string;
  amountRaw: number;
  clubAmountKzt: string;
  clubAmountRaw: number;
}

export interface TrainerEarningsSummary {
  totalKzt: string;
  totalRaw: number;
  clubTotalKzt: string;
  clubTotalRaw: number;
  grossTotalKzt: string;
  grossTotalRaw: number;
  sessionCount: number;
  rows: TrainerEarningsRow[];
}

export interface RevenueSummary {
  grossTotalKzt: string;
  grossTotalRaw: number;
  trainerTotalKzt: string;
  trainerTotalRaw: number;
  clubTotalKzt: string;
  clubTotalRaw: number;
}

interface PricingBreakdownItem {
  componentType?: string;
  amount?: number;
}

function getInstructorComponentAmount(value: unknown): number {
  if (!Array.isArray(value)) return 0;
  return value.reduce((sum, item: PricingBreakdownItem) => {
    if (!item || item.componentType !== "instructor") return sum;
    const amount = Number(item.amount);
    return Number.isFinite(amount) ? sum + amount : sum;
  }, 0);
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function trainerShareRate(percent?: number | null): number {
  const value = Number(percent ?? 90);
  if (!Number.isFinite(value)) return 0.9;
  return Math.min(100, Math.max(0, value)) / 100;
}

function durationHours(startAt: Date, endAt: Date): number {
  return Math.max(0, (endAt.getTime() - startAt.getTime()) / (60 * 60 * 1000));
}

export async function getTrainerEarnings(
  instructorId: string,
  dateFrom: string,
  dateTo: string,
): Promise<TrainerEarningsSummary> {
  await completePastConfirmedBookings();

  const { startUtc } = venueDateRangeUtc(dateFrom);
  const { endUtc } = venueDateRangeUtc(dateTo);

  const [bookings, events, instructor] = await Promise.all([
    prisma.booking.findMany({
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
        endAt: true,
        priceTotal: true,
        pricingBreakdownJson: true,
        customer: { select: { name: true } },
        service: { select: { name: true } },
      },
    }),
    prisma.clubEvent.findMany({
      where: {
        instructorId,
        status: "published",
        startsAt: { gte: startUtc, lt: endUtc },
        endsAt: { lt: new Date() },
      },
      orderBy: { startsAt: "desc" },
      select: {
        id: true,
        title: true,
        startsAt: true,
        endsAt: true,
        priceKzt: true,
        sportId: true,
        registrations: {
          where: { status: "confirmed" },
          select: { pricePaidKzt: true },
        },
      },
    }),
    prisma.instructor.findUnique({
      where: { id: instructorId },
      select: {
        revenueSharePercent: true,
        instructorSports: {
          select: {
            sportId: true,
            pricePerHour: true,
          },
        },
      },
    }),
  ]);

  const trainerRate = trainerShareRate(instructor?.revenueSharePercent);
  let totalRaw = 0;
  let clubTotalRaw = 0;
  let grossTotalRaw = 0;
  const rows: TrainerEarningsRow[] = bookings.map((b) => {
    const parts = isoToVenueTimezoneParts(b.startAt);
    const gross = Number(b.priceTotal);
    const instructorComponent = getInstructorComponentAmount(b.pricingBreakdownJson);
    const amount = roundMoney(instructorComponent * trainerRate);
    const clubAmount = roundMoney(gross - amount);
    totalRaw += amount;
    clubTotalRaw += clubAmount;
    grossTotalRaw += gross;
    return {
      id: b.id,
      source: "booking",
      date: parts.date,
      time: parts.time,
      customerName: b.customer.name,
      serviceName: b.service.name,
      grossKzt: formatMoneyKzt(gross),
      grossRaw: gross,
      amountKzt: formatMoneyKzt(amount),
      amountRaw: amount,
      clubAmountKzt: formatMoneyKzt(clubAmount),
      clubAmountRaw: clubAmount,
    };
  });

  for (const event of events) {
    const parts = isoToVenueTimezoneParts(event.startsAt);
    const hourlyRate = Number(
      instructor?.instructorSports.find((item) => item.sportId === event.sportId)?.pricePerHour ?? 0,
    );
    const gross = event.registrations.reduce((sum, registration) => sum + Number(registration.pricePaidKzt), 0);
    const amount = roundMoney(hourlyRate * durationHours(event.startsAt, event.endsAt) * trainerRate);
    const clubAmount = roundMoney(gross - amount);
    totalRaw += amount;
    clubTotalRaw += clubAmount;
    grossTotalRaw += gross;
    rows.push({
      id: event.id,
      source: "event",
      date: parts.date,
      time: parts.time,
      customerName: "Событие",
      serviceName: event.title,
      grossKzt: formatMoneyKzt(gross),
      grossRaw: gross,
      amountKzt: formatMoneyKzt(amount),
      amountRaw: amount,
      clubAmountKzt: formatMoneyKzt(clubAmount),
      clubAmountRaw: clubAmount,
    });
  }

  rows.sort((a, b) => `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`));

  return {
    totalKzt: formatMoneyKzt(totalRaw),
    totalRaw,
    clubTotalKzt: formatMoneyKzt(clubTotalRaw),
    clubTotalRaw,
    grossTotalKzt: formatMoneyKzt(grossTotalRaw),
    grossTotalRaw,
    sessionCount: rows.length,
    rows,
  };
}

export async function getRevenueSummary(dateFrom: string, dateTo: string): Promise<RevenueSummary> {
  await completePastConfirmedBookings();

  const { startUtc } = venueDateRangeUtc(dateFrom);
  const { endUtc } = venueDateRangeUtc(dateTo);

  const [bookings, events] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "completed",
        startAt: { gte: startUtc, lt: endUtc },
      },
      select: {
        priceTotal: true,
        pricingBreakdownJson: true,
        resources: {
          where: { resourceType: "instructor" },
          select: { resourceId: true },
        },
      },
    }),
    prisma.clubEvent.findMany({
      where: {
        instructorId: { not: null },
        status: "published",
        startsAt: { gte: startUtc, lt: endUtc },
        endsAt: { lt: new Date() },
      },
      select: {
        startsAt: true,
        endsAt: true,
        instructorId: true,
        sportId: true,
        registrations: {
          where: { status: "confirmed" },
          select: { pricePaidKzt: true },
        },
        instructor: {
          select: {
            revenueSharePercent: true,
            instructorSports: {
              select: {
                sportId: true,
                pricePerHour: true,
              },
            },
          },
        },
      },
    }),
  ]);

  const bookingInstructorIds = Array.from(
    new Set(bookings.flatMap((booking) => booking.resources.map((resource) => resource.resourceId))),
  );
  const bookingInstructorShares =
    bookingInstructorIds.length > 0
      ? await prisma.instructor.findMany({
          where: { id: { in: bookingInstructorIds } },
          select: { id: true, revenueSharePercent: true },
        })
      : [];
  const trainerRateByInstructorId = new Map(
    bookingInstructorShares.map((instructor) => [instructor.id, trainerShareRate(instructor.revenueSharePercent)]),
  );

  let grossTotalRaw = 0;
  let trainerTotalRaw = 0;

  for (const booking of bookings) {
    const gross = Number(booking.priceTotal);
    grossTotalRaw += gross;
    if (booking.resources.length > 0) {
      const trainerRate = trainerRateByInstructorId.get(booking.resources[0].resourceId) ?? 0.9;
      trainerTotalRaw += roundMoney(getInstructorComponentAmount(booking.pricingBreakdownJson) * trainerRate);
    }
  }

  for (const event of events) {
    const gross = event.registrations.reduce((sum, registration) => sum + Number(registration.pricePaidKzt), 0);
    const hourlyRate = Number(
      event.instructor?.instructorSports.find((item) => item.sportId === event.sportId)?.pricePerHour ?? 0,
    );
    grossTotalRaw += gross;
    trainerTotalRaw += roundMoney(
      hourlyRate * durationHours(event.startsAt, event.endsAt) * trainerShareRate(event.instructor?.revenueSharePercent),
    );
  }

  const clubTotalRaw = roundMoney(grossTotalRaw - trainerTotalRaw);
  trainerTotalRaw = roundMoney(trainerTotalRaw);
  grossTotalRaw = roundMoney(grossTotalRaw);

  return {
    grossTotalKzt: formatMoneyKzt(grossTotalRaw),
    grossTotalRaw,
    trainerTotalKzt: formatMoneyKzt(trainerTotalRaw),
    trainerTotalRaw,
    clubTotalKzt: formatMoneyKzt(clubTotalRaw),
    clubTotalRaw,
  };
}
