import { Prisma } from "@prisma/client";
import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

const eventCategoryLabels: Record<string, string> = {
  club_day: "Клубный день",
  group_training: "Групповая тренировка",
  tournament: "Турнир",
  kids: "Детская группа",
  corporate: "Корпоратив",
};

const eventCreateSchema = z.object({
  title: z.string().trim().min(3),
  description: z.string().trim().optional(),
  category: z.string().trim().min(1).default("group_training"),
  level: z.string().trim().optional(),
  sportId: z.string().trim().min(1),
  courtIds: z.array(z.string().trim().min(1)).min(1),
  locationId: z.string().trim().optional(),
  instructorId: z.string().trim().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  durationMin: z.coerce.number().int().min(30).max(480),
  priceKzt: z.coerce.number().int().min(0),
  capacity: z.coerce.number().int().min(1).max(200),
  recurrence: z.enum(["none", "weekly"]).default("none"),
  repeatCount: z.coerce.number().int().min(1).max(52).default(1),
  publish: z.boolean().default(true),
});

export type EventCreateInput = z.infer<typeof eventCreateSchema>;

const eventUpdateSchema = eventCreateSchema.omit({ recurrence: true, repeatCount: true, publish: true }).extend({
  eventId: z.string().trim().min(1),
  status: z.enum(["draft", "published", "cancelled"]),
});

export interface PublicEventRow {
  id: string;
  seriesId: string | null;
  title: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  level: string | null;
  startsAt: Date;
  endsAt: Date;
  priceKzt: number;
  capacity: number;
  confirmedCount: number;
  spotsLeft: number;
  status: string;
  sportName: string | null;
  courtIds: string[];
  courtNames: string[];
  locationName: string | null;
  instructorName: string | null;
  isRegistered: boolean;
  activeRegistrationId: string | null;
}

export interface PublicEventGroup {
  id: string;
  seriesId: string | null;
  isRecurring: boolean;
  title: string;
  description: string | null;
  category: string;
  categoryLabel: string;
  level: string | null;
  sportName: string | null;
  courtNames: string[];
  locationName: string | null;
  instructorName: string | null;
  startsAt: Date;
  endsAt: Date;
  priceMinKzt: number;
  priceMaxKzt: number;
  totalCapacity: number;
  totalConfirmedCount: number;
  totalSpotsLeft: number;
  occurrences: PublicEventRow[];
}

export interface AdminEventRow extends PublicEventRow {
  createdAt: Date;
  sportId: string | null;
  locationId: string | null;
  instructorId: string | null;
  participantRows: EventParticipantRow[];
}

export interface EventParticipantRow {
  registrationId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  status: string;
  pricePaidKzt: number;
  createdAt: Date;
  cancelledAt: Date | null;
}

function emptyToUndefined(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date);
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

function eventCategoryLabel(category: string): string {
  return eventCategoryLabels[category] ?? category;
}

function toDecimalAmount(amountKzt: number): Prisma.Decimal {
  return new Prisma.Decimal(amountKzt.toFixed(2));
}

function mapEventRow(
  event: {
    id: string;
    seriesId?: string | null;
    title: string;
    description: string | null;
    category: string;
    level: string | null;
    startsAt: Date;
    endsAt: Date;
    priceKzt: Prisma.Decimal;
    capacity: number;
    status: string;
    createdAt?: Date;
    sport: { name: string } | null;
    courts: Array<{ court: { id: string; name: string } }>;
    location: { name: string } | null;
    instructor: { name: string } | null;
    registrations: Array<{ id?: string; customerId: string; status: string }>;
  },
  customerId?: string,
): PublicEventRow & { seriesId?: string | null; createdAt?: Date } {
  const confirmedCount = event.registrations.filter((registration) => registration.status === "confirmed").length;
  const activeRegistration = customerId
    ? event.registrations.find(
        (registration) => registration.customerId === customerId && registration.status === "confirmed",
      )
    : null;

  return {
    id: event.id,
    seriesId: event.seriesId ?? null,
    title: event.title,
    description: event.description,
    category: event.category,
    categoryLabel: eventCategoryLabel(event.category),
    level: event.level,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    priceKzt: Number(event.priceKzt),
    capacity: event.capacity,
    confirmedCount,
    spotsLeft: Math.max(0, event.capacity - confirmedCount),
    status: event.status,
    sportName: event.sport?.name ?? null,
    courtIds: event.courts.map((row) => row.court.id),
    courtNames: event.courts.map((row) => row.court.name),
    locationName: event.location?.name ?? null,
    instructorName: event.instructor?.name ?? null,
    isRegistered: Boolean(activeRegistration),
    activeRegistrationId: activeRegistration?.id ?? null,
    createdAt: event.createdAt,
  };
}

export async function getAdminEventOptions() {
  const [sports, courts, locations, instructors] = await Promise.all([
    prisma.sport.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.court.findMany({
      where: { active: true },
      orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sportId: true,
        locationId: true,
        sport: { select: { name: true } },
        location: { select: { name: true } },
      },
    }),
    prisma.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.instructor.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        instructorSports: {
          select: { sportId: true },
        },
        instructorLocations: {
          where: { active: true },
          select: { locationId: true },
        },
      },
    }),
  ]);

  return { sports, courts, locations, instructors };
}

async function assertCourtSelection(
  tx: Prisma.TransactionClient,
  input: { sportId: string; locationId?: string; courtIds: string[] },
) {
  const courts = await tx.court.findMany({
    where: {
      id: { in: input.courtIds },
      active: true,
    },
    select: {
      id: true,
      name: true,
      sportId: true,
      locationId: true,
    },
  });

  if (courts.length !== input.courtIds.length) {
    throw new Error("Выберите действующие корты для события");
  }

  const wrongSportCourt = courts.find((court) => court.sportId !== input.sportId);
  if (wrongSportCourt) {
    throw new Error(`Корт ${wrongSportCourt.name} не относится к выбранному спорту`);
  }

  if (input.locationId) {
    const wrongLocationCourt = courts.find((court) => court.locationId !== input.locationId);
    if (wrongLocationCourt) {
      throw new Error(`Корт ${wrongLocationCourt.name} не относится к выбранной локации`);
    }
  }
}

async function assertInstructorSelection(
  tx: Prisma.TransactionClient,
  input: { sportId: string; locationId?: string; instructorId?: string },
) {
  if (!input.instructorId) return;

  const instructor = await tx.instructor.findUnique({
    where: { id: input.instructorId },
    select: {
      name: true,
      active: true,
      instructorSports: {
        where: { sportId: input.sportId },
        select: { id: true },
      },
      instructorLocations: input.locationId
        ? {
            where: { locationId: input.locationId, active: true },
            select: { id: true },
          }
        : undefined,
    },
  });

  if (!instructor || !instructor.active) {
    throw new Error("Выберите действующего тренера для события");
  }
  if (instructor.instructorSports.length === 0) {
    throw new Error(`Тренер ${instructor.name} не ведет выбранный спорт`);
  }
  if (input.locationId && instructor.instructorLocations.length === 0) {
    throw new Error(`Тренер ${instructor.name} не доступен в выбранной локации`);
  }
}

async function assertEventCourtTimeClear(
  tx: Prisma.TransactionClient,
  input: { courtIds: string[]; startsAt: Date; endsAt: Date; instructorId?: string; excludeEventId?: string },
) {
  const resourceFilters = [
    ...input.courtIds.map((courtId) => ({ resourceType: "court" as const, resourceId: courtId })),
    ...(input.instructorId ? [{ resourceType: "instructor" as const, resourceId: input.instructorId }] : []),
  ];

  const bookingConflict = await tx.booking.findFirst({
    where: {
      status: { in: ["pending_payment", "confirmed"] },
      startAt: { lt: input.endsAt },
      endAt: { gt: input.startsAt },
      resources: {
        some: {
          OR: resourceFilters,
        },
      },
    },
    select: { id: true },
  });

  if (bookingConflict) {
    throw new Error("Выбранные корты уже заняты бронированием в это время");
  }

  const holdConflict = await tx.bookingHold.findFirst({
    where: {
      status: "active",
      expiresAt: { gt: new Date() },
      startAt: { lt: input.endsAt },
      endAt: { gt: input.startsAt },
      OR: [
        { courtId: { in: input.courtIds } },
        ...(input.instructorId ? [{ instructorId: input.instructorId }] : []),
      ],
    },
    select: { id: true },
  });

  if (holdConflict) {
    throw new Error("Выбранные корты временно удерживаются другим клиентом");
  }

  const eventConflict = await tx.clubEvent.findFirst({
    where: {
      id: input.excludeEventId ? { not: input.excludeEventId } : undefined,
      status: { not: "cancelled" },
      startsAt: { lt: input.endsAt },
      endsAt: { gt: input.startsAt },
      OR: [
        {
          courts: {
            some: {
              courtId: { in: input.courtIds },
            },
          },
        },
        ...(input.instructorId ? [{ instructorId: input.instructorId }] : []),
      ],
    },
    select: { id: true },
  });

  if (eventConflict) {
    throw new Error("Выбранные корты уже заняты другим событием в это время");
  }
}

export async function getAdminEvents(): Promise<AdminEventRow[]> {
  const now = new Date();
  const events = await prisma.clubEvent.findMany({
    where: {
      startsAt: {
        gte: addDays(now, -30),
      },
    },
    orderBy: { startsAt: "asc" },
    include: {
      sport: { select: { name: true } },
      location: { select: { name: true } },
      instructor: { select: { name: true } },
      courts: {
        orderBy: { court: { name: "asc" } },
        select: {
          court: { select: { id: true, name: true } },
        },
      },
      registrations: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          customerId: true,
          status: true,
          pricePaidKzt: true,
          createdAt: true,
          cancelledAt: true,
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
        },
      },
    },
  });

  return events.map((event) => {
    const row = mapEventRow(event) as AdminEventRow;
    row.sportId = event.sportId;
    row.locationId = event.locationId;
    row.instructorId = event.instructorId;
    row.participantRows = event.registrations.map((registration) => ({
      registrationId: registration.id,
      customerId: registration.customer.id,
      customerName: registration.customer.name,
      customerEmail: registration.customer.email,
      customerPhone: registration.customer.phone,
      status: registration.status,
      pricePaidKzt: Number(registration.pricePaidKzt),
      createdAt: registration.createdAt,
      cancelledAt: registration.cancelledAt,
    }));
    return row;
  });
}

export async function getPublicEvents(customerId?: string): Promise<PublicEventRow[]> {
  const events = await prisma.clubEvent.findMany({
    where: {
      status: "published",
      startsAt: {
        gte: new Date(),
      },
    },
    orderBy: { startsAt: "asc" },
    take: 60,
    include: {
      sport: { select: { name: true } },
      location: { select: { name: true } },
      instructor: { select: { name: true } },
      courts: {
        orderBy: { court: { name: "asc" } },
        select: {
          court: { select: { id: true, name: true } },
        },
      },
      registrations: { select: { id: true, customerId: true, status: true } },
    },
  });

  return events.map((event) => mapEventRow(event, customerId));
}

export async function getPublicEventGroups(customerId?: string): Promise<PublicEventGroup[]> {
  const events = await getPublicEvents(customerId);
  const groupsByKey = new Map<string, PublicEventRow[]>();

  for (const event of events) {
    const key = event.seriesId ?? event.id;
    const group = groupsByKey.get(key);
    if (group) {
      group.push(event);
    } else {
      groupsByKey.set(key, [event]);
    }
  }

  return Array.from(groupsByKey.entries())
    .map(([key, occurrences]) => {
      const sortedOccurrences = [...occurrences].sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
      const first = sortedOccurrences[0];
      const prices = sortedOccurrences.map((event) => event.priceKzt);

      return {
        id: key,
        seriesId: first.seriesId,
        isRecurring: Boolean(first.seriesId),
        title: first.title,
        description: first.description,
        category: first.category,
        categoryLabel: first.categoryLabel,
        level: first.level,
        sportName: first.sportName,
        courtNames: first.courtNames,
        locationName: first.locationName,
        instructorName: first.instructorName,
        startsAt: first.startsAt,
        endsAt: first.endsAt,
        priceMinKzt: Math.min(...prices),
        priceMaxKzt: Math.max(...prices),
        totalCapacity: sortedOccurrences.reduce((sum, event) => sum + event.capacity, 0),
        totalConfirmedCount: sortedOccurrences.reduce((sum, event) => sum + event.confirmedCount, 0),
        totalSpotsLeft: sortedOccurrences.reduce((sum, event) => sum + event.spotsLeft, 0),
        occurrences: sortedOccurrences,
      };
    })
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
}

export async function createEventsFromForm(formData: FormData, actorUserId: string) {
  const parsed = eventCreateSchema.safeParse({
    title: formData.get("title"),
    description: emptyToUndefined(String(formData.get("description") ?? "")),
    category: formData.get("category") || "group_training",
    level: emptyToUndefined(String(formData.get("level") ?? "")),
    sportId: String(formData.get("sportId") ?? ""),
    courtIds: uniqueStrings(formData.getAll("courtIds").map((value) => String(value))),
    locationId: emptyToUndefined(String(formData.get("locationId") ?? "")),
    instructorId: emptyToUndefined(String(formData.get("instructorId") ?? "")),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMin: formData.get("durationMin"),
    priceKzt: formData.get("priceKzt"),
    capacity: formData.get("capacity"),
    recurrence: formData.get("recurrence") || "none",
    repeatCount: formData.get("repeatCount") || "1",
    publish: formData.get("publish") === "on",
  });

  if (!parsed.success) {
    throw new Error("Проверьте поля события");
  }

  const input = parsed.data;
  const instanceCount = input.recurrence === "weekly" ? input.repeatCount : 1;
  const firstStart = venueDateTimeToUtc(input.date, input.startTime);
  const durationMs = input.durationMin * 60 * 1000;
  const status = input.publish ? "published" : "draft";

  return prisma.$transaction(async (tx) => {
    await assertCourtSelection(tx, input);
    await assertInstructorSelection(tx, input);

    const series =
      input.recurrence === "weekly" && instanceCount > 1
        ? await tx.clubEventSeries.create({
            data: {
              title: input.title,
              description: input.description,
              category: input.category,
              level: input.level,
              sportId: input.sportId,
              locationId: input.locationId,
              instructorId: input.instructorId,
              recurrence: "weekly",
              createdByUserId: actorUserId,
            },
          })
        : null;

    const created = [];
    for (let index = 0; index < instanceCount; index += 1) {
      const startsAt = addDays(firstStart, index * 7);
      const endsAt = new Date(startsAt.getTime() + durationMs);
      await assertEventCourtTimeClear(tx, {
        courtIds: input.courtIds,
        startsAt,
        endsAt,
        instructorId: input.instructorId,
      });

      created.push(
        await tx.clubEvent.create({
          data: {
            seriesId: series?.id,
            title: input.title,
            description: input.description,
            category: input.category,
            level: input.level,
            sportId: input.sportId,
            locationId: input.locationId,
            instructorId: input.instructorId,
            startsAt,
            endsAt,
            priceKzt: toDecimalAmount(input.priceKzt),
            capacity: input.capacity,
            status,
            createdByUserId: actorUserId,
            courts: {
              create: input.courtIds.map((courtId) => ({ courtId })),
            },
          },
        }),
      );
    }

    return { seriesId: series?.id ?? null, count: created.length };
  });
}

export async function updateEventFromForm(formData: FormData) {
  const parsed = eventUpdateSchema.safeParse({
    eventId: formData.get("eventId"),
    title: formData.get("title"),
    description: emptyToUndefined(String(formData.get("description") ?? "")),
    category: formData.get("category") || "group_training",
    level: emptyToUndefined(String(formData.get("level") ?? "")),
    sportId: String(formData.get("sportId") ?? ""),
    courtIds: uniqueStrings(formData.getAll("courtIds").map((value) => String(value))),
    locationId: emptyToUndefined(String(formData.get("locationId") ?? "")),
    instructorId: emptyToUndefined(String(formData.get("instructorId") ?? "")),
    date: formData.get("date"),
    startTime: formData.get("startTime"),
    durationMin: formData.get("durationMin"),
    priceKzt: formData.get("priceKzt"),
    capacity: formData.get("capacity"),
    status: formData.get("status"),
  });

  if (!parsed.success) {
    throw new Error("Проверьте поля события");
  }

  const input = parsed.data;
  const startsAt = venueDateTimeToUtc(input.date, input.startTime);
  const endsAt = new Date(startsAt.getTime() + input.durationMin * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    const confirmedCount = await tx.eventRegistration.count({
      where: {
        eventId: input.eventId,
        status: "confirmed",
      },
    });

    if (input.capacity < confirmedCount) {
      throw new Error(`Лимит не может быть меньше текущего числа участников (${confirmedCount})`);
    }

    await assertCourtSelection(tx, input);
    await assertInstructorSelection(tx, input);
    if (input.status !== "cancelled") {
      await assertEventCourtTimeClear(tx, {
        courtIds: input.courtIds,
        startsAt,
        endsAt,
        instructorId: input.instructorId,
        excludeEventId: input.eventId,
      });
    }

    await tx.clubEvent.update({
      where: { id: input.eventId },
      data: {
        title: input.title,
        description: input.description,
        category: input.category,
        level: input.level,
        sportId: input.sportId,
        locationId: input.locationId,
        instructorId: input.instructorId,
        startsAt,
        endsAt,
        priceKzt: toDecimalAmount(input.priceKzt),
        capacity: input.capacity,
        status: input.status,
        courts: {
          deleteMany: {},
          create: input.courtIds.map((courtId) => ({ courtId })),
        },
      },
    });
  });
}

export async function setEventStatus(input: { eventId: string; status: "draft" | "published" | "cancelled" }) {
  if (input.status === "cancelled") {
    await cancelEventWithRefunds({ eventId: input.eventId });
    return;
  }

  await prisma.clubEvent.update({
    where: { id: input.eventId },
    data: { status: input.status },
  });
}

export async function getEventParticipants(eventId: string): Promise<EventParticipantRow[]> {
  const rows = await prisma.eventRegistration.findMany({
    where: { eventId },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      customerId: true,
      status: true,
      pricePaidKzt: true,
      createdAt: true,
      cancelledAt: true,
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    registrationId: row.id,
    customerId: row.customer.id,
    customerName: row.customer.name,
    customerEmail: row.customer.email,
    customerPhone: row.customer.phone,
    status: row.status,
    pricePaidKzt: Number(row.pricePaidKzt),
    createdAt: row.createdAt,
    cancelledAt: row.cancelledAt,
  }));
}

export class EventRegistrationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
  }
}

export async function registerCustomerForEvent(args: { eventId: string; customerId: string }) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${args.eventId}))`;

      const event = await tx.clubEvent.findUnique({
        where: { id: args.eventId },
        select: {
          id: true,
          title: true,
          startsAt: true,
          status: true,
          capacity: true,
          priceKzt: true,
        },
      });

      if (!event || event.status !== "published") {
        throw new EventRegistrationError("Событие недоступно для записи", "EVENT_UNAVAILABLE");
      }

      if (event.startsAt <= new Date()) {
        throw new EventRegistrationError("Нельзя записаться на прошедшее событие", "EVENT_IN_PAST");
      }

      const existing = await tx.eventRegistration.findUnique({
        where: {
          eventId_customerId: {
            eventId: args.eventId,
            customerId: args.customerId,
          },
        },
        select: { id: true, status: true },
      });

      if (existing?.status === "confirmed") {
        throw new EventRegistrationError("Вы уже записаны на это событие", "ALREADY_REGISTERED");
      }

      const confirmedCount = await tx.eventRegistration.count({
        where: {
          eventId: args.eventId,
          status: "confirmed",
        },
      });

      if (confirmedCount >= event.capacity) {
        throw new EventRegistrationError("Мест на событие больше нет", "EVENT_FULL");
      }

      const user = await tx.user.findUnique({
        where: { id: args.customerId },
        select: { id: true, role: true, walletBalance: true },
      });

      if (!user || user.role !== "customer") {
        throw new EventRegistrationError("Запись доступна только клиентскому аккаунту", "CUSTOMER_REQUIRED");
      }

      const priceKzt = Number(event.priceKzt);
      if (Number(user.walletBalance) < priceKzt) {
        throw new EventRegistrationError("Недостаточно средств на балансе", "INSUFFICIENT_WALLET_BALANCE");
      }

      const registration = existing
        ? await tx.eventRegistration.update({
            where: { id: existing.id },
            data: {
              status: "confirmed",
              pricePaidKzt: toDecimalAmount(priceKzt),
              cancelledAt: null,
            },
          })
        : await tx.eventRegistration.create({
            data: {
              eventId: args.eventId,
              customerId: args.customerId,
              pricePaidKzt: toDecimalAmount(priceKzt),
              status: "confirmed",
            },
          });

      if (priceKzt > 0) {
        const nextBalance = Number(user.walletBalance) - priceKzt;
        await tx.user.update({
          where: { id: args.customerId },
          data: { walletBalance: toDecimalAmount(nextBalance) },
        });

        await tx.walletTransaction.create({
          data: {
            userId: args.customerId,
            eventRegistrationId: registration.id,
            type: "event_charge",
            amount: toDecimalAmount(-priceKzt),
            balanceAfter: toDecimalAmount(nextBalance),
            currency: "KZT",
            note: `Оплата события: ${event.title}`,
            metadataJson: {
              eventId: event.id,
              eventTitle: event.title,
            },
          },
        });
      }

      return registration;
    },
    { isolationLevel: "Serializable" },
  );
}

async function cancelEventRegistrationInTx(
  tx: Prisma.TransactionClient,
  registration: {
    id: string;
    customerId: string;
    status: string;
    pricePaidKzt: Prisma.Decimal;
    event: {
      id: string;
      title: string;
    };
    walletTransactions: Array<{ type: string }>;
  },
) {
  if (registration.status !== "confirmed") {
    return { cancelled: false, refundedKzt: 0 };
  }

  const hasCharge = registration.walletTransactions.some((transaction) => transaction.type === "event_charge");
  const hasRefund = registration.walletTransactions.some((transaction) => transaction.type === "event_refund");
  const refundKzt = Number(registration.pricePaidKzt);

  await tx.eventRegistration.update({
    where: { id: registration.id },
    data: {
      status: "cancelled",
      cancelledAt: new Date(),
    },
  });

  if (hasCharge && !hasRefund && refundKzt > 0) {
    const user = await tx.user.findUnique({
      where: { id: registration.customerId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new EventRegistrationError("Пользователь не найден", "CUSTOMER_REQUIRED");
    }

    const nextBalance = Number(user.walletBalance) + refundKzt;
    await tx.user.update({
      where: { id: registration.customerId },
      data: { walletBalance: toDecimalAmount(nextBalance) },
    });

    await tx.walletTransaction.create({
      data: {
        userId: registration.customerId,
        eventRegistrationId: registration.id,
        type: "event_refund",
        amount: toDecimalAmount(refundKzt),
        balanceAfter: toDecimalAmount(nextBalance),
        currency: "KZT",
        note: `Возврат события: ${registration.event.title}`,
        metadataJson: {
          eventId: registration.event.id,
          eventTitle: registration.event.title,
        },
      },
    });
  }

  return { cancelled: true, refundedKzt: hasCharge && !hasRefund ? refundKzt : 0 };
}

export async function cancelCustomerEventRegistration(args: { eventId: string; customerId: string }) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${args.eventId}))`;

      const registration = await tx.eventRegistration.findUnique({
        where: {
          eventId_customerId: {
            eventId: args.eventId,
            customerId: args.customerId,
          },
        },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              startsAt: true,
            },
          },
          walletTransactions: {
            select: {
              type: true,
            },
          },
        },
      });

      if (!registration || registration.status !== "confirmed") {
        throw new EventRegistrationError("Активная запись на событие не найдена", "REGISTRATION_NOT_FOUND");
      }

      if (registration.event.startsAt <= new Date()) {
        throw new EventRegistrationError("Нельзя отменить запись на прошедшее событие", "EVENT_IN_PAST");
      }

      await cancelEventRegistrationInTx(tx, registration);

      return registration;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function cancelEventRegistrationByAdmin(args: { registrationId: string }) {
  return prisma.$transaction(
    async (tx) => {
      const registration = await tx.eventRegistration.findUnique({
        where: { id: args.registrationId },
        include: {
          event: {
            select: {
              id: true,
              title: true,
            },
          },
          walletTransactions: {
            select: {
              type: true,
            },
          },
        },
      });

      if (!registration) {
        throw new EventRegistrationError("Запись на событие не найдена", "REGISTRATION_NOT_FOUND");
      }

      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${registration.event.id}))`;
      await cancelEventRegistrationInTx(tx, registration);
      return registration;
    },
    { isolationLevel: "Serializable" },
  );
}

export async function cancelEventWithRefunds(args: { eventId: string }) {
  return prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${args.eventId}))`;

      const event = await tx.clubEvent.findUnique({
        where: { id: args.eventId },
        include: {
          registrations: {
            where: { status: "confirmed" },
            include: {
              event: {
                select: {
                  id: true,
                  title: true,
                },
              },
              walletTransactions: {
                select: {
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!event) {
        throw new EventRegistrationError("Событие не найдено", "EVENT_UNAVAILABLE");
      }

      let cancelledCount = 0;
      let refundedKzt = 0;
      for (const registration of event.registrations) {
        const result = await cancelEventRegistrationInTx(tx, registration);
        if (result.cancelled) {
          cancelledCount += 1;
          refundedKzt += result.refundedKzt;
        }
      }

      await tx.clubEvent.update({
        where: { id: args.eventId },
        data: { status: "cancelled" },
      });

      return { eventId: args.eventId, cancelledCount, refundedKzt };
    },
    { isolationLevel: "Serializable" },
  );
}
