import { prisma } from "@/src/lib/prisma";
import { resolveLocationBySlug } from "@/src/lib/locations/service";
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
  location: {
    id: string;
    slug: string;
    name: string;
  };
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
  locationSlug?: string;
}): Promise<AvailabilityDbContext | null> {
  const locationSelection = await resolveLocationBySlug(args.locationSlug);
  const selectedLocation = locationSelection.selected;

  const service = await prisma.service.findUnique({
    where: { code: args.serviceCode },
    include: {
      sport: {
        select: {
          slug: true,
          name: true,
        },
      },
      location: {
        select: {
          id: true,
          slug: true,
        },
      },
    },
  });

  if (!service || !service.active) {
    return null;
  }
  if (service.locationId && service.locationId !== selectedLocation.id) {
    return null;
  }

  const { startUtc, endUtc } = venueDateRangeUtc(args.date);

  const [openingHours, courts, instructors, exceptions, bookings] = await Promise.all([
    prisma.openingHour.findMany({
      where: { locationId: selectedLocation.id },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.court.findMany({
      where: {
        active: true,
        locationId: selectedLocation.id,
        sportId: service.sportId,
      },
      select: { id: true },
    }),
    prisma.instructor.findMany({
      where: {
        active: true,
        instructorSports: {
          some: { sportId: service.sportId },
        },
        instructorLocations: {
          some: {
            locationId: selectedLocation.id,
            active: true,
          },
        },
      },
      select: { id: true },
    }),
    prisma.scheduleException.findMany({
      where: {
        date: { gte: startUtc, lt: endUtc },
        OR: [{ locationId: selectedLocation.id }, { locationId: null }],
      },
    }),
    prisma.booking.findMany({
      where: {
        locationId: selectedLocation.id,
        status: { in: ["pending_payment", "confirmed"] },
        startAt: { lt: endUtc },
        endAt: { gt: startUtc },
      },
      include: { resources: true },
    }),
  ]);

  const instructorIds = instructors.map((row: { id: string }) => row.id);
  const instructorSchedules =
    instructorIds.length > 0
      ? await prisma.resourceSchedule.findMany({
          where: {
            active: true,
            resourceType: "instructor",
            resourceId: { in: instructorIds },
          },
        })
      : [];

  return {
    service: {
      id: service.code,
      name: service.name,
      sport: service.sport.slug,
      requiresCourt: service.requiresCourt,
      requiresInstructor: service.requiresInstructor,
      active: service.active,
    },
    location: {
      id: selectedLocation.id,
      slug: selectedLocation.slug,
      name: selectedLocation.name,
    },
    courtIds: courts.map((row: { id: string }) => row.id),
    instructorIds,
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
