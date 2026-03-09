import { prisma } from "@/src/lib/prisma";
import { venueDateRangeUtc, venueDateTimeToUtc, toVenueIsoDate } from "@/src/lib/time/venue-timezone";

export interface CalendarCourt {
  id: string;
  name: string;
  sportSlug: string;
  sportName: string;
}

export interface CalendarBooking {
  id: string;
  courtId: string;
  startHour: number; // 0-23 in venue timezone
  endHour: number;
  customerName: string;
  customerPhone: string;
  serviceName: string;
  instructorName?: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
  priceTotal: number;
}

export interface CalendarException {
  id: string;
  courtId: string | null; // null = venue-level (all courts)
  startHour: number;
  endHour: number;
  type: string;
  note?: string;
}

export interface CalendarDayData {
  date: string;
  openHour: number;
  closeHour: number;
  courts: CalendarCourt[];
  bookings: CalendarBooking[];
  exceptions: CalendarException[];
}

function parseHour(hhmm: string): number {
  return parseInt(hhmm.split(":")[0], 10);
}

function utcToVenueHour(utcDate: Date): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
    hour: "numeric",
    hour12: false,
  });
  return parseInt(formatter.format(utcDate), 10);
}

export async function getCalendarDayData(date: string, locationSlug?: string): Promise<CalendarDayData> {
  // Resolve location
  let locationId: string;
  try {
    const loc = locationSlug
      ? await prisma.location.findFirst({ where: { slug: locationSlug, active: true }, select: { id: true } })
      : await prisma.location.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true } });
    locationId = loc?.id ?? "";
  } catch {
    locationId = "";
  }

  const { startUtc, endUtc } = venueDateRangeUtc(date);

  // Day of week (0=Sun, 1=Mon...) in venue timezone
  const venueDate = new Date(venueDateTimeToUtc(date, "12:00"));
  const dayOfWeek = parseInt(
    new Intl.DateTimeFormat("en-US", {
      timeZone: process.env.APP_TIMEZONE ?? "Asia/Almaty",
      weekday: "short",
    })
      .format(venueDate)
      .replace(
        /Sun|Mon|Tue|Wed|Thu|Fri|Sat/,
        (m) => String(["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(m)),
      ),
    10,
  );

  const [courts, openingHour, bookings, exceptions] = await Promise.all([
    prisma.court.findMany({
      where: { active: true, ...(locationId ? { locationId } : {}) },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sport: { select: { slug: true, name: true } },
      },
    }),
    locationId
      ? prisma.openingHour.findFirst({
          where: { locationId, dayOfWeek, active: true },
          select: { openTime: true, closeTime: true },
        })
      : null,
    prisma.booking.findMany({
      where: {
        startAt: { gte: startUtc },
        endAt: { lte: endUtc },
        status: { in: ["pending_payment", "confirmed"] },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        status: true,
        priceTotal: true,
        customer: { select: { name: true, phone: true } },
        service: { select: { name: true } },
        resources: {
          select: { resourceType: true, resourceId: true },
        },
      },
    }),
    prisma.scheduleException.findMany({
      where: {
        date: { gte: startUtc, lt: endUtc },
        resourceType: { in: ["venue", "court"] },
        ...(locationId ? { OR: [{ locationId }, { locationId: null }] } : {}),
      },
      select: {
        id: true,
        resourceType: true,
        resourceId: true,
        startTime: true,
        endTime: true,
        type: true,
        note: true,
      },
    }),
  ]);

  const openHour = openingHour ? parseHour(openingHour.openTime) : 8;
  const closeHour = openingHour ? parseHour(openingHour.closeTime) : 22;

  const calendarCourts: CalendarCourt[] = courts.map((c) => ({
    id: c.id,
    name: c.name,
    sportSlug: c.sport.slug,
    sportName: c.sport.name,
  }));

  // Build a map of instructor names for bookings
  const instructorIds = bookings
    .flatMap((b) => b.resources.filter((r) => r.resourceType === "instructor").map((r) => r.resourceId));
  const uniqueInstructorIds = Array.from(new Set(instructorIds));
  const instructorRows = uniqueInstructorIds.length > 0
    ? await prisma.instructor.findMany({
        where: { id: { in: uniqueInstructorIds } },
        select: { id: true, name: true },
      })
    : [];
  const instructorNamesById = new Map(instructorRows.map((i: { id: string; name: string }) => [i.id, i.name]));

  const calendarBookings: CalendarBooking[] = bookings.flatMap((b) => {
    const courtResource = b.resources.find((r) => r.resourceType === "court");
    if (!courtResource) return [];
    const instructorId = b.resources.find((r) => r.resourceType === "instructor")?.resourceId;
    return [{
      id: b.id,
      courtId: courtResource.resourceId,
      startHour: utcToVenueHour(b.startAt),
      endHour: utcToVenueHour(b.endAt),
      customerName: b.customer.name,
      customerPhone: b.customer.phone,
      serviceName: b.service.name,
      instructorName: instructorId ? (instructorNamesById.get(instructorId) ?? undefined) : undefined,
      status: b.status as CalendarBooking["status"],
      priceTotal: Number(b.priceTotal),
    }];
  });

  const calendarExceptions: CalendarException[] = exceptions.map((e) => ({
    id: e.id,
    courtId: e.resourceType === "venue" ? null : (e.resourceId ?? null),
    startHour: parseHour(e.startTime),
    endHour: parseHour(e.endTime),
    type: e.type,
    note: e.note ?? undefined,
  }));

  return {
    date,
    openHour,
    closeHour,
    courts: calendarCourts,
    bookings: calendarBookings,
    exceptions: calendarExceptions,
  };
}

/** Returns the ISO date (YYYY-MM-DD) of Monday of the week containing `date`. */
export function getMondayOfWeek(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  const day = d.getUTCDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // offset to Monday
  d.setUTCDate(d.getUTCDate() + diff);
  return toVenueIsoDate(d);
}

export interface CalendarWeekCell {
  date: string; // YYYY-MM-DD
  bookingCount: number;
  courtCount: number;
  /** 0=free, 1=partial, 2=full */
  occupancy: 0 | 1 | 2;
}

export interface CalendarWeekData {
  weekStart: string; // Monday
  days: CalendarWeekCell[]; // 7 items Mon-Sun
  courts: CalendarCourt[];
}

export async function getCalendarWeekData(mondayDate: string, locationSlug?: string): Promise<CalendarWeekData> {
  // Resolve location
  let locationId: string;
  try {
    const loc = locationSlug
      ? await prisma.location.findFirst({ where: { slug: locationSlug, active: true }, select: { id: true } })
      : await prisma.location.findFirst({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true } });
    locationId = loc?.id ?? "";
  } catch {
    locationId = "";
  }

  // Build the 7 date strings Mon–Sun
  const days: string[] = [];
  const base = new Date(`${mondayDate}T12:00:00Z`);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setUTCDate(base.getUTCDate() + i);
    days.push(toVenueIsoDate(d));
  }

  const weekStartUtc = venueDateRangeUtc(days[0]).startUtc;
  const weekEndUtc = venueDateRangeUtc(days[6]).endUtc;

  const [courts, bookings] = await Promise.all([
    prisma.court.findMany({
      where: { active: true, ...(locationId ? { locationId } : {}) },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, name: true, sport: { select: { slug: true, name: true } } },
    }),
    prisma.booking.findMany({
      where: {
        startAt: { gte: weekStartUtc },
        endAt: { lte: weekEndUtc },
        status: { in: ["pending_payment", "confirmed"] },
        ...(locationId ? { locationId } : {}),
      },
      select: {
        startAt: true,
        resources: { select: { resourceType: true, resourceId: true } },
      },
    }),
  ]);

  const courtCount = courts.length;
  const courtIds = new Set(courts.map((c) => c.id));

  // Count bookings per day date string
  const bookingsByDay = new Map<string, Set<string>>(); // date → Set<courtId>
  for (const b of bookings) {
    const dayStr = toVenueIsoDate(b.startAt);
    if (!bookingsByDay.has(dayStr)) bookingsByDay.set(dayStr, new Set());
    for (const r of b.resources) {
      if (r.resourceType === "court" && courtIds.has(r.resourceId)) {
        bookingsByDay.get(dayStr)!.add(r.resourceId);
      }
    }
  }

  const weekCells: CalendarWeekCell[] = days.map((date) => {
    const bookedCourts = bookingsByDay.get(date)?.size ?? 0;
    const occupancy: 0 | 1 | 2 =
      courtCount === 0 || bookedCourts === 0 ? 0 : bookedCourts >= courtCount ? 2 : 1;
    return { date, bookingCount: bookedCourts, courtCount, occupancy };
  });

  return {
    weekStart: mondayDate,
    days: weekCells,
    courts: courts.map((c) => ({ id: c.id, name: c.name, sportSlug: c.sport.slug, sportName: c.sport.name })),
  };
}

export function getAdjacentDate(date: string, delta: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return toVenueIsoDate(d);
}

export function formatCalendarDate(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00Z`);
  return d.toLocaleDateString("ru-RU", { weekday: "long", day: "numeric", month: "long" });
}
