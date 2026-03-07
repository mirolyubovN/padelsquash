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

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "?????? ??????? ?????? ???? HH:MM");
const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "?????? ???? ?????? ???? YYYY-MM-DD");
const exceptionTypeSchema = z.enum(["closed", "maintenance"]);
const resourceTypeSchema = z.enum(["venue", "court", "instructor"]);

const nonEmptyString = (label: string) =>
  z
    .string()
    .transform((value) => value.trim())
    .pipe(z.string().min(1, `${label} ?? ????? ???? ??????`));

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
  .pipe(z.string().regex(/^[a-z0-9-]+$/, "Slug ????? ????????? ?????? a-z, 0-9 ? ?????"));

function resolveSportLabel(slug: string, name?: string | null): string {
  return name?.trim() || SPORT_LABELS[slug] || slug;
}

export const SPORT_LABELS: Record<string, string> = {
  padel: "?????",
  squash: "?????",
};

export const EXCEPTION_TYPE_LABELS: Record<"closed" | "maintenance", string> = {
  closed: "???????",
  maintenance: "???????????????",
};

export const RESOURCE_TYPE_LABELS: Record<"venue" | "court" | "instructor", string> = {
  venue: "????????",
  court: "????",
  instructor: "??????",
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
  defaultRentalServiceId?: string;
  defaultRentalServiceCode?: string;
  defaultRentalServiceName?: string;
  courtBasePriceMorningKzt: number;
  courtBasePriceEveningWeekendKzt: number;
  courtsCount: number;
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
    throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅР‹пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚Сћ пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅР‹пїЅпїЅР‚С™пїЅВ¬пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅР‹пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅРЏ");
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅвЂћСћпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ў пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦");
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅвЂєпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦");
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
  const defaultLocation = await getDefaultLocation();
  const rows = await prisma.sport.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      icon: true,
      active: true,
      sortOrder: true,
      courts: {
        select: { id: true },
      },
      services: {
        where: {
          requiresCourt: true,
          requiresInstructor: false,
        },
        orderBy: [{ createdAt: "asc" }],
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
      componentPrices: {
        where: {
          locationId: defaultLocation.id,
          componentType: "court",
          currency: "KZT",
          period: { in: ["morning", "evening_weekend"] },
        },
        select: {
          period: true,
          amount: true,
        },
      },
    },
  });

  return rows.map((row) => {
    const morningPrice = row.componentPrices.find((price) => price.period === "morning")?.amount ?? 0;
    const eveningPrice = row.componentPrices.find((price) => price.period === "evening_weekend")?.amount ?? 0;
    const defaultRentalService = row.services[0];

    return {
      id: row.id,
      slug: row.slug,
      name: resolveSportLabel(row.slug, row.name),
      icon: row.icon ?? undefined,
      active: row.active,
      sortOrder: row.sortOrder,
      defaultRentalServiceId: defaultRentalService?.id,
      defaultRentalServiceCode: defaultRentalService?.code,
      defaultRentalServiceName: defaultRentalService?.name,
      courtBasePriceMorningKzt: Number(morningPrice),
      courtBasePriceEveningWeekendKzt: Number(eveningPrice),
      courtsCount: row.courts.length,
    };
  });
}

function buildDefaultRentalServiceCode(slug: string): string {
  return `${slug}-rental`;
}

function buildDefaultRentalServiceName(name: string): string {
  return `Court rental (${name})`;
}

export async function createSportFromForm(formData: FormData) {
  const parsed = z
    .object({
      name: nonEmptyString("Sport name"),
      slug: sportSlugSchema,
      icon: optionalTrimmedString,
      sortOrder: z.coerce.number().int(),
      active: z.boolean(),
      rentalServiceName: optionalTrimmedString,
      rentalServiceCode: optionalTrimmedString,
      courtPriceMorningKzt: z.coerce.number().int().nonnegative(),
      courtPriceEveningWeekendKzt: z.coerce.number().int().nonnegative(),
    })
    .safeParse({
      name: formData.get("name"),
      slug: formData.get("slug"),
      icon: formData.get("icon") ?? undefined,
      sortOrder: formData.get("sortOrder") ?? "0",
      active: String(formData.get("active") ?? "") === "on",
      rentalServiceName: formData.get("rentalServiceName") ?? undefined,
      rentalServiceCode: formData.get("rentalServiceCode") ?? undefined,
      courtPriceMorningKzt: formData.get("courtPriceMorningKzt") ?? "0",
      courtPriceEveningWeekendKzt: formData.get("courtPriceEveningWeekendKzt") ?? "0",
    });

  if (!parsed.success) {
    throw new Error("Invalid sport setup");
  }

  try {
    const defaultLocation = await getDefaultLocation();
    await prisma.$transaction(async (tx) => {
      const sport = await tx.sport.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          icon: parsed.data.icon ?? null,
          sortOrder: parsed.data.sortOrder,
          active: parsed.data.active,
        },
      });

      await tx.service.create({
        data: {
          code: (parsed.data.rentalServiceCode ?? buildDefaultRentalServiceCode(parsed.data.slug)).trim().toLowerCase(),
          name: parsed.data.rentalServiceName ?? buildDefaultRentalServiceName(parsed.data.name),
          sportId: sport.id,
          requiresCourt: true,
          requiresInstructor: false,
          active: true,
        },
      });

      await tx.componentPrice.createMany({
        data: [
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "court",
            period: "morning",
            currency: "KZT",
            amount: parsed.data.courtPriceMorningKzt,
          },
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "court",
            period: "day",
            currency: "KZT",
            amount: parsed.data.courtPriceMorningKzt,
          },
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "court",
            period: "evening_weekend",
            currency: "KZT",
            amount: parsed.data.courtPriceEveningWeekendKzt,
          },
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "instructor",
            period: "morning",
            currency: "KZT",
            amount: 0,
          },
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "instructor",
            period: "day",
            currency: "KZT",
            amount: 0,
          },
          {
            locationId: defaultLocation.id,
            sportId: sport.id,
            componentType: "instructor",
            period: "evening_weekend",
            currency: "KZT",
            amount: 0,
          },
        ],
      });
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint failed")) {
      if (message.toLowerCase().includes("slug")) {
        throw new Error("Sport slug already exists");
      }
      if (message.toLowerCase().includes("code")) {
        throw new Error("Service code already exists");
      }
    }
    throw error;
  }
}

export async function updateSportFromForm(formData: FormData) {
  const parsed = z
    .object({
      sportId: nonEmptyString("sportId"),
      name: nonEmptyString("Sport name"),
      slug: sportSlugSchema,
      icon: optionalTrimmedString,
      sortOrder: z.coerce.number().int(),
      rentalServiceId: optionalTrimmedString,
      rentalServiceName: nonEmptyString("Rental service name"),
      rentalServiceCode: z
        .string()
        .transform((value) => value.trim().toLowerCase())
        .pipe(z.string().regex(/^[a-z0-9-]{3,64}$/, "code: only a-z, 0-9 and -")),
      courtPriceMorningKzt: z.coerce.number().int().nonnegative(),
      courtPriceEveningWeekendKzt: z.coerce.number().int().nonnegative(),
    })
    .safeParse({
      sportId: formData.get("sportId"),
      name: formData.get("name"),
      slug: formData.get("slug"),
      icon: formData.get("icon") ?? undefined,
      sortOrder: formData.get("sortOrder") ?? "0",
      rentalServiceId: formData.get("rentalServiceId") ?? undefined,
      rentalServiceName: formData.get("rentalServiceName"),
      rentalServiceCode: formData.get("rentalServiceCode"),
      courtPriceMorningKzt: formData.get("courtPriceMorningKzt") ?? "0",
      courtPriceEveningWeekendKzt: formData.get("courtPriceEveningWeekendKzt") ?? "0",
    });

  if (!parsed.success) {
    throw new Error("Invalid sport setup");
  }

  try {
    const defaultLocation = await getDefaultLocation();
    await prisma.$transaction(async (tx) => {
      await tx.sport.update({
        where: { id: parsed.data.sportId },
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          icon: parsed.data.icon ?? null,
          sortOrder: parsed.data.sortOrder,
        },
      });

      if (parsed.data.rentalServiceId) {
        await tx.service.update({
          where: { id: parsed.data.rentalServiceId },
          data: {
            code: parsed.data.rentalServiceCode,
            name: parsed.data.rentalServiceName,
          },
        });
      } else {
        await tx.service.create({
          data: {
            code: parsed.data.rentalServiceCode,
            name: parsed.data.rentalServiceName,
            sportId: parsed.data.sportId,
            requiresCourt: true,
            requiresInstructor: false,
            active: true,
          },
        });
      }

      for (const [period, amount] of [
        ["morning", parsed.data.courtPriceMorningKzt],
        ["day", parsed.data.courtPriceMorningKzt],
        ["evening_weekend", parsed.data.courtPriceEveningWeekendKzt],
      ] as const) {
        await tx.componentPrice.upsert({
          where: {
            locationId_sportId_componentType_period_currency: {
              locationId: defaultLocation.id,
              sportId: parsed.data.sportId,
              componentType: "court",
              period,
              currency: "KZT",
            },
          },
          create: {
            locationId: defaultLocation.id,
            sportId: parsed.data.sportId,
            componentType: "court",
            period,
            currency: "KZT",
            amount,
          },
          update: {
            amount,
          },
        });
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Unique constraint failed")) {
      if (message.toLowerCase().includes("slug")) {
        throw new Error("Sport slug already exists");
      }
      if (message.toLowerCase().includes("code")) {
        throw new Error("Service code already exists");
      }
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
    throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦");
  }

  const [courtUsageCount, serviceUsageCount, instructorUsageCount, priceUsageCount] = await Promise.all([
    prisma.court.count({ where: { sportId } }),
    prisma.service.count({ where: { sportId } }),
    prisma.instructorSport.count({ where: { sportId } }),
    prisma.componentPrice.count({ where: { sportId } }),
  ]);

  if (courtUsageCount + serviceUsageCount + instructorUsageCount + priceUsageCount > 0) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°: пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅВ пїЅР‚В  пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅВ¦");
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
    throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°");
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
      ? `????: ${args.courtsById.get(args.resourceId) ?? args.resourceId}`
      : "????";
  }

  return args.resourceId
    ? `??????: ${args.instructorsById.get(args.resourceId) ?? args.resourceId}`
    : "??????";
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
      name: nonEmptyString("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµ"),
      sportId: sportIdSchema,
      notes: optionalTrimmedString,
    })
    .safeParse({
      name: formData.get("name"),
      sportId: formData.get("sportId"),
      notes: formData.get("notes") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°");
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
      name: nonEmptyString("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµ"),
      notes: optionalTrimmedString,
    })
    .safeParse({
      courtId: formData.get("courtId"),
      name: formData.get("name"),
      notes: formData.get("notes") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°");
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ў: пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅВ пїЅР‚В  пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ");
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
      name: nonEmptyString("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅВ пїЅРЏ"),
      sportIds: z.array(sportIdSchema).min(1, "пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅВ¦пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅ пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°"),
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°");
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°: пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅВ пїЅР‚В  пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ");
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
      name: nonEmptyString("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅВ пїЅРЏ"),
      sportIds: z.array(sportIdSchema).min(1, "пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅВ¦пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅ пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ°"),
      bio: optionalTrimmedString,
      photoUrl: optionalTrimmedString,
    })
    .safeParse({
      instructorId: formData.get("instructorId"),
      name: formData.get("name"),
      sportIds: formData.getAll("sportIds"),
      bio: formData.get("bio") ?? undefined,
      photoUrl: formData.get("photoUrl") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°");
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
        name: parsed.data.name,
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

export async function updateInstructorBasicFromForm(formData: FormData) {
  const parsed = z
    .object({
      instructorId: nonEmptyString("instructorId"),
      name: nonEmptyString("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅВ пїЅРЏ"),
      bio: optionalTrimmedString,
      photoUrl: optionalTrimmedString,
    })
    .safeParse({
      instructorId: formData.get("instructorId"),
      name: formData.get("name"),
      bio: formData.get("bio") ?? undefined,
      photoUrl: formData.get("photoUrl") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°");
  }

  await prisma.instructor.update({
    where: { id: parsed.data.instructorId },
    data: {
      name: parsed.data.name,
      bio: parsed.data.bio ?? null,
      photoUrl: parsed.data.photoUrl ?? null,
    },
  });
}

export async function addInstructorScheduleBulk(args: {
  instructorId: string;
  entries: Array<{ dayOfWeek: number; startTime: string; endTime: string; sportId?: string | null }>;
}) {
  if (args.entries.length === 0) return;

  const instructor = await ensureInstructorExists(args.instructorId);
  const validSportIds = instructor.instructorSports.map((item) => item.sportId);

  const data = args.entries.map((entry) => {
    if (entry.sportId && !validSportIds.includes(entry.sportId)) {
      throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅРЏпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅРЋпїЅР‚Сњ пїЅВ пїЅР‹пїЅВ пїЅР‰пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ");
    }
    assertTimeRange(entry.startTime, entry.endTime);
    return {
      resourceType: "instructor" as const,
      resourceId: args.instructorId,
      dayOfWeek: entry.dayOfWeek,
      startTime: entry.startTime,
      endTime: entry.endTime,
      active: true,
      sportId: entry.sportId ?? null,
    };
  });

  await prisma.resourceSchedule.createMany({ data, skipDuplicates: true });
}

export async function createInstructorExceptionSimple(args: {
  instructorId: string;
  formData: FormData;
}) {
  const parsed = z
    .object({
      date: isoDateSchema,
      startTime: hhmmSchema,
      endTime: hhmmSchema,
      note: optionalTrimmedString,
    })
    .safeParse({
      date: args.formData.get("date"),
      startTime: args.formData.get("startTime"),
      endTime: args.formData.get("endTime"),
      note: args.formData.get("note") ?? undefined,
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚В");
  }

  await createException({
    resourceType: "instructor",
    resourceId: args.instructorId,
    date: parsed.data.date,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    type: "closed",
    note: parsed.data.note,
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
        .pipe(z.string().regex(/^[a-z0-9-]{3,64}$/, "code: пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚Сћ a-z, 0-9 пїЅВ пїЅВ пїЅРЋпїЅР‚В -")),
      name: nonEmptyString("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµ"),
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅВ пїЅРЋпїЅР‚В");
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
        .pipe(z.string().regex(/^[a-z0-9-]{3,64}$/, "code: пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚Сћ a-z, 0-9 пїЅВ пїЅВ пїЅРЋпїЅР‚В -")),
      name: nonEmptyString("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµ"),
    })
    .safeParse({
      serviceId: formData.get("serviceId"),
      code: formData.get("code"),
      name: formData.get("name"),
    });

  if (!parsed.success) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅВ пїЅРЋпїЅР‚В");
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
    throw new Error("пїЅВ пїЅВ пїЅВ пїЅвЂљВ¬пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°");
  }

  const bookingCount = await prisma.booking.count({
    where: { serviceId },
  });

  if (bookingCount > 0) {
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ: пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚Сћ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅРЏ");
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
        // weekStart is available after `npx prisma generate` (migration: resource_schedule_week_start)
        ...({ weekStart: null } as object),
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂєпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅВ°");
  }

  // Validate sportId belongs to this instructor if provided
  if (parsed.data.sportId) {
    const validSportIds = instructor.instructorSports.map((item) => item.sportId);
    if (!validSportIds.includes(parsed.data.sportId)) {
      throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅРЏпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅРЋпїЅР‚Сњ пїЅВ пїЅР‹пїЅВ пїЅР‰пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ");
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
    throw new Error("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂєпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦");
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
    throw new Error("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅвЂ™пїЅ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂєпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦");
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
    throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅСљпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅР‚вЂњпїЅВ пїЅВ пїЅРЋпїЅР‚Сћ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅРЋпїЅР‚СљпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅР‹пїЅВ пїЅРЏ resourceId");
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅР‚пїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅР‹пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅРЏ");
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
    throw new Error("пїЅВ пїЅВ пїЅвЂ™пїЅВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅР‚пїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅР‹пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚Сћ");
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
      label: `????: ${court.name}`,
    })),
    ...instructors.map((instructor: { id: string; name: string }) => ({
      value: `instructor:${instructor.id}`,
      label: `??????: ${instructor.name}`,
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
    throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅВ пїЅРЏ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅВ пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅР‚пїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅР‹пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅР‹пїЅВ пїЅРЏ");
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
    return "???? + ??????";
  }
  if (service.requiresCourt) {
    return "????";
  }
  if (service.requiresInstructor) {
    return "??????";
  }
  return "???";
}

export function getScheduleWeekdayLabel(dayOfWeek: number): string {
  return (WEEKDAY_LABELS as readonly string[])[dayOfWeek] ?? String(dayOfWeek);
}

export async function saveInstructorBaseSchedule(args: {
  instructorId: string;
  formData: FormData;
}) {
  const slots = args.formData.getAll("slot") as string[];
  const sportId = (args.formData.get("sportId") as string) || null;

  const instructor = await ensureInstructorExists(args.instructorId);

  if (sportId) {
    const validSportIds = instructor.instructorSports.map((item) => item.sportId);
    if (!validSportIds.includes(sportId)) {
      throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅРЏпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅРЋпїЅР‚Сњ пїЅВ пїЅР‹пїЅВ пїЅР‰пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ");
    }
  }

  const intervals = mergeHourCellsToIntervals(slots);

  await prisma.$transaction(async (tx) => {
    await tx.resourceSchedule.deleteMany({
      where: {
        resourceType: "instructor",
        resourceId: args.instructorId,
        ...({ weekStart: null } as object),
      },
    });

    if (intervals.length > 0) {
      await tx.resourceSchedule.createMany({
        data: intervals.map((interval) => ({
          resourceType: "instructor" as const,
          resourceId: args.instructorId,
          dayOfWeek: interval.dayOfWeek,
          startTime: interval.startTime,
          endTime: interval.endTime,
          active: true,
          sportId: sportId,
        })),
      });
    }
  });
}

function mergeHourCellsToIntervals(
  slots: string[],
): Array<{ dayOfWeek: number; startTime: string; endTime: string }> {
  if (slots.length === 0) return [];

  const parsed = slots.map((slot) => {
    const parts = slot.split(":");
    return {
      dayOfWeek: parseInt(parts[0], 10),
      startHour: parseInt(parts[1], 10),
      endHour: parseInt(parts[3], 10),
    };
  });

  const byDay = new Map<number, Array<{ startHour: number; endHour: number }>>();
  for (const entry of parsed) {
    if (!byDay.has(entry.dayOfWeek)) byDay.set(entry.dayOfWeek, []);
    byDay.get(entry.dayOfWeek)!.push({ startHour: entry.startHour, endHour: entry.endHour });
  }

  const result: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];

  for (const [day, hours] of byDay) {
    hours.sort((a, b) => a.startHour - b.startHour);
    let currentStart = hours[0].startHour;
    let currentEnd = hours[0].endHour;
    for (let i = 1; i < hours.length; i++) {
      if (hours[i].startHour <= currentEnd) {
        currentEnd = Math.max(currentEnd, hours[i].endHour);
      } else {
        result.push({
          dayOfWeek: day,
          startTime: `${currentStart.toString().padStart(2, "0")}:00`,
          endTime: `${currentEnd.toString().padStart(2, "0")}:00`,
        });
        currentStart = hours[i].startHour;
        currentEnd = hours[i].endHour;
      }
    }
    result.push({
      dayOfWeek: day,
      startTime: `${currentStart.toString().padStart(2, "0")}:00`,
      endTime: `${currentEnd.toString().padStart(2, "0")}:00`,
    });
  }

  return result;
}

export async function getInstructorWeekSchedule(
  instructorId: string,
  weekStart: string,
): Promise<AdminScheduleRow[] | null> {
  const weekStartDate = new Date(weekStart + "T00:00:00Z");
  const rows = await prisma.resourceSchedule.findMany({
    where: {
      resourceType: "instructor",
      resourceId: instructorId,
      ...({ weekStart: weekStartDate } as object),
    },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    include: {
      sport: { select: { slug: true, name: true } },
    },
  });

  if (rows.length === 0) return null;

  return rows.map((row) => {
    const r = row as typeof row & { sport: { slug: string; name: string } | null };
    return {
      id: r.id,
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      active: r.active,
      sportId: r.sportId ?? undefined,
      sportName: r.sport ? resolveSportLabel(r.sport.slug, r.sport.name) : undefined,
    };
  });
}

export async function saveInstructorWeekSchedule(args: {
  instructorId: string;
  formData: FormData;
}) {
  const weekStart = String(args.formData.get("weekStart") ?? "");
  const slots = args.formData.getAll("slot") as string[];
  const sportId = (args.formData.get("sportId") as string) || null;

  const weekStartParsed = isoDateSchema.safeParse(weekStart);
  if (!weekStartParsed.success) throw new Error("пїЅВ пїЅВ пїЅРЋпїЅС™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂєпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ў пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅ пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅРЋпїЅР‚В");

  const weekStartDate = new Date(weekStart + "T00:00:00Z");
  if (weekStartDate.getUTCDay() !== 1) throw new Error("weekStart пїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ¶пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅвЂ° пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅСћпїЅР‚ВпїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅР‹пїЅВ пїЅвЂ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅРЋпїЅР‚СњпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅВ");

  const instructor = await ensureInstructorExists(args.instructorId);

  if (sportId) {
    const validSportIds = instructor.instructorSports.map((item) => item.sportId);
    if (!validSportIds.includes(sportId)) {
      throw new Error("пїЅВ пїЅВ пїЅпїЅвЂљпїЅвЂћСћпїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ±пїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅР‹пїЅпїЅвЂљпїЅвЂћпїЅпїЅВ пїЅВ пїЅпїЅР‚С›пїЅР‚вЂњ пїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅСћпїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅвЂњпїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅвЂ™пїЅВ° пїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµ пїЅВ пїЅВ пїЅРЋпїЅР‚вЂќпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅРЋпїЅР‚ВпїЅВ пїЅВ пїЅВ пїЅР‚В пїЅВ пїЅР‹пїЅВ пїЅРЏпїЅВ пїЅВ пїЅвЂ™пїЅпїЅВ пїЅВ пїЅвЂ™пїЅВ°пїЅВ пїЅВ пїЅВ пїЅР‚В¦ пїЅВ пїЅВ пїЅРЋпїЅР‚Сњ пїЅВ пїЅР‹пїЅВ пїЅР‰пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅВ пїЅРЋпїЅР‚СћпїЅВ пїЅВ пїЅРЋпїЅВпїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ пїЅВ пїЅР‹пїЅпїЅвЂљпїЅв„ўпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅВ пїЅВ пїЅР‚В¦пїЅВ пїЅВ пїЅвЂ™пїЅВµпїЅВ пїЅР‹пїЅВ пїЅР‚С™пїЅВ пїЅР‹пїЅРЋпїЅР‚Сљ");
    }
  }

  const intervals = mergeHourCellsToIntervals(slots);

  await prisma.$transaction(async (tx) => {
    await tx.resourceSchedule.deleteMany({
      where: {
        resourceType: "instructor",
        resourceId: args.instructorId,
        ...({ weekStart: weekStartDate } as object),
      },
    });

    if (intervals.length > 0) {
      await tx.resourceSchedule.createMany({
        data: intervals.map((interval) => ({
          resourceType: "instructor" as const,
          resourceId: args.instructorId,
          dayOfWeek: interval.dayOfWeek,
          startTime: interval.startTime,
          endTime: interval.endTime,
          active: true,
          sportId: sportId,
          ...({ weekStart: weekStartDate } as object),
        })),
      });
    }
  });
}

export async function resetInstructorWeekToTemplate(args: {
  instructorId: string;
  weekStart: string;
}) {
  await ensureInstructorExists(args.instructorId);
  const weekStartDate = new Date(args.weekStart + "T00:00:00Z");
  await prisma.resourceSchedule.deleteMany({
    where: {
      resourceType: "instructor",
      resourceId: args.instructorId,
      ...({ weekStart: weekStartDate } as object),
    },
  });
}
