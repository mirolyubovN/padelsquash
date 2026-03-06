import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { getDefaultLocation } from "@/src/lib/locations/service";
import { WEEKDAY_LABELS } from "@/src/lib/settings/service";
import {
  formatDateInVenueTimezone,
  formatTimeInVenueTimezone,
  toVenueIsoDate,
  venueDateTimeToUtc,
} from "@/src/lib/time/venue-timezone";

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "Время должно быть в формате HH:MM");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD");
const exceptionTypeSchema = z.enum(["closed", "maintenance"]);
const resourceTypeSchema = z.enum(["venue", "court", "instructor"]);

const nonEmptyString = (label: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `${label} обязателен`));

const optionalTrimmedString = z
  .string()
  .optional()
  .transform((value) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : undefined;
  });

const sportIdSchema = nonEmptyString("sportId");
const sportSlugSchema = nonEmptyString("Slug")
  .transform((value) => value.toLowerCase())
  .pipe(z.string().regex(/^[a-z0-9-]+$/, "Slug может содержать только a-z, 0-9 и дефис"));

function resolveSportLabel(slug: string, name?: string | null): string {
  return name?.trim() || SPORT_LABELS[slug] || slug;
}

export const SPORT_LABELS: Record<string, string> = {
  padel: "Падел",
  squash: "Сквош",
};

export const EXCEPTION_TYPE_LABELS: Record<"closed" | "maintenance", string> = {
  closed: "Закрыто",
  maintenance: "Тех. обслуживание",
};

export const RESOURCE_TYPE_LABELS: Record<"venue" | "court" | "instructor", string> = {
  venue: "Площадка (весь клуб)",
  court: "Корт",
  instructor: "Тренер",
};

export interface AdminCourtRow {
  id: string;
  name: string;
  sportId: string;
  sportSlug: string;
  sportName: string;
  active: boolean;
  notes?: string;
}

export interface AdminInstructorRow {
  id: string;
  name: string;
  sports: Array<{ sportId: string; slug: string; name: string; pricePerHour: number }>;
  bio?: string;
  photoUrl?: string;
  active: boolean;
}

export interface AdminServiceRow {
  id: string;
  code: string;
  name: string;
  sportId: string;
  sportSlug: string;
  sportName: string;
  requiresCourt: boolean;
  requiresInstructor: boolean;
  active: boolean;
}

export interface AdminSportOption {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  sortOrder: number;
}

export interface AdminSportRow extends AdminSportOption {
  icon?: string;
}

export interface AdminScheduleRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
  sportId?: string;
  sportName?: string;
}

export interface AdminExceptionRow {
  id: string;
  resourceType: "venue" | "court" | "instructor";
  resourceId: string | null;
  resourceLabel: string;
  date: string;
  startTime: string;
  endTime: string;
  type: "closed" | "maintenance";
  note?: string;
}

export interface AdminInstructorSessionRow {
  id: string;
  date: string;
  time: string;
  serviceName: string;
  customerName: string;
  customerEmail: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
  priceTotal: number;
  courtLabel?: string;
}

export interface ExceptionTargetOption {
  value: string;
  label: string;
}

function assertTimeRange(startTime: string, endTime: string) {
  if (startTime >= endTime) {
    throw new Error("Время начала должно быть раньше времени окончания");
  }
}

async function ensureCourtExists(courtId: string) {
  const court = await prisma.court.findUnique({
    where: { id: courtId },
    select: {
      id: true,
      name: true,
      sportId: true,
      active: true,
      notes: true,
      sport: {
        select: {
          id: true,
          slug: true,
          name: true,
        },
      },
    },
  });
  if (!court) {
    throw new Error("Корт не найден");
  }
  return court;
}

async function ensureInstructorExists(instructorId: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      active: true,
      instructorSports: {
        orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }],
        select: {
          sportId: true,
          pricePerHour: true,
          sport: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });
  if (!instructor) {
    throw new Error("Тренер не найден");
  }
  return instructor;
}

export async function getAdminSportOptions(includeInactive = false): Promise<AdminSportOption[]> {
  const rows = await prisma.sport.findMany({
    where: includeInactive ? undefined : { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      active: true,
      sortOrder: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: resolveSportLabel(row.slug, row.name),
    active: row.active,
    sortOrder: row.sortOrder,
  }));
}

export async function getAdminSports(): Promise<AdminSportRow[]> {
  const rows = await prisma.sport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      active: true,
      sortOrder: true,
    },
  });

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    name: resolveSportLabel(row.slug, row.name),
    icon: row.icon ?? undefined,
    active: row.active,
    sortOrder: row.sortOrder,
  }));
}

export async function createSportFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Название"),
      slug: sportSlugSchema,
      icon: optionalTrimmedString,
      sortOrder: z.coerce.number().int(),
      active: z.boolean(),
    })
    .safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      icon: formData.get("icon") ?? undefined,
      sortOrder: formData.get("sortOrder") ?? "0",
      active: String(formData.get("active") ?? "") === "on",
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные вида спорта");
  }

  try {
    await prisma.sport.create({
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        icon: parsed.data.icon ?? null,
        sortOrder: parsed.data.sortOrder,
        active: parsed.data.active,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint failed") && message.toLowerCase().includes("slug")) {
      throw new Error("Вид спорта с таким slug уже существует");
    }
    throw error;
  }
}

export async function updateSportFromForm(formData: FormData) {
  const parsed = z
    .object({
      sportId: nonEmptyString("sportId"),
      name: nonEmptyString("Название"),
      slug: sportSlugSchema,
      icon: optionalTrimmedString,
      sortOrder: z.coerce.number().int(),
    })
    .safeParse({
      sportId: formData.get("sportId"),
      name: formData.get("name"),
      slug: formData.get("slug"),
      icon: formData.get("icon") ?? undefined,
      sortOrder: formData.get("sortOrder") ?? "0",
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные вида спорта");
  }

  try {
    await prisma.sport.update({
      where: { id: parsed.data.sportId },
      data: {
        name: parsed.data.name,
        slug: parsed.data.slug,
        icon: parsed.data.icon ?? null,
        sortOrder: parsed.data.sortOrder,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint failed") && message.toLowerCase().includes("slug")) {
      throw new Error("Вид спорта с таким slug уже существует");
    }
    throw error;
  }
}

export async function setSportActive(args: { sportId: string; active: boolean }) {
  await prisma.sport.update({
    where: { id: args.sportId },
    data: { active: args.active },
  });
}

export async function deleteSport(sportId: string) {
  const sport = await prisma.sport.findUnique({
    where: { id: sportId },
    select: { id: true },
  });
  if (!sport) {
    throw new Error("Вид спорта не найден");
  }

  const [courtUsageCount, serviceUsageCount, instructorUsageCount, priceUsageCount] = await Promise.all([
    prisma.court.count({ where: { sportId } }),
    prisma.service.count({ where: { sportId } }),
    prisma.instructorSport.count({ where: { sportId } }),
    prisma.componentPrice.count({ where: { sportId } }),
  ]);

  if (courtUsageCount + serviceUsageCount + instructorUsageCount + priceUsageCount > 0) {
    throw new Error("Нельзя удалить вид спорта: он уже используется в данных");
  }

  await prisma.sport.delete({
    where: { id: sportId },
  });
}

async function ensureSportsExist(sportIds: string[]) {
  const uniqueIds = Array.from(new Set(sportIds));
  if (uniqueIds.length === 0) {
    return [];
  }

  const sports = await prisma.sport.findMany({
    where: { id: { in: uniqueIds } },
    select: { id: true, slug: true, name: true, active: true },
  });
  if (sports.length !== uniqueIds.length) {
    throw new Error("Выбран неизвестный вид спорта");
  }

  return sports;
}

function formatResourceLabel(args: {
  resourceType: "venue" | "court" | "instructor";
  resourceId: string | null;
  courtsById: Map<string, string>;
  instructorsById: Map<string, string>;
}): string {
  if (args.resourceType === "venue") {
    return RESOURCE_TYPE_LABELS.venue;
  }

  if (args.resourceType === "court") {
    return args.resourceId
      ? `Корт: ${args.courtsById.get(args.resourceId) ?? args.resourceId}`
      : "Корт";
  }

  return args.resourceId
    ? `Тренер: ${args.instructorsById.get(args.resourceId) ?? args.resourceId}`
    : "Тренер";
}

function mapExceptionRows(
  rows: Array<{
    id: string;
    resourceType: "venue" | "court" | "instructor";
    resourceId: string | null;
    date: Date;
    startTime: string;
    endTime: string;
    type: "closed" | "maintenance";
    note: string | null;
  }>,
  lookups: { courtsById: Map<string, string>; instructorsById: Map<string, string> },
): AdminExceptionRow[] {
  return rows.map((row) => ({
    id: row.id,
    resourceType: row.resourceType,
    resourceId: row.resourceId,
    resourceLabel: formatResourceLabel({
      resourceType: row.resourceType,
      resourceId: row.resourceId,
      courtsById: lookups.courtsById,
      instructorsById: lookups.instructorsById,
    }),
    date: toVenueIsoDate(row.date),
    startTime: row.startTime,
    endTime: row.endTime,
    type: row.type,
    note: row.note ?? undefined,
  }));
}

export async function getAdminCourts(): Promise<AdminCourtRow[]> {
  const rows = await prisma.court.findMany({
    orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      active: true,
      notes: true,
      sportId: true,
      sport: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sportId: row.sportId,
    sportSlug: row.sport.slug,
    sportName: resolveSportLabel(row.sport.slug, row.sport.name),
    active: row.active,
    notes: row.notes ?? undefined,
  }));
}

export async function createCourtFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Название"),
      sportId: sportIdSchema,
      notes: optionalTrimmedString,
    })
    .safeParse({
      name: formData.get("name"),
      sportId: formData.get("sportId"),
      notes: formData.get("notes") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные корта");
  }

  await ensureSportsExist([parsed.data.sportId]);
  const defaultLocation = await getDefaultLocation();

  await prisma.court.create({
    data: {
      name: parsed.data.name,
      sportId: parsed.data.sportId,
      locationId: defaultLocation.id,
      active: true,
      notes: parsed.data.notes ?? null,
    },
  });
}

export async function setCourtActive(args: { courtId: string; active: boolean }) {
  await prisma.court.update({
    where: { id: args.courtId },
    data: { active: args.active },
  });
}

export async function updateCourtFromForm(formData: FormData) {
  const parsed = z
    .object({
      courtId: nonEmptyString("courtId"),
      name: nonEmptyString("Название"),
      notes: optionalTrimmedString,
    })
    .safeParse({
      courtId: formData.get("courtId"),
      name: formData.get("name"),
      notes: formData.get("notes") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные корта");
  }

  await prisma.court.update({
    where: { id: parsed.data.courtId },
    data: {
      name: parsed.data.name,
      notes: parsed.data.notes ?? null,
    },
  });
}

export async function deleteCourt(courtId: string) {
  await ensureCourtExists(courtId);

  const bookingUsageCount = await prisma.bookingResource.count({
    where: {
      resourceType: "court",
      resourceId: courtId,
    },
  });

  if (bookingUsageCount > 0) {
    throw new Error("Нельзя удалить корт: он уже используется в истории бронирований");
  }

  await prisma.$transaction(async (tx) => {
    await tx.scheduleException.deleteMany({
      where: { resourceType: "court", resourceId: courtId },
    });
    await tx.court.delete({
      where: { id: courtId },
    });
  });
}

export async function getAdminInstructors(): Promise<AdminInstructorRow[]> {
  const rows = await prisma.instructor.findMany({
    orderBy: [{ name: "asc" }],
    select: {
      id: true,
      name: true,
      bio: true,
      photoUrl: true,
      active: true,
      instructorSports: {
        orderBy: [{ sport: { sortOrder: "asc" } }, { sport: { name: "asc" } }],
        select: {
          sportId: true,
          pricePerHour: true,
          sport: {
            select: {
              slug: true,
              name: true,
            },
          },
        },
      },
    },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    sports: row.instructorSports.map((item) => ({
      sportId: item.sportId,
      slug: item.sport.slug,
      name: resolveSportLabel(item.sport.slug, item.sport.name),
      pricePerHour: Number(item.pricePerHour),
    })),
    bio: row.bio ?? undefined,
    photoUrl: row.photoUrl ?? undefined,
    active: row.active,
  }));
}

export async function createInstructorFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Имя"),
      sportIds: z.array(sportIdSchema).min(1, "Выберите хотя бы один вид спорта"),
      bio: optionalTrimmedString,
      photoUrl: optionalTrimmedString,
    })
    .safeParse({
      name: formData.get("name"),
      sportIds: formData.getAll("sportIds"),
      bio: formData.get("bio") ?? undefined,
      photoUrl: formData.get("photoUrl") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные тренера");
  }

  await ensureSportsExist(parsed.data.sportIds);

  // Per-sport prices: each sport has an input named `price_<sportId>`
  const sportPrices = parsed.data.sportIds.map((sportId) => ({
    sportId,
    pricePerHour: Math.max(0, Math.round(Number(formData.get(`price_${sportId}`) ?? 10000))),
  }));

  await prisma.$transaction(async (tx) => {
    const instructor = await tx.instructor.create({
      data: {
        name: parsed.data.name,
        bio: parsed.data.bio ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
        active: true,
      },
      select: { id: true },
    });

    await tx.instructorSport.createMany({
      data: sportPrices.map(({ sportId, pricePerHour }) => ({
        instructorId: instructor.id,
        sportId,
        pricePerHour,
      })),
      skipDuplicates: true,
    });
  });
}

export async function setInstructorActive(args: { instructorId: string; active: boolean }) {
  await prisma.instructor.update({
    where: { id: args.instructorId },
    data: { active: args.active },
  });
}

export async function deleteInstructor(instructorId: string) {
  await ensureInstructorExists(instructorId);

  const bookingUsageCount = await prisma.bookingResource.count({
    where: {
      resourceType: "instructor",
      resourceId: instructorId,
    },
  });

  if (bookingUsageCount > 0) {
    throw new Error("Нельзя удалить тренера: он уже используется в истории бронирований");
  }

  await prisma.$transaction(async (tx) => {
    await tx.resourceSchedule.deleteMany({
      where: { resourceType: "instructor", resourceId: instructorId },
    });
    await tx.scheduleException.deleteMany({
      where: { resourceType: "instructor", resourceId: instructorId },
    });
    await tx.instructor.delete({
      where: { id: instructorId },
    });
  });
}

export async function updateInstructorFromForm(formData: FormData) {
  const parsed = z
    .object({
      instructorId: nonEmptyString("instructorId"),
      sportIds: z.array(sportIdSchema).min(1, "Выберите хотя бы один вид спорта"),
      bio: optionalTrimmedString,
      photoUrl: optionalTrimmedString,
    })
    .safeParse({
      instructorId: formData.get("instructorId"),
      sportIds: formData.getAll("sportIds"),
      bio: formData.get("bio") ?? undefined,
      photoUrl: formData.get("photoUrl") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные тренера");
  }

  await ensureSportsExist(parsed.data.sportIds);

  // Per-sport prices: each sport has an input named `price_<sportId>`
  const sportPrices = parsed.data.sportIds.map((sportId) => ({
    sportId,
    pricePerHour: Math.max(0, Math.round(Number(formData.get(`price_${sportId}`) ?? 10000))),
  }));

  await prisma.$transaction(async (tx) => {
    await tx.instructor.update({
      where: { id: parsed.data.instructorId },
      data: {
        bio: parsed.data.bio ?? null,
        photoUrl: parsed.data.photoUrl ?? null,
      },
    });

    await tx.instructorSport.deleteMany({
      where: {
        instructorId: parsed.data.instructorId,
        sportId: { notIn: parsed.data.sportIds },
      },
    });

    for (const { sportId, pricePerHour } of sportPrices) {
      await tx.instructorSport.upsert({
        where: {
          instructorId_sportId: {
            instructorId: parsed.data.instructorId,
            sportId,
          },
        },
        create: {
          instructorId: parsed.data.instructorId,
          sportId,
          pricePerHour,
        },
        update: {
          pricePerHour,
        },
      });
    }
  });
}

export async function getAdminServices(): Promise<AdminServiceRow[]> {
  const rows = await prisma.service.findMany({
    orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
    select: {
      id: true,
      code: true,
      name: true,
      sportId: true,
      requiresCourt: true,
      requiresInstructor: true,
      active: true,
      sport: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  return rows.map(
    (row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sportId: row.sportId,
      sportSlug: row.sport.slug,
      sportName: resolveSportLabel(row.sport.slug, row.sport.name),
      requiresCourt: row.requiresCourt,
      requiresInstructor: row.requiresInstructor,
      active: row.active,
    }),
  );
}

export async function createServiceFromForm(formData: FormData) {
  const parsed = z
    .object({
      code: z
        .string()
        .transform((value) => value.trim().toLowerCase())
        .pipe(z.string().regex(/^[a-z0-9-]{3,64}$/, "code: только a-z, 0-9 и -")),
      name: nonEmptyString("Название"),
      sportId: sportIdSchema,
      includesInstructor: z.boolean(),
    })
    .safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      sportId: formData.get("sportId"),
      includesInstructor: formData.get("includesInstructor") === "on",
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные услуги");
  }

  await ensureSportsExist([parsed.data.sportId]);

  await prisma.service.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      sportId: parsed.data.sportId,
      requiresCourt: true,
      requiresInstructor: parsed.data.includesInstructor,
      active: true,
    },
  });
}

export async function setServiceActive(args: { serviceId: string; active: boolean }) {
  await prisma.service.update({
    where: { id: args.serviceId },
    data: { active: args.active },
  });
}

export async function updateServiceFromForm(formData: FormData) {
  const parsed = z
    .object({
      serviceId: nonEmptyString("serviceId"),
      code: z
        .string()
        .transform((value) => value.trim().toLowerCase())
        .pipe(z.string().regex(/^[a-z0-9-]{3,64}$/, "code: только a-z, 0-9 и -")),
      name: nonEmptyString("Название"),
    })
    .safeParse({
      serviceId: formData.get("serviceId"),
      code: formData.get("code"),
      name: formData.get("name"),
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные услуги");
  }

  await prisma.service.update({
    where: { id: parsed.data.serviceId },
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
    },
  });
}

export async function deleteService(serviceId: string) {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true },
  });

  if (!service) {
    throw new Error("Услуга не найдена");
  }

  const bookingCount = await prisma.booking.count({
    where: { serviceId },
  });

  if (bookingCount > 0) {
    throw new Error("Нельзя удалить услугу: по ней уже есть бронирования");
  }

  await prisma.service.delete({
    where: { id: serviceId },
  });
}

export async function getInstructorSchedulePageData(instructorId: string) {
  const [instructor, scheduleRows, exceptionRows, sessionRows] = await Promise.all([
    ensureInstructorExists(instructorId),
    prisma.resourceSchedule.findMany({
      where: {
        resourceType: "instructor",
        resourceId: instructorId,
      },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      include: {
        sport: {
          select: { slug: true, name: true },
        },
      },
    }),
    prisma.scheduleException.findMany({
      where: {
        resourceType: "instructor",
        resourceId: instructorId,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.booking.findMany({
      where: {
        resources: {
          some: {
            resourceType: "instructor",
            resourceId: instructorId,
          },
        },
      },
      orderBy: [{ startAt: "desc" }],
      take: 20,
      select: {
        id: true,
        startAt: true,
        status: true,
        priceTotal: true,
        customer: {
          select: {
            name: true,
            email: true,
          },
        },
        service: {
          select: {
            name: true,
          },
        },
        resources: {
          where: { resourceType: "court" },
          select: { resourceId: true },
        },
      },
    }),
  ]);

  const courtIds = Array.from(
    new Set(sessionRows.flatMap((row) => row.resources.map((resource) => resource.resourceId))),
  );
  const courtNamesById = new Map(
    (
      await prisma.court.findMany({
        where: { id: { in: courtIds } },
        select: { id: true, name: true },
      })
    ).map((row: { id: string; name: string }) => [row.id, row.name]),
  );

  const instructorNameMap = new Map<string, string>([[instructor.id, instructor.name]]);

  return {
    instructor: {
      id: instructor.id,
      name: instructor.name,
      active: instructor.active,
      bio: instructor.bio ?? undefined,
      photoUrl: instructor.photoUrl ?? undefined,
      sports: instructor.instructorSports.map((item) => ({
        sportId: item.sportId,
        slug: item.sport.slug,
        name: resolveSportLabel(item.sport.slug, item.sport.name),
        pricePerHour: Number(item.pricePerHour),
      })),
    },
    schedules: scheduleRows.map(
      (row: { id: string; dayOfWeek: number; startTime: string; endTime: string; active: boolean; sportId: string | null; sport: { slug: string; name: string } | null }) => ({
        id: row.id,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        active: row.active,
        sportId: row.sportId ?? undefined,
        sportName: row.sport ? resolveSportLabel(row.sport.slug, row.sport.name) : undefined,
      }),
    ) satisfies AdminScheduleRow[],
    exceptions: mapExceptionRows(
      exceptionRows as Array<{
        id: string;
        resourceType: "instructor";
        resourceId: string;
        date: Date;
        startTime: string;
        endTime: string;
        type: "closed" | "maintenance";
        note: string | null;
      }>,
      {
        courtsById: new Map<string, string>(),
        instructorsById: instructorNameMap,
      },
    ),
    sessions: sessionRows.map((row) => ({
      id: row.id,
      date: formatDateInVenueTimezone(row.startAt),
      time: formatTimeInVenueTimezone(row.startAt),
      serviceName: row.service.name,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      status: row.status,
      priceTotal: Number(row.priceTotal),
      courtLabel: row.resources[0]?.resourceId
        ? (courtNamesById.get(row.resources[0].resourceId) ?? row.resources[0].resourceId)
        : undefined,
    })) satisfies AdminInstructorSessionRow[],
  };
}

export async function addInstructorScheduleFromForm(args: {
  instructorId: string;
  formData: FormData;
}) {
  const instructor = await ensureInstructorExists(args.instructorId);

  const parsed = z
    .object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      startTime: hhmmSchema,
      endTime: hhmmSchema,
      active: z.boolean(),
      sportId: z.string().nullable(),
    })
    .safeParse({
      dayOfWeek: args.formData.get("dayOfWeek"),
      startTime: args.formData.get("startTime"),
      endTime: args.formData.get("endTime"),
      active: args.formData.get("active") === "on",
      sportId: args.formData.get("sportId") || null,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные графика");
  }

  // Validate sportId belongs to this instructor if provided
  if (parsed.data.sportId) {
    const validSportIds = instructor.instructorSports.map((item) => item.sportId);
    if (!validSportIds.includes(parsed.data.sportId)) {
      throw new Error("Выбранный вид спорта не привязан к этому тренеру");
    }
  }

  assertTimeRange(parsed.data.startTime, parsed.data.endTime);

  await prisma.resourceSchedule.create({
    data: {
      resourceType: "instructor",
      resourceId: args.instructorId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      active: parsed.data.active,
      sportId: parsed.data.sportId,
    },
  });
}

export async function setInstructorScheduleActive(args: {
  instructorId: string;
  scheduleId: string;
  active: boolean;
}) {
  const schedule = await prisma.resourceSchedule.findUnique({
    where: { id: args.scheduleId },
    select: { id: true, resourceType: true, resourceId: true },
  });

  if (
    !schedule ||
    schedule.resourceType !== "instructor" ||
    schedule.resourceId !== args.instructorId
  ) {
    throw new Error("Интервал графика не найден");
  }

  await prisma.resourceSchedule.update({
    where: { id: args.scheduleId },
    data: { active: args.active },
  });
}

export async function deleteInstructorSchedule(args: {
  instructorId: string;
  scheduleId: string;
}) {
  const schedule = await prisma.resourceSchedule.findUnique({
    where: { id: args.scheduleId },
    select: { id: true, resourceType: true, resourceId: true },
  });

  if (
    !schedule ||
    schedule.resourceType !== "instructor" ||
    schedule.resourceId !== args.instructorId
  ) {
    throw new Error("Интервал графика не найден");
  }

  await prisma.resourceSchedule.delete({
    where: { id: args.scheduleId },
  });
}

interface CreateExceptionInput {
  resourceType: "venue" | "court" | "instructor";
  resourceId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  type: "closed" | "maintenance";
  note?: string;
}

async function createException(args: CreateExceptionInput) {
  if (args.resourceType === "court" && args.resourceId) {
    await ensureCourtExists(args.resourceId);
  }
  if (args.resourceType === "instructor" && args.resourceId) {
    await ensureInstructorExists(args.resourceId);
  }
  if ((args.resourceType === "court" || args.resourceType === "instructor") && !args.resourceId) {
    throw new Error("Для выбранного типа ресурса требуется resourceId");
  }
  if (args.resourceType === "venue") {
    args.resourceId = null;
  }

  assertTimeRange(args.startTime, args.endTime);

  await prisma.scheduleException.create({
    data: {
      resourceType: args.resourceType,
      resourceId: args.resourceId,
      date: venueDateTimeToUtc(args.date, "00:00"),
      startTime: args.startTime,
      endTime: args.endTime,
      type: args.type,
      note: args.note ?? null,
    },
  });
}

function parseExceptionFields(formData: FormData): Omit<CreateExceptionInput, "resourceType" | "resourceId"> {
  const parsed = z
    .object({
      date: isoDateSchema,
      startTime: hhmmSchema,
      endTime: hhmmSchema,
      type: exceptionTypeSchema,
      note: optionalTrimmedString,
    })
    .safeParse({
      date: formData.get("date"),
      startTime: formData.get("startTime"),
      endTime: formData.get("endTime"),
      type: formData.get("type"),
      note: formData.get("note") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные исключения");
  }

  return parsed.data;
}

export async function getCourtExceptionsPageData(courtId: string) {
  const [court, rows] = await Promise.all([
    ensureCourtExists(courtId),
    prisma.scheduleException.findMany({
      where: {
        resourceType: "court",
        resourceId: courtId,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
  ]);

  const courtNameMap = new Map<string, string>([[court.id, court.name]]);

  return {
    court: {
      id: court.id,
      name: court.name,
      sportId: court.sportId,
      sportSlug: court.sport.slug,
      sportName: resolveSportLabel(court.sport.slug, court.sport.name),
      active: court.active,
      notes: court.notes ?? undefined,
    },
    exceptions: mapExceptionRows(
      rows as Array<{
        id: string;
        resourceType: "court";
        resourceId: string;
        date: Date;
        startTime: string;
        endTime: string;
        type: "closed" | "maintenance";
        note: string | null;
      }>,
      { courtsById: courtNameMap, instructorsById: new Map<string, string>() },
    ),
  };
}

export async function createCourtExceptionFromForm(args: { courtId: string; formData: FormData }) {
  const fields = parseExceptionFields(args.formData);
  await createException({
    resourceType: "court",
    resourceId: args.courtId,
    ...fields,
  });
}

export async function createInstructorExceptionFromForm(args: {
  instructorId: string;
  formData: FormData;
}) {
  const fields = parseExceptionFields(args.formData);
  await createException({
    resourceType: "instructor",
    resourceId: args.instructorId,
    ...fields,
  });
}

export async function deleteScheduleExceptionForResource(args: {
  exceptionId: string;
  resourceType: "court" | "instructor";
  resourceId: string;
}) {
  const exception = await prisma.scheduleException.findUnique({
    where: { id: args.exceptionId },
    select: { id: true, resourceType: true, resourceId: true },
  });

  if (
    !exception ||
    exception.resourceType !== args.resourceType ||
    exception.resourceId !== args.resourceId
  ) {
    throw new Error("Исключение не найдено");
  }

  await prisma.scheduleException.delete({
    where: { id: args.exceptionId },
  });
}

export async function getExceptionTargetOptions(): Promise<ExceptionTargetOption[]> {
  const [courts, instructors] = await Promise.all([
    prisma.court.findMany({
      where: { active: true },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
      select: { id: true, name: true },
    }),
    prisma.instructor.findMany({
      where: { active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return [
    { value: "venue", label: RESOURCE_TYPE_LABELS.venue },
    ...courts.map((court: { id: string; name: string }) => ({
      value: `court:${court.id}`,
      label: `Корт: ${court.name}`,
    })),
    ...instructors.map((instructor: { id: string; name: string }) => ({
      value: `instructor:${instructor.id}`,
      label: `Тренер: ${instructor.name}`,
    })),
  ];
}

function parseExceptionTargetValue(targetValue: string): {
  resourceType: "venue" | "court" | "instructor";
  resourceId: string | null;
} {
  if (targetValue === "venue") {
    return { resourceType: "venue", resourceId: null };
  }

  const [resourceTypeRaw, resourceIdRaw] = targetValue.split(":");

  const parsed = z
    .object({
      resourceType: resourceTypeSchema.refine((value) => value !== "venue"),
      resourceId: nonEmptyString("resourceId"),
    })
    .safeParse({
      resourceType: resourceTypeRaw,
      resourceId: resourceIdRaw,
    });

  if (!parsed.success) {
    throw new Error("Некорректная цель исключения");
  }

  return {
    resourceType: parsed.data.resourceType as "court" | "instructor",
    resourceId: parsed.data.resourceId,
  };
}

export async function createGlobalExceptionFromForm(formData: FormData) {
  const targetValue = String(formData.get("target") ?? "");
  const target = parseExceptionTargetValue(targetValue);
  const fields = parseExceptionFields(formData);

  await createException({
    resourceType: target.resourceType,
    resourceId: target.resourceId,
    ...fields,
  });
}

export async function getAdminExceptions(limit = 200): Promise<AdminExceptionRow[]> {
  const [exceptions, courts, instructors] = await Promise.all([
    prisma.scheduleException.findMany({
      take: limit,
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
    }),
    prisma.court.findMany({ select: { id: true, name: true } }),
    prisma.instructor.findMany({ select: { id: true, name: true } }),
  ]);

  return mapExceptionRows(
    exceptions as Array<{
      id: string;
      resourceType: "venue" | "court" | "instructor";
      resourceId: string | null;
      date: Date;
      startTime: string;
      endTime: string;
      type: "closed" | "maintenance";
      note: string | null;
    }>,
    {
      courtsById: new Map(courts.map((row: { id: string; name: string }) => [row.id, row.name])),
      instructorsById: new Map(
        instructors.map((row: { id: string; name: string }) => [row.id, row.name]),
      ),
    },
  );
}

export async function deleteScheduleExceptionById(exceptionId: string) {
  await prisma.scheduleException.delete({
    where: { id: exceptionId },
  });
}

export function getServiceResourceDescription(service: Pick<AdminServiceRow, "requiresCourt" | "requiresInstructor">) {
  if (service.requiresCourt && service.requiresInstructor) {
    return "Корт + тренер";
  }
  if (service.requiresCourt) {
    return "Корт";
  }
  if (service.requiresInstructor) {
    return "Тренер";
  }
  return "—";
}

export function getScheduleWeekdayLabel(dayOfWeek: number): string {
  return (WEEKDAY_LABELS as readonly string[])[dayOfWeek] ?? String(dayOfWeek);
}
