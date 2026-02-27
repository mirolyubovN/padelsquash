import type {
  ExistingBookingRecord,
  OpeningHourRecord,
  ResourceScheduleRecord,
  ScheduleExceptionRecord,
  ServiceRecord,
} from "@/src/lib/domain/types";
import { APP_TIMEZONE } from "@/src/lib/time/venue-timezone";

const ACTIVE_CONFLICT_STATUSES = new Set(["pending_payment", "confirmed"]);

export interface AvailabilityInput {
  date: string;
  durationMin: number;
  service: ServiceRecord;
  openingHours: OpeningHourRecord[];
  courtIds: string[];
  instructorIds: string[];
  instructorSchedules: ResourceScheduleRecord[];
  exceptions: ScheduleExceptionRecord[];
  existingBookings: ExistingBookingRecord[];
  requestedInstructorId?: string;
}

export interface AvailableSlot {
  startTime: string;
  endTime: string;
  availableCourtIds: string[];
  availableInstructorIds: string[];
}

export function generateAvailableSlots(input: AvailabilityInput): AvailableSlot[] {
  const date = new Date(`${input.date}T00:00:00`);
  const dayOfWeek = date.getDay();
  const venueOpening = input.openingHours.find((item) => item.dayOfWeek === dayOfWeek && item.active);

  if (!venueOpening) {
    return [];
  }

  const openingStartMin = hhmmToMinutes(venueOpening.openTime);
  const openingEndMin = hhmmToMinutes(venueOpening.closeTime);
  const exceptionList = input.exceptions.filter((exception) => exception.date === input.date);
  const results: AvailableSlot[] = [];
  const firstHourSlotStart = alignToNextHour(openingStartMin);

  for (
    let startMin = firstHourSlotStart;
    startMin + input.durationMin <= openingEndMin;
    startMin += 60
  ) {
    const endMin = startMin + input.durationMin;

    if (isBlockedByVenueException(startMin, endMin, exceptionList)) {
      continue;
    }

    const availableCourtIds = input.service.requiresCourt
      ? input.courtIds.filter((courtId) =>
          isResourceAvailable({
            date: input.date,
            dayOfWeek,
            resourceType: "court",
            resourceId: courtId,
            startMin,
            endMin,
            exceptions: exceptionList,
            existingBookings: input.existingBookings,
            requireSchedule: false,
            schedules: [],
          }),
        )
      : [];

    if (input.service.requiresCourt && availableCourtIds.length === 0) {
      continue;
    }

    const candidateInstructorIds =
      input.service.requiresInstructor && input.requestedInstructorId
        ? input.instructorIds.filter((id) => id === input.requestedInstructorId)
        : input.instructorIds;

    const availableInstructorIds = input.service.requiresInstructor
      ? candidateInstructorIds.filter((instructorId) =>
          isResourceAvailable({
            date: input.date,
            dayOfWeek,
            resourceType: "instructor",
            resourceId: instructorId,
            startMin,
            endMin,
            exceptions: exceptionList,
            existingBookings: input.existingBookings,
            requireSchedule: true,
            schedules: input.instructorSchedules,
          }),
        )
      : [];

    if (input.service.requiresInstructor && availableInstructorIds.length === 0) {
      continue;
    }

    results.push({
      startTime: minutesToHhmm(startMin),
      endTime: minutesToHhmm(endMin),
      availableCourtIds,
      availableInstructorIds,
    });
  }

  return results;
}

function alignToNextHour(value: number): number {
  if (value % 60 === 0) {
    return value;
  }
  return value + (60 - (value % 60));
}

function isResourceAvailable(args: {
  date: string;
  dayOfWeek: number;
  resourceType: "court" | "instructor";
  resourceId: string;
  startMin: number;
  endMin: number;
  exceptions: ScheduleExceptionRecord[];
  existingBookings: ExistingBookingRecord[];
  requireSchedule: boolean;
  schedules: ResourceScheduleRecord[];
}): boolean {
  if (args.requireSchedule) {
    const hasScheduleWindow = args.schedules.some((schedule) => {
      if (!schedule.active) {
        return false;
      }
      if (schedule.resourceType !== args.resourceType || schedule.resourceId !== args.resourceId) {
        return false;
      }
      if (schedule.dayOfWeek !== args.dayOfWeek) {
        return false;
      }

      const scheduleStart = hhmmToMinutes(schedule.startTime);
      const scheduleEnd = hhmmToMinutes(schedule.endTime);
      return args.startMin >= scheduleStart && args.endMin <= scheduleEnd;
    });

    if (!hasScheduleWindow) {
      return false;
    }
  }

  const blockedByException = args.exceptions.some((exception) => {
    if (exception.resourceType !== args.resourceType) {
      return false;
    }
    if (exception.resourceId !== args.resourceId) {
      return false;
    }

    return overlaps(
      args.startMin,
      args.endMin,
      hhmmToMinutes(exception.startTime),
      hhmmToMinutes(exception.endTime),
    );
  });

  if (blockedByException) {
    return false;
  }

  const blockedByBooking = args.existingBookings.some((booking) => {
    if (!ACTIVE_CONFLICT_STATUSES.has(booking.status)) {
      return false;
    }

    const usesResource = booking.resourceLinks.some(
      (resource) => resource.resourceType === args.resourceType && resource.resourceId === args.resourceId,
    );

    if (!usesResource) {
      return false;
    }

    const bookingStartMin = isoToVenueMinutes(booking.startAt);
    const bookingEndMin = isoToVenueMinutes(booking.endAt);

    return overlaps(args.startMin, args.endMin, bookingStartMin, bookingEndMin);
  });

  return !blockedByBooking;
}

function isBlockedByVenueException(
  startMin: number,
  endMin: number,
  exceptions: ScheduleExceptionRecord[],
): boolean {
  return exceptions.some((exception) => {
    if (exception.resourceType !== "venue") {
      return false;
    }

    return overlaps(
      startMin,
      endMin,
      hhmmToMinutes(exception.startTime),
      hhmmToMinutes(exception.endTime),
    );
  });
}

function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && startB < endA;
}

function hhmmToMinutes(value: string): number {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function minutesToHhmm(value: number): string {
  const hours = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const minutes = (value % 60).toString().padStart(2, "0");
  return `${hours}:${minutes}`;
}

function isoToVenueMinutes(isoValue: string): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: APP_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(isoValue));

  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}
