import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { demoComponentPrices, demoOpeningHours } from "@/src/lib/demo/hardcoded-data";
import type { OpeningHourRecord, PricingTier } from "@/src/lib/domain/types";
import { getDefaultLocation } from "@/src/lib/locations/service";

export const WEEKDAY_LABELS = [
  "Воскресенье",
  "Понедельник",
  "Вторник",
  "Среда",
  "Четверг",
  "Пятница",
  "Суббота",
] as const;

export const PRICING_PERIOD_LABELS: Record<PricingTier, string> = {
  morning: "Утро",
  day: "День",
  evening_weekend: "Вечер / выходные",
};

export const COURT_BASE_PRICING_PERIOD_LABELS = {
  morning: "Будни 08:00-17:00",
  evening_weekend: "Будни 17:00-23:00 / Выходные 08:00-23:00",
} as const;

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "Формат времени должен быть HH:MM");

const DEFAULT_SPORTS = [
  { slug: "padel", name: "Падел", sortOrder: 0 },
  { slug: "squash", name: "Сквош", sortOrder: 1 },
] as const;

async function ensureSportDefaults() {
  await Promise.all(
    DEFAULT_SPORTS.map((sport) =>
      prisma.sport.upsert({
        where: { slug: sport.slug },
        create: {
          slug: sport.slug,
          name: sport.name,
          active: true,
          sortOrder: sport.sortOrder,
        },
        update: {
          name: sport.name,
          active: true,
          sortOrder: sport.sortOrder,
        },
      }),
    ),
  );
}

async function resolveLocationId(locationId?: string): Promise<string> {
  if (locationId) {
    return locationId;
  }
  const location = await getDefaultLocation();
  return location.id;
}

export async function ensureOpeningHoursDefaults(locationId?: string) {
  const effectiveLocationId = await resolveLocationId(locationId);
  const count = await prisma.openingHour.count({ where: { locationId: effectiveLocationId } });
  if (count > 0) {
    return;
  }

  await prisma.openingHour.createMany({
    data: demoOpeningHours.map((item: OpeningHourRecord) => ({
      locationId: effectiveLocationId,
      dayOfWeek: item.dayOfWeek,
      openTime: item.openTime,
      closeTime: item.closeTime,
      active: item.active,
    })),
  });
}

export async function ensureComponentPriceDefaults(locationId?: string) {
  const effectiveLocationId = await resolveLocationId(locationId);
  await ensureSportDefaults();

  const [sports, existingRows] = await Promise.all([
    prisma.sport.findMany({
      where: { active: true },
      select: { id: true, slug: true },
    }),
    prisma.componentPrice.findMany({
      where: { locationId: effectiveLocationId },
      select: { sportId: true, componentType: true, period: true },
    }),
  ]);

  const existingKeys = new Set(
    existingRows.map((row) => `${row.sportId}:${row.componentType}:${row.period}`),
  );
  const demoDefaults = new Map(
    demoComponentPrices.map((item) => [`${item.sport}:${item.componentType}:${item.tier}`, item.amount]),
  );

  const missingRows = sports.flatMap((sport) =>
    (["court", "instructor"] as const).flatMap((componentType) =>
      (["morning", "day", "evening_weekend"] as const)
        .filter((period) => !existingKeys.has(`${sport.id}:${componentType}:${period}`))
        .map((period) => ({
          locationId: effectiveLocationId,
          sportId: sport.id,
          componentType,
          period,
          currency: "KZT",
          amount: demoDefaults.get(`${sport.slug}:${componentType}:${period}`) ?? 0,
        })),
    ),
  );

  if (missingRows.length === 0) {
    return;
  }

  await prisma.componentPrice.createMany({
    data: missingRows,
  });
}

export async function getOpeningHours(locationId?: string): Promise<OpeningHourRecord[]> {
  const effectiveLocationId = await resolveLocationId(locationId);
  await ensureOpeningHoursDefaults(effectiveLocationId);
  const rows = await prisma.openingHour.findMany({
    where: { locationId: effectiveLocationId },
    orderBy: { dayOfWeek: "asc" },
  });
  return rows.map((row: { dayOfWeek: number; openTime: string; closeTime: string; active: boolean }) => ({
    dayOfWeek: row.dayOfWeek as OpeningHourRecord["dayOfWeek"],
    openTime: row.openTime,
    closeTime: row.closeTime,
    active: row.active,
  }));
}

export async function saveOpeningHoursFromForm(formData: FormData, locationId?: string) {
  const effectiveLocationId = await resolveLocationId(locationId);
  const rows = Array.from({ length: 7 }, (_, dayOfWeek) => {
    const parsed = z
      .object({
        openTime: hhmmSchema,
        closeTime: hhmmSchema,
        active: z.boolean(),
      })
      .safeParse({
        openTime: formData.get(`openTime_${dayOfWeek}`),
        closeTime: formData.get(`closeTime_${dayOfWeek}`),
        active: formData.get(`active_${dayOfWeek}`) === "on",
      });

    if (!parsed.success) {
      throw new Error(`Некорректные часы работы для дня ${dayOfWeek}`);
    }

    return {
      dayOfWeek,
      ...parsed.data,
    };
  });

  await prisma.$transaction(
    rows.map((row: { dayOfWeek: number; openTime: string; closeTime: string; active: boolean }) =>
      prisma.openingHour.upsert({
        where: {
          locationId_dayOfWeek: {
            locationId: effectiveLocationId,
            dayOfWeek: row.dayOfWeek,
          },
        },
        create: {
          ...row,
          locationId: effectiveLocationId,
        },
        update: row,
      }),
    ),
  );
}

export interface ComponentPriceMatrixRow {
  sportId: string;
  sport: string;
  sportName: string;
  componentType: "court" | "instructor";
  label: string;
  values: Record<PricingTier, number>;
}

export interface CourtBasePriceAdminRow {
  sportId: string;
  sport: string;
  sportName: string;
  label: string;
  values: {
    morning: number;
    evening_weekend: number;
  };
}

export async function getComponentPriceMatrix(locationId?: string): Promise<ComponentPriceMatrixRow[]> {
  const effectiveLocationId = await resolveLocationId(locationId);
  await ensureComponentPriceDefaults(effectiveLocationId);
  const rows = await prisma.componentPrice.findMany({
    where: { locationId: effectiveLocationId },
    include: {
      sport: {
        select: {
          id: true,
          slug: true,
          name: true,
          sortOrder: true,
        },
      },
    },
    orderBy: [
      { sport: { sortOrder: "asc" } },
      { sport: { name: "asc" } },
      { componentType: "asc" },
      { period: "asc" },
    ],
  });

  const grouped = new Map<string, ComponentPriceMatrixRow>();
  for (const row of rows) {
    const key = `${row.sport.slug}:${row.componentType}`;
    const current =
      grouped.get(key) ??
      {
        sportId: row.sport.id,
        sport: row.sport.slug,
        sportName: row.sport.name,
        componentType: row.componentType as "court" | "instructor",
        label: `${row.sport.name}: ${row.componentType === "court" ? "корт" : "тренер"}`,
        values: {
          morning: 0,
          day: 0,
          evening_weekend: 0,
        },
      };

    current.values[row.period as PricingTier] = Number(row.amount);
    grouped.set(key, current);
  }

  return Array.from(grouped.values());
}

export async function getCourtBasePriceMatrix(locationId?: string): Promise<CourtBasePriceAdminRow[]> {
  const matrix = await getComponentPriceMatrix(locationId);
  return matrix
    .filter((row) => row.componentType === "court")
    .map((row) => ({
      sportId: row.sportId,
      sport: row.sport,
      sportName: row.sportName,
      label: row.label,
      values: {
        morning: row.values.morning,
        evening_weekend: row.values.evening_weekend,
      },
    }));
}

export async function saveComponentPriceMatrixFromForm(formData: FormData, locationId?: string) {
  const effectiveLocationId = await resolveLocationId(locationId);
  await ensureComponentPriceDefaults(effectiveLocationId);

  const sports = await prisma.sport.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true },
  });
  const components = ["court", "instructor"] as const;
  const periods = ["morning", "day", "evening_weekend"] as const;

  const updates: Array<{
    sportId: string;
    componentType: (typeof components)[number];
    period: (typeof periods)[number];
    amount: number;
  }> = [];

  for (const sport of sports) {
    for (const componentType of components) {
      for (const period of periods) {
        const field = `${sport.slug}_${componentType}_${period}`;
        const parsed = z.coerce.number().int().nonnegative().safeParse(formData.get(field));
        if (!parsed.success) {
          throw new Error(`Некорректная цена в поле ${field}`);
        }
        updates.push({ sportId: sport.id, componentType, period, amount: parsed.data });
      }
    }
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.componentPrice.upsert({
        where: {
          locationId_sportId_componentType_period_currency: {
            locationId: effectiveLocationId,
            sportId: item.sportId,
            componentType: item.componentType,
            period: item.period,
            currency: "KZT",
          },
        },
        create: {
          locationId: effectiveLocationId,
          sportId: item.sportId,
          componentType: item.componentType,
          period: item.period,
          currency: "KZT",
          amount: item.amount,
        },
        update: {
          amount: item.amount,
        },
      }),
    ),
  );
}

export async function saveCourtBasePriceMatrixFromForm(formData: FormData, locationId?: string) {
  const effectiveLocationId = await resolveLocationId(locationId);
  await ensureComponentPriceDefaults(effectiveLocationId);

  const sports = await prisma.sport.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, slug: true },
  });
  const updates: Array<{
    sportId: string;
    period: "morning" | "day" | "evening_weekend";
    amount: number;
  }> = [];

  for (const sport of sports) {
    const morningField = `${sport.slug}_court_morning`;
    const eveningField = `${sport.slug}_court_evening_weekend`;

    const morningParsed = z.coerce.number().int().nonnegative().safeParse(formData.get(morningField));
    if (!morningParsed.success) {
      throw new Error(`Некорректная цена в поле ${morningField}`);
    }

    const eveningParsed = z.coerce.number().int().nonnegative().safeParse(formData.get(eveningField));
    if (!eveningParsed.success) {
      throw new Error(`Некорректная цена в поле ${eveningField}`);
    }

    updates.push(
      { sportId: sport.id, period: "morning", amount: morningParsed.data },
      { sportId: sport.id, period: "day", amount: morningParsed.data },
      { sportId: sport.id, period: "evening_weekend", amount: eveningParsed.data },
    );
  }

  await prisma.$transaction(
    updates.map((item) =>
      prisma.componentPrice.upsert({
        where: {
          locationId_sportId_componentType_period_currency: {
            locationId: effectiveLocationId,
            sportId: item.sportId,
            componentType: "court",
            period: item.period,
            currency: "KZT",
          },
        },
        create: {
          locationId: effectiveLocationId,
          sportId: item.sportId,
          componentType: "court",
          period: item.period,
          currency: "KZT",
          amount: item.amount,
        },
        update: {
          amount: item.amount,
        },
      }),
    ),
  );
}
