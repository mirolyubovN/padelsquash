import type { Prisma, PrismaClient } from "@prisma/client";
import { buildActiveBookingHoldOverlapWhere } from "@/src/lib/bookings/holds";
import { venueDateRangeUtc } from "@/src/lib/time/venue-timezone";

type BookingAvailabilityDb = PrismaClient | Prisma.TransactionClient;

interface BookingAvailabilityService {
  id: string;
  sportId: string;
  requiresCourt: boolean;
  requiresInstructor: boolean;
}

export interface AssertBookingSlotAvailableArgs {
  tx: BookingAvailabilityDb;
  service: BookingAvailabilityService;
  locationId: string;
  date: string;
  startTime: string;
  durationMin: number;
  courtId?: string;
  instructorId?: string;
  excludeBookingId?: string;
  excludeHoldId?: string;
}

function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function getWeekStartDate(venueDate: string): Date {
  const date = new Date(`${venueDate}T12:00:00Z`);
  const day = date.getUTCDay();
  date.setUTCDate(date.getUTCDate() + (day === 0 ? -6 : 1 - day));
  return new Date(`${date.toISOString().split("T")[0]}T00:00:00Z`);
}

async function assertCourtCompatible(args: AssertBookingSlotAvailableArgs) {
  if (!args.service.requiresCourt) return;
  if (!args.courtId) {
    throw new Error("Для выбранной услуги требуется courtId");
  }

  const court = await args.tx.court.findUnique({
    where: { id: args.courtId },
    select: { active: true, sportId: true, locationId: true },
  });

  if (!court || !court.active) {
    throw new Error("Корт не найден");
  }
  if (court.sportId !== args.service.sportId) {
    throw new Error("Корт не подходит для выбранной услуги");
  }
  if (court.locationId !== args.locationId) {
    throw new Error("Корт не принадлежит выбранной локации");
  }
}

async function assertInstructorCompatible(args: AssertBookingSlotAvailableArgs) {
  if (!args.service.requiresInstructor) return;
  if (!args.instructorId) {
    throw new Error("Для выбранной услуги требуется instructorId");
  }

  const instructor = await args.tx.instructor.findUnique({
    where: { id: args.instructorId },
    select: {
      active: true,
      instructorSports: {
        where: { sportId: args.service.sportId },
        select: { id: true },
      },
      instructorLocations: {
        where: { locationId: args.locationId, active: true },
        select: { id: true },
      },
    },
  });

  if (!instructor || !instructor.active) {
    throw new Error("Тренер не найден");
  }
  if (instructor.instructorSports.length === 0) {
    throw new Error("Тренер не подходит для выбранного спорта");
  }
  if (instructor.instructorLocations.length === 0) {
    throw new Error("Тренер не доступен в выбранной локации");
  }
}

async function assertOpeningHours(args: AssertBookingSlotAvailableArgs, startMin: number, endMin: number) {
  const dayOfWeek = new Date(`${args.date}T00:00:00`).getDay();
  const openingHour = await args.tx.openingHour.findUnique({
    where: {
      locationId_dayOfWeek: {
        locationId: args.locationId,
        dayOfWeek,
      },
    },
    select: { active: true, openTime: true, closeTime: true },
  });

  if (!openingHour?.active) {
    throw new Error("Клуб закрыт в выбранный день");
  }

  const openMin = hhmmToMinutes(openingHour.openTime);
  const closeMin = hhmmToMinutes(openingHour.closeTime);
  if (startMin < openMin || endMin > closeMin) {
    throw new Error("Слот вне часов работы клуба");
  }
}

async function assertNoScheduleException(args: AssertBookingSlotAvailableArgs, startMin: number, endMin: number) {
  const { startUtc, endUtc } = venueDateRangeUtc(args.date);
  const exceptions = await args.tx.scheduleException.findMany({
    where: {
      date: { gte: startUtc, lt: endUtc },
      OR: [{ locationId: args.locationId }, { locationId: null }],
    },
    select: {
      resourceType: true,
      resourceId: true,
      startTime: true,
      endTime: true,
    },
  });

  const blocked = exceptions.some((exception) => {
    if (
      exception.resourceType !== "venue" &&
      !(exception.resourceType === "court" && exception.resourceId === args.courtId) &&
      !(exception.resourceType === "instructor" && exception.resourceId === args.instructorId)
    ) {
      return false;
    }

    return overlaps(startMin, endMin, hhmmToMinutes(exception.startTime), hhmmToMinutes(exception.endTime));
  });

  if (blocked) {
    throw new Error("Слот заблокирован в расписании");
  }
}

async function assertInstructorSchedule(args: AssertBookingSlotAvailableArgs, startMin: number, endMin: number) {
  if (!args.service.requiresInstructor || !args.instructorId) return;

  const dayOfWeek = new Date(`${args.date}T00:00:00`).getDay();
  const sportFilter = [{ sportId: args.service.sportId }, { sportId: null }];
  const weekSpecific = await args.tx.resourceSchedule.findMany({
    where: {
      active: true,
      resourceType: "instructor",
      resourceId: args.instructorId,
      weekStart: getWeekStartDate(args.date),
      dayOfWeek,
      OR: sportFilter,
    },
    select: { startTime: true, endTime: true },
  });
  const schedules =
    weekSpecific.length > 0
      ? weekSpecific
      : await args.tx.resourceSchedule.findMany({
          where: {
            active: true,
            resourceType: "instructor",
            resourceId: args.instructorId,
            weekStart: null,
            dayOfWeek,
            OR: sportFilter,
          },
          select: { startTime: true, endTime: true },
        });

  const inSchedule = schedules.some(
    (schedule) => startMin >= hhmmToMinutes(schedule.startTime) && endMin <= hhmmToMinutes(schedule.endTime),
  );

  if (!inSchedule) {
    throw new Error("Тренер недоступен по расписанию");
  }
}

async function assertNoBookingConflict(args: AssertBookingSlotAvailableArgs, startAt: Date, endAt: Date) {
  const resourceFilters = [
    ...(args.courtId ? [{ resourceType: "court" as const, resourceId: args.courtId }] : []),
    ...(args.instructorId ? [{ resourceType: "instructor" as const, resourceId: args.instructorId }] : []),
  ];

  if (resourceFilters.length === 0) return;

  const conflict = await args.tx.booking.findFirst({
    where: {
      id: args.excludeBookingId ? { not: args.excludeBookingId } : undefined,
      status: { in: ["pending_payment", "confirmed"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
      resources: {
        some: {
          OR: resourceFilters,
        },
      },
    },
    select: { id: true },
  });

  if (conflict) {
    throw new Error("Слот уже занят");
  }

  if (args.courtId) {
    const eventConflict = await args.tx.clubEvent.findFirst({
      where: {
        status: { not: "cancelled" },
        startsAt: { lt: endAt },
        endsAt: { gt: startAt },
        courts: {
          some: {
            courtId: args.courtId,
          },
        },
      },
      select: { id: true },
    });

    if (eventConflict) {
      throw new Error("Слот уже занят событием");
    }
  }
}

async function assertNoHoldConflict(args: AssertBookingSlotAvailableArgs, startAt: Date, endAt: Date) {
  if (!args.courtId && !args.instructorId) return;

  const holdConflict = await args.tx.bookingHold.findFirst({
    where: buildActiveBookingHoldOverlapWhere({
      locationId: args.locationId,
      startAt,
      endAt,
      courtId: args.courtId,
      instructorId: args.instructorId,
      excludeHoldId: args.excludeHoldId,
    }),
    select: { id: true },
  });

  if (holdConflict) {
    throw new Error("Слот уже занят");
  }
}

export async function assertBookingSlotAvailable(args: AssertBookingSlotAvailableArgs): Promise<void> {
  const startMin = hhmmToMinutes(args.startTime);
  const endMin = startMin + args.durationMin;

  await assertCourtCompatible(args);
  await assertInstructorCompatible(args);
  await assertOpeningHours(args, startMin, endMin);
  await assertNoScheduleException(args, startMin, endMin);
  await assertInstructorSchedule(args, startMin, endMin);
}

export async function assertBookingSlotConflictsClear(args: AssertBookingSlotAvailableArgs & {
  startAt: Date;
  endAt: Date;
}): Promise<void> {
  await assertNoBookingConflict(args, args.startAt, args.endAt);
  await assertNoHoldConflict(args, args.startAt, args.endAt);
}
