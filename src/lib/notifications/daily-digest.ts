import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { sendTelegramMessage } from "@/src/lib/notifications/telegram";
import { resolveCommonChatRecipient } from "@/src/lib/notifications/telegram-channels";
import {
  addVenueDays,
  formatDateInVenueTimezone,
  formatTimeInVenueTimezone,
  toVenueIsoDate,
  venueDateRangeUtc,
} from "@/src/lib/time/venue-timezone";

interface DigestBooking {
  id: string;
  startAt: Date;
  endAt: Date;
  activityLabel: string;
  customerName: string;
  sportName: string;
  courtNames: string[];
  instructorIds: string[];
  instructorNames: string[];
}

interface DigestResult {
  date: string;
  skipped: boolean;
  sessionCount: number;
  commonChatSent: boolean;
  trainerDmsSent: number;
}

function formatTimeRange(startAt: Date, endAt: Date): string {
  return `${formatTimeInVenueTimezone(startAt)}-${formatTimeInVenueTimezone(endAt)}`;
}

function formatDigestDate(date: string): string {
  return formatDateInVenueTimezone(new Date(`${date}T12:00:00Z`));
}

function buildCommonDigest(date: string, bookings: DigestBooking[]): string {
  if (bookings.length === 0) {
    return `Расписание на завтра, ${formatDigestDate(date)}\n\nАктивностей нет.`;
  }

  const byInstructor = new Map<string, { name: string; rows: DigestBooking[] }>();
  const rentals: DigestBooking[] = [];

  for (const booking of bookings) {
    if (booking.instructorIds.length === 0) {
      rentals.push(booking);
      continue;
    }

    booking.instructorIds.forEach((instructorId, index) => {
      const name = booking.instructorNames[index] ?? "Тренер";
      const group = byInstructor.get(instructorId) ?? { name, rows: [] };
      group.rows.push(booking);
      byInstructor.set(instructorId, group);
    });
  }

  const lines = [`Расписание на завтра, ${formatDigestDate(date)}`, ""];
  for (const group of Array.from(byInstructor.values()).sort((a, b) => a.name.localeCompare(b.name, "ru"))) {
    lines.push(`${group.name} - ${group.rows.length} тренировок`);
    for (const booking of group.rows) {
      lines.push(
        `  ${formatTimeRange(booking.startAt, booking.endAt)} · ${booking.courtNames.join(", ") || "Корт не указан"} · ${booking.activityLabel}`,
      );
    }
    lines.push("");
  }

  if (rentals.length > 0) {
    lines.push(`Без тренера - ${rentals.length} активностей`);
    for (const booking of rentals) {
      lines.push(`  ${formatTimeRange(booking.startAt, booking.endAt)} · ${booking.courtNames.join(", ") || "Корт не указан"} · ${booking.activityLabel}`);
    }
    lines.push("");
  }

  lines.push(`Всего: ${bookings.length} активностей`);
  return lines.join("\n").trim();
}

function buildTrainerDigest(date: string, bookings: DigestBooking[]): string {
  if (bookings.length === 0) {
    return "Завтра тренировок нет.";
  }

  return [
    `Завтра, ${formatDigestDate(date)}, у вас ${bookings.length} тренировок:`,
    ...bookings.map(
      (booking) =>
        `- ${formatTimeRange(booking.startAt, booking.endAt)} - ${booking.activityLabel} (${booking.courtNames.join(", ") || "корт не указан"}, ${booking.sportName})`,
    ),
  ].join("\n");
}

async function loadDigestBookings(date: string): Promise<DigestBooking[]> {
  const { startUtc, endUtc } = venueDateRangeUtc(date);
  const [bookings, events] = await Promise.all([
    prisma.booking.findMany({
      where: {
        status: "confirmed",
        startAt: { gte: startUtc, lt: endUtc },
      },
      orderBy: { startAt: "asc" },
      include: {
        customer: { select: { name: true } },
        service: { select: { sport: { select: { name: true } } } },
        resources: true,
      },
    }),
    prisma.clubEvent.findMany({
      where: {
        status: "published",
        startsAt: { gte: startUtc, lt: endUtc },
      },
      orderBy: { startsAt: "asc" },
      include: {
        sport: { select: { name: true } },
        courts: { select: { court: { select: { id: true, name: true } } } },
        instructor: { select: { id: true, name: true } },
        registrations: { where: { status: "confirmed" }, select: { id: true } },
      },
    }),
  ]);

  const courtIds = new Set<string>();
  const instructorIds = new Set<string>();
  for (const booking of bookings) {
    for (const resource of booking.resources) {
      if (resource.resourceType === "court") courtIds.add(resource.resourceId);
      if (resource.resourceType === "instructor") instructorIds.add(resource.resourceId);
    }
  }

  const [courts, instructors] = await Promise.all([
    courtIds.size
      ? prisma.court.findMany({ where: { id: { in: Array.from(courtIds) } }, select: { id: true, name: true } })
      : Promise.resolve([]),
    instructorIds.size
      ? prisma.instructor.findMany({ where: { id: { in: Array.from(instructorIds) } }, select: { id: true, name: true } })
      : Promise.resolve([]),
  ]);

  const courtNames = new Map(courts.map((court) => [court.id, court.name]));
  const instructorNames = new Map(instructors.map((instructor) => [instructor.id, instructor.name]));

  const bookingRows = bookings.map((booking) => {
    const rowInstructorIds = booking.resources
      .filter((resource) => resource.resourceType === "instructor")
      .map((resource) => resource.resourceId);
    return {
      id: booking.id,
      startAt: booking.startAt,
      endAt: booking.endAt,
      activityLabel: booking.customer.name,
      customerName: booking.customer.name,
      sportName: booking.service.sport.name,
      courtNames: booking.resources
        .filter((resource) => resource.resourceType === "court")
        .map((resource) => courtNames.get(resource.resourceId) ?? "Корт"),
      instructorIds: rowInstructorIds,
      instructorNames: rowInstructorIds.map((id) => instructorNames.get(id) ?? "Тренер"),
    };
  });

  const eventRows: DigestBooking[] = events.map((event) => ({
    id: event.id,
    startAt: event.startsAt,
    endAt: event.endsAt,
    activityLabel: `${event.title} (${event.registrations.length} участников)`,
    customerName: event.title,
    sportName: event.sport?.name ?? "Событие",
    courtNames: event.courts.map((row) => row.court.name),
    instructorIds: event.instructor?.id ? [event.instructor.id] : [],
    instructorNames: event.instructor?.name ? [event.instructor.name] : [],
  }));

  return [...bookingRows, ...eventRows].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
}

export async function runDailyDigest(now = new Date(), options: { force?: boolean } = {}): Promise<DigestResult> {
  const date = addVenueDays(toVenueIsoDate(now), 1);
  const dedupeKey = `daily_digest:${date}`;

  if (options.force) {
    await prisma.auditLog.deleteMany({
      where: {
        action: "notification.daily_digest",
        entityType: "system",
        entityId: dedupeKey,
      },
    });
  }

  try {
    await prisma.auditLog.create({
      data: {
        action: "notification.daily_digest",
        entityType: "system",
        entityId: dedupeKey,
        detail: {
          dedupeKey,
          date,
          forced: Boolean(options.force),
          stage: "reserved",
        },
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { date, skipped: true, sessionCount: 0, commonChatSent: false, trainerDmsSent: 0 };
    }
    throw error;
  }

  const [bookings, commonChat, subscribedTrainers] = await Promise.all([
    loadDigestBookings(date),
    resolveCommonChatRecipient(),
    prisma.user.findMany({
      where: {
        role: "trainer",
        active: true,
        telegramChatId: { not: null },
      },
      select: {
        id: true,
        name: true,
        instructorId: true,
        telegramChatId: true,
      },
    }),
  ]);

  let commonChatSent = false;
  if (commonChat) {
    const result = await sendTelegramMessage({
      chatId: commonChat.chatId,
      text: buildCommonDigest(date, bookings),
    });
    commonChatSent = result.ok;
  }

  const bookingsByInstructor = new Map<string, DigestBooking[]>();
  for (const booking of bookings) {
    for (const instructorId of booking.instructorIds) {
      const rows = bookingsByInstructor.get(instructorId) ?? [];
      rows.push(booking);
      bookingsByInstructor.set(instructorId, rows);
    }
  }

  let trainerDmsSent = 0;
  for (const trainer of subscribedTrainers) {
    if (!trainer.telegramChatId) continue;
    const rows = trainer.instructorId ? bookingsByInstructor.get(trainer.instructorId) ?? [] : [];
    if (rows.length === 0) continue;
    const result = await sendTelegramMessage({
      chatId: trainer.telegramChatId,
      text: buildTrainerDigest(date, rows),
    });
    if (result.ok) trainerDmsSent += 1;
  }

  await prisma.auditLog.updateMany({
    where: {
      action: "notification.daily_digest",
      entityType: "system",
      entityId: dedupeKey,
    },
    data: {
      detail: {
        dedupeKey,
        date,
        forced: Boolean(options.force),
        commonChatSent,
        trainerDmsSent,
        sessionCount: bookings.length,
      },
    },
  });

  return {
    date,
    skipped: false,
    sessionCount: bookings.length,
    commonChatSent,
    trainerDmsSent,
  };
}

export const __dailyDigestForTests = {
  buildCommonDigest,
  buildTrainerDigest,
};
