import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { WEEKDAY_LABELS } from "@/src/lib/settings/service";
import {
  formatDateInVenueTimezone,
  formatTimeInVenueTimezone,
  toVenueIsoDate,
  venueDateTimeToUtc,
} from "@/src/lib/time/venue-timezone";

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "Время должно быть в формате HH:MM");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Дата должна быть в формате YYYY-MM-DD");
const sportSchema = z.enum(["padel", "squash"]);
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

export const SPORT_LABELS: Record<"padel" | "squash", string> = {
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
  sport: "padel" | "squash";
  active: boolean;
  notes?: string;
}

export interface AdminInstructorRow {
  id: string;
  name: string;
  sports: Array<"padel" | "squash">;
  bio?: string;
  pricePerHour: number;
  active: boolean;
}

export interface AdminServiceRow {
  id: string;
  code: string;
  name: string;
  sport: "padel" | "squash";
  requiresCourt: boolean;
  requiresInstructor: boolean;
  active: boolean;
}

export interface AdminScheduleRow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  active: boolean;
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
    select: { id: true, name: true, sport: true, active: true, notes: true },
  });
  if (!court) {
    throw new Error("Корт не найден");
  }
  return court;
}

async function ensureInstructorExists(instructorId: string) {
  const instructor = await prisma.instructor.findUnique({
    where: { id: instructorId },
    select: { id: true, name: true, bio: true, active: true, sports: true, pricePerHour: true },
  });
  if (!instructor) {
    throw new Error("Тренер не найден");
  }
  return instructor;
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
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  return rows.map((row: { id: string; name: string; sport: "padel" | "squash"; active: boolean; notes: string | null }) => ({
    id: row.id,
    name: row.name,
    sport: row.sport,
    active: row.active,
    notes: row.notes ?? undefined,
  }));
}

export async function createCourtFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Название"),
      sport: sportSchema,
      notes: optionalTrimmedString,
    })
    .safeParse({
      name: formData.get("name"),
      sport: formData.get("sport"),
      notes: formData.get("notes") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные корта");
  }

  await prisma.court.create({
    data: {
      name: parsed.data.name,
      sport: parsed.data.sport,
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
  });

  return rows.map((row: {
    id: string;
    name: string;
    sports: Array<"padel" | "squash">;
    bio: string | null;
    pricePerHour: unknown;
    active: boolean;
  }) => ({
    id: row.id,
    name: row.name,
    sports: row.sports,
    bio: row.bio ?? undefined,
    pricePerHour: Number(row.pricePerHour),
    active: row.active,
  }));
}

export async function createInstructorFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Имя"),
      sports: z.array(sportSchema).min(1, "Выберите хотя бы один вид спорта"),
      bio: optionalTrimmedString,
      pricePerHour: z.coerce.number().int().nonnegative(),
    })
    .safeParse({
      name: formData.get("name"),
      sports: formData.getAll("sports"),
      bio: formData.get("bio") ?? undefined,
      pricePerHour: formData.get("pricePerHour"),
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные тренера");
  }

  await prisma.instructor.create({
    data: {
      name: parsed.data.name,
      sports: parsed.data.sports,
      bio: parsed.data.bio ?? null,
      pricePerHour: parsed.data.pricePerHour,
      active: true,
    },
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
      sports: z.array(sportSchema).min(1, "Выберите хотя бы один вид спорта"),
      bio: optionalTrimmedString,
      pricePerHour: z.coerce.number().int().nonnegative(),
    })
    .safeParse({
      instructorId: formData.get("instructorId"),
      sports: formData.getAll("sports"),
      bio: formData.get("bio") ?? undefined,
      pricePerHour: formData.get("pricePerHour"),
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные тренера");
  }

  await prisma.instructor.update({
    where: { id: parsed.data.instructorId },
    data: {
      sports: parsed.data.sports,
      bio: parsed.data.bio ?? null,
      pricePerHour: parsed.data.pricePerHour,
    },
  });
}

export async function getAdminServices(): Promise<AdminServiceRow[]> {
  const rows = await prisma.service.findMany({
    orderBy: [{ sport: "asc" }, { name: "asc" }],
  });

  return rows.map(
    (row: {
      id: string;
      code: string;
      name: string;
      sport: "padel" | "squash";
      requiresCourt: boolean;
      requiresInstructor: boolean;
      active: boolean;
    }) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      sport: row.sport,
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
      sport: sportSchema,
      includesInstructor: z.boolean(),
    })
    .safeParse({
      code: formData.get("code"),
      name: formData.get("name"),
      sport: formData.get("sport"),
      includesInstructor: formData.get("includesInstructor") === "on",
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные услуги");
  }

  await prisma.service.create({
    data: {
      code: parsed.data.code,
      name: parsed.data.name,
      sport: parsed.data.sport,
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
      sports: instructor.sports,
      bio: instructor.bio ?? undefined,
      pricePerHour: Number(instructor.pricePerHour),
    },
    schedules: scheduleRows.map(
      (row: { id: string; dayOfWeek: number; startTime: string; endTime: string; active: boolean }) => ({
        id: row.id,
        dayOfWeek: row.dayOfWeek,
        startTime: row.startTime,
        endTime: row.endTime,
        active: row.active,
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
  await ensureInstructorExists(args.instructorId);

  const parsed = z
    .object({
      dayOfWeek: z.coerce.number().int().min(0).max(6),
      startTime: hhmmSchema,
      endTime: hhmmSchema,
      active: z.boolean(),
    })
    .safeParse({
      dayOfWeek: args.formData.get("dayOfWeek"),
      startTime: args.formData.get("startTime"),
      endTime: args.formData.get("endTime"),
      active: args.formData.get("active") === "on",
    });

  if (!parsed.success) {
    throw new Error("Некорректные данные графика");
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
      sport: court.sport,
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
      orderBy: [{ sport: "asc" }, { name: "asc" }],
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
