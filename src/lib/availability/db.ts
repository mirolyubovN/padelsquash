import { prisma } from "@/src/lib/prisma";
import type {
  ExistingBookingRecord,
  OpeningHourRecord,
  ResourceScheduleRecord,
  ScheduleExceptionRecord,
  ServiceRecord,
} from "@/src/lib/domain/types";
import { toVenueIsoDate, venueDateRangeUtc } from "@/src/lib/time/venue-timezone";

export interface AvailabilityDbContext {
  service: ServiceRecord;
  courtIds: string[];
  instructorIds: string[];
  openingHours: OpeningHourRecord[];
  instructorSchedules: ResourceScheduleRecord[];
  exceptions: ScheduleExceptionRecord[];
  existingBookings: ExistingBookingRecord[];
}

export async function getAvailabilityContextFromDb(args: {
  serviceCode: string;
  date: string;
}): Promise<AvailabilityDbContext | null> {
  const service = await prisma.service.findUnique({
    where: { code: args.serviceCode },
  });

  if (!service || !service.active) {
    return null;
  }

  const { startUtc, endUtc } = venueDateRangeUtc(args.date);

  const [openingHours, courts, instructors, instructorSchedules, exceptions, bookings] = await Promise.all([
    prisma.openingHour.findMany({ orderBy: { dayOfWeek: "asc" } }),
    prisma.court.findMany({
      where: { active: true, sport: service.sport },
      select: { id: true },
    }),
    prisma.instructor.findMany({
      where: { active: true, sport: service.sport },
      select: { id: true },
    }),
    prisma.resourceSchedule.findMany({
      where: { active: true, resourceType: "instructor" },
    }),
    prisma.scheduleException.findMany({
      where: { date: { gte: startUtc, lt: endUtc } },
    }),
    prisma.booking.findMany({
      where: {
        status: { in: ["pending_payment", "confirmed"] },
        startAt: { lt: endUtc },
        endAt: { gt: startUtc },
      },
      include: { resources: true },
    }),
  ]);

  return {
    service: {
      id: service.code,
      name: service.name,
      sport: service.sport,
      requiresCourt: service.requiresCourt,
      requiresInstructor: service.requiresInstructor,
      active: service.active,
    },
    courtIds: courts.map((row: { id: string }) => row.id),
    instructorIds: instructors.map((row: { id: string }) => row.id),
    openingHours: openingHours.map((row: { dayOfWeek: number; openTime: string; closeTime: string; active: boolean }) => ({
      dayOfWeek: row.dayOfWeek as OpeningHourRecord["dayOfWeek"],
      openTime: row.openTime,
      closeTime: row.closeTime,
      active: row.active,
    })),
    instructorSchedules: instructorSchedules.map((row: {
      resourceId: string;
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      active: boolean;
    }) => ({
      resourceType: "instructor",
      resourceId: row.resourceId,
      dayOfWeek: row.dayOfWeek as ResourceScheduleRecord["dayOfWeek"],
      startTime: row.startTime,
      endTime: row.endTime,
      active: row.active,
    })),
    exceptions: exceptions.map((row: {
      resourceType: ScheduleExceptionRecord["resourceType"];
      resourceId: string | null;
      date: Date;
      startTime: string;
      endTime: string;
      type: ScheduleExceptionRecord["type"];
      note: string | null;
    }) => ({
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      date: toVenueIsoDate(row.date),
      startTime: row.startTime,
      endTime: row.endTime,
      type: row.type,
      note: row.note ?? undefined,
    })),
    existingBookings: bookings.map((row: {
      id: string;
      startAt: Date;
      endAt: Date;
      status: ExistingBookingRecord["status"];
      resources: Array<{ resourceType: "court" | "instructor"; resourceId: string }>;
    }) => ({
      id: row.id,
      startAt: row.startAt.toISOString(),
      endAt: row.endAt.toISOString(),
      status: row.status,
      resourceLinks: row.resources.map((resource: { resourceType: "court" | "instructor"; resourceId: string }) => ({
        resourceType: resource.resourceType,
        resourceId: resource.resourceId,
      })),
    })),
  };
}
