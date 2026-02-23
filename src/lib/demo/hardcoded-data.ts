import type {
  ComponentPriceRecord,
  ExistingBookingRecord,
  OpeningHourRecord,
  ResourceScheduleRecord,
  ScheduleExceptionRecord,
  ServiceRecord,
} from "@/src/lib/domain/types";

export const demoComponentPrices: ComponentPriceRecord[] = [
  { id: "cp-1", sport: "padel", componentType: "court", tier: "morning", currency: "KZT", amount: 12000 },
  { id: "cp-2", sport: "padel", componentType: "court", tier: "day", currency: "KZT", amount: 14000 },
  { id: "cp-3", sport: "padel", componentType: "court", tier: "evening_weekend", currency: "KZT", amount: 17000 },
  { id: "cp-4", sport: "padel", componentType: "instructor", tier: "morning", currency: "KZT", amount: 9000 },
  { id: "cp-5", sport: "padel", componentType: "instructor", tier: "day", currency: "KZT", amount: 10000 },
  { id: "cp-6", sport: "padel", componentType: "instructor", tier: "evening_weekend", currency: "KZT", amount: 11000 },
  { id: "cp-7", sport: "squash", componentType: "court", tier: "morning", currency: "KZT", amount: 10000 },
  { id: "cp-8", sport: "squash", componentType: "court", tier: "day", currency: "KZT", amount: 12000 },
  { id: "cp-9", sport: "squash", componentType: "court", tier: "evening_weekend", currency: "KZT", amount: 15000 },
  { id: "cp-10", sport: "squash", componentType: "instructor", tier: "morning", currency: "KZT", amount: 7000 },
  { id: "cp-11", sport: "squash", componentType: "instructor", tier: "day", currency: "KZT", amount: 8000 },
  { id: "cp-12", sport: "squash", componentType: "instructor", tier: "evening_weekend", currency: "KZT", amount: 9000 },
];

export const demoServices: ServiceRecord[] = [
  {
    id: "padel-rental",
    name: "Аренда корта (падел)",
    sport: "padel",
    requiresCourt: true,
    requiresInstructor: false,
    active: true,
  },
  {
    id: "padel-coaching",
    name: "Тренировка с тренером (падел)",
    sport: "padel",
    requiresCourt: true,
    requiresInstructor: true,
    active: true,
  },
  {
    id: "squash-rental",
    name: "Аренда корта (сквош)",
    sport: "squash",
    requiresCourt: true,
    requiresInstructor: false,
    active: true,
  },
  {
    id: "squash-coaching",
    name: "Тренировка с тренером (сквош)",
    sport: "squash",
    requiresCourt: true,
    requiresInstructor: true,
    active: true,
  },
];

export const demoOpeningHours: OpeningHourRecord[] = [
  { dayOfWeek: 0, openTime: "08:00", closeTime: "22:00", active: true },
  { dayOfWeek: 1, openTime: "07:00", closeTime: "23:00", active: true },
  { dayOfWeek: 2, openTime: "07:00", closeTime: "23:00", active: true },
  { dayOfWeek: 3, openTime: "07:00", closeTime: "23:00", active: true },
  { dayOfWeek: 4, openTime: "07:00", closeTime: "23:00", active: true },
  { dayOfWeek: 5, openTime: "07:00", closeTime: "23:00", active: true },
  { dayOfWeek: 6, openTime: "08:00", closeTime: "22:00", active: true },
];

export const demoCourtIds = ["padel-1", "padel-2", "padel-3", "squash-1", "squash-2"];
export const demoInstructorIds = ["coach-1", "coach-2"];

export const demoInstructorSchedules: ResourceScheduleRecord[] = [
  { resourceType: "instructor", resourceId: "coach-1", dayOfWeek: 1, startTime: "09:00", endTime: "18:00", active: true },
  { resourceType: "instructor", resourceId: "coach-1", dayOfWeek: 3, startTime: "12:00", endTime: "21:00", active: true },
  { resourceType: "instructor", resourceId: "coach-2", dayOfWeek: 2, startTime: "08:00", endTime: "17:00", active: true },
  { resourceType: "instructor", resourceId: "coach-2", dayOfWeek: 4, startTime: "10:00", endTime: "20:00", active: true },
];

export const demoExceptions: ScheduleExceptionRecord[] = [
  {
    resourceType: "venue",
    resourceId: null,
    date: "2026-03-01",
    startTime: "09:00",
    endTime: "10:00",
    type: "closed",
    note: "Короткое техобслуживание",
  },
  {
    resourceType: "court",
    resourceId: "padel-1",
    date: "2026-03-01",
    startTime: "18:00",
    endTime: "20:00",
    type: "maintenance",
    note: "Покрытие",
  },
  {
    resourceType: "instructor",
    resourceId: "coach-1",
    date: "2026-03-01",
    startTime: "12:00",
    endTime: "14:00",
    type: "closed",
    note: "Турнир",
  },
];

export const demoExistingBookings: ExistingBookingRecord[] = [
  {
    id: "b-1",
    startAt: "2026-03-01T10:30:00Z",
    endAt: "2026-03-01T11:30:00Z",
    status: "confirmed",
    resourceLinks: [{ resourceType: "court", resourceId: "padel-2" }],
  },
  {
    id: "b-2",
    startAt: "2026-03-01T15:00:00Z",
    endAt: "2026-03-01T16:00:00Z",
    status: "pending_payment",
    resourceLinks: [
      { resourceType: "court", resourceId: "squash-1" },
      { resourceType: "instructor", resourceId: "coach-2" },
    ],
  },
];
