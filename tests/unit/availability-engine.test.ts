import { describe, expect, it } from "vitest";
import { generateAvailableSlots } from "@/src/lib/availability/engine";
import type {
  ExistingBookingRecord,
  OpeningHourRecord,
  ResourceScheduleRecord,
  ScheduleExceptionRecord,
  ServiceRecord,
} from "@/src/lib/domain/types";
import { venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

const openingHours: OpeningHourRecord[] = [
  { dayOfWeek: 1, openTime: "07:30", closeTime: "11:30", active: true },
];

const baseService: ServiceRecord = {
  id: "padel-rental",
  name: "Аренда корта (падел)",
  sport: "padel",
  requiresCourt: true,
  requiresInstructor: false,
  active: true,
};

describe("generateAvailableSlots", () => {
  it("generates hour-based starts only and aligns to next full hour", () => {
    const slots = generateAvailableSlots({
      date: "2026-03-02", // Monday
      durationMin: 60,
      service: baseService,
      openingHours,
      courtIds: ["court-1"],
      instructorIds: [],
      instructorSchedules: [],
      exceptions: [],
      existingBookings: [],
    });

    expect(slots.map((slot) => slot.startTime)).toEqual(["08:00", "09:00", "10:00"]);
    expect(slots.map((slot) => slot.endTime)).toEqual(["09:00", "10:00", "11:00"]);
  });

  it("keeps overlapping slot visible but marks it unavailable for booked court", () => {
    const bookings: ExistingBookingRecord[] = [
      {
        id: "b1",
        startAt: venueDateTimeToUtc("2026-03-02", "09:00").toISOString(),
        endAt: venueDateTimeToUtc("2026-03-02", "10:00").toISOString(),
        status: "confirmed",
        resourceLinks: [{ resourceType: "court", resourceId: "court-1" }],
      },
    ];

    const slots = generateAvailableSlots({
      date: "2026-03-02",
      durationMin: 60,
      service: baseService,
      openingHours: [{ dayOfWeek: 1, openTime: "08:00", closeTime: "12:00", active: true }],
      courtIds: ["court-1"],
      instructorIds: [],
      instructorSchedules: [],
      exceptions: [],
      existingBookings: bookings,
    });

    expect(slots.map((slot) => slot.startTime)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(slots.find((slot) => slot.startTime === "09:00")?.availableCourtIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "08:00")?.availableCourtIds).toEqual(["court-1"]);
    expect(slots.find((slot) => slot.startTime === "10:00")?.availableCourtIds).toEqual(["court-1"]);
  });

  it("keeps training slots visible even when instructor is unavailable", () => {
    const trainingService: ServiceRecord = {
      ...baseService,
      id: "padel-coaching",
      name: "Тренировка с тренером (падел)",
      requiresInstructor: true,
    };

    const instructorSchedules: ResourceScheduleRecord[] = [
      {
        resourceType: "instructor",
        resourceId: "coach-1",
        dayOfWeek: 1,
        startTime: "10:00",
        endTime: "12:00",
        active: true,
      },
    ];

    const slots = generateAvailableSlots({
      date: "2026-03-02",
      durationMin: 60,
      service: trainingService,
      openingHours: [{ dayOfWeek: 1, openTime: "08:00", closeTime: "12:00", active: true }],
      courtIds: ["court-1"],
      instructorIds: ["coach-1"],
      instructorSchedules,
      exceptions: [] as ScheduleExceptionRecord[],
      existingBookings: [],
    });

    expect(slots.map((slot) => slot.startTime)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(slots.find((slot) => slot.startTime === "08:00")?.availableInstructorIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "09:00")?.availableInstructorIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "10:00")?.availableInstructorIds).toEqual(["coach-1"]);
    expect(slots.find((slot) => slot.startTime === "11:00")?.availableInstructorIds).toEqual(["coach-1"]);
    expect(slots.find((slot) => slot.startTime === "08:00")?.availableCourtIds).toEqual([]);
  });

  it("keeps past cutoff slots visible but unavailable", () => {
    const slots = generateAvailableSlots({
      date: "2026-03-02",
      durationMin: 60,
      service: baseService,
      openingHours: [{ dayOfWeek: 1, openTime: "08:00", closeTime: "12:00", active: true }],
      courtIds: ["court-1"],
      instructorIds: [],
      instructorSchedules: [],
      exceptions: [],
      existingBookings: [],
      cutoffMin: 10 * 60 + 5,
    });

    expect(slots.map((slot) => slot.startTime)).toEqual(["08:00", "09:00", "10:00", "11:00"]);
    expect(slots.find((slot) => slot.startTime === "08:00")?.availableCourtIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "09:00")?.availableCourtIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "10:00")?.availableCourtIds).toEqual([]);
    expect(slots.find((slot) => slot.startTime === "11:00")?.availableCourtIds).toEqual(["court-1"]);
  });
});
