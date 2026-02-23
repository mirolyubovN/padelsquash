import { z } from "zod";
import { prisma } from "@/src/lib/prisma";
import { demoComponentPrices, demoOpeningHours } from "@/src/lib/demo/hardcoded-data";
import type { ComponentPriceRecord, OpeningHourRecord, PricingTier } from "@/src/lib/domain/types";

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

const hhmmSchema = z.string().regex(/^\d{2}:\d{2}$/, "Формат времени должен быть HH:MM");

export async function ensureOpeningHoursDefaults() {
  const count = await prisma.openingHour.count();
  if (count > 0) {
    return;
  }

  await prisma.openingHour.createMany({
    data: demoOpeningHours.map((item: OpeningHourRecord) => ({
      dayOfWeek: item.dayOfWeek,
      openTime: item.openTime,
      closeTime: item.closeTime,
      active: item.active,
    })),
  });
}

export async function ensureComponentPriceDefaults() {
  const count = await prisma.componentPrice.count();
  if (count > 0) {
    return;
  }

  await prisma.componentPrice.createMany({
    data: demoComponentPrices.map((item: ComponentPriceRecord) => ({
      sport: item.sport,
      componentType: item.componentType,
      period: item.tier,
      currency: item.currency,
      amount: item.amount,
    })),
  });
}

export async function getOpeningHours(): Promise<OpeningHourRecord[]> {
  await ensureOpeningHoursDefaults();
  const rows = await prisma.openingHour.findMany({ orderBy: { dayOfWeek: "asc" } });
  return rows.map((row: { dayOfWeek: number; openTime: string; closeTime: string; active: boolean }) => ({
    dayOfWeek: row.dayOfWeek as OpeningHourRecord["dayOfWeek"],
    openTime: row.openTime,
    closeTime: row.closeTime,
    active: row.active,
  }));
}

export async function saveOpeningHoursFromForm(formData: FormData) {
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
        where: { dayOfWeek: row.dayOfWeek },
        create: row,
        update: row,
      }),
    ),
  );
}

export interface ComponentPriceMatrixRow {
  sport: "padel" | "squash";
  componentType: "court" | "instructor";
  label: string;
  values: Record<PricingTier, number>;
}

export async function getComponentPriceMatrix(): Promise<ComponentPriceMatrixRow[]> {
  await ensureComponentPriceDefaults();
  const rows = await prisma.componentPrice.findMany({
    orderBy: [{ sport: "asc" }, { componentType: "asc" }, { period: "asc" }],
  });

  const keyMap = new Map<string, ComponentPriceRecord>();
  for (const row of rows as Array<{
    id: string;
    sport: "padel" | "squash";
    componentType: "court" | "instructor";
    period: PricingTier;
    currency: string;
    amount: unknown;
  }>) {
    const record: ComponentPriceRecord = {
      id: row.id,
      sport: row.sport,
      componentType: row.componentType,
      tier: row.period,
      currency: row.currency,
      amount: Number(row.amount),
    };
    keyMap.set(`${record.sport}:${record.componentType}:${record.tier}`, record);
  }

  const combos: Array<{ sport: "padel" | "squash"; componentType: "court" | "instructor"; label: string }> =
    [
      { sport: "padel", componentType: "court", label: "Падел: корт" },
      { sport: "padel", componentType: "instructor", label: "Падел: тренер" },
      { sport: "squash", componentType: "court", label: "Сквош: корт" },
      { sport: "squash", componentType: "instructor", label: "Сквош: тренер" },
    ];

  return combos.map((combo) => ({
    ...combo,
    values: {
      morning: keyMap.get(`${combo.sport}:${combo.componentType}:morning`)?.amount ?? 0,
      day: keyMap.get(`${combo.sport}:${combo.componentType}:day`)?.amount ?? 0,
      evening_weekend:
        keyMap.get(`${combo.sport}:${combo.componentType}:evening_weekend`)?.amount ?? 0,
    },
  }));
}

export async function saveComponentPriceMatrixFromForm(formData: FormData) {
  await ensureComponentPriceDefaults();

  const sports = ["padel", "squash"] as const;
  const components = ["court", "instructor"] as const;
  const periods = ["morning", "day", "evening_weekend"] as const;

  const updates: Array<{
    sport: (typeof sports)[number];
    componentType: (typeof components)[number];
    period: (typeof periods)[number];
    amount: number;
  }> = [];

  for (const sport of sports) {
    for (const componentType of components) {
      for (const period of periods) {
        const field = `${sport}_${componentType}_${period}`;
        const parsed = z.coerce.number().int().nonnegative().safeParse(formData.get(field));
        if (!parsed.success) {
          throw new Error(`Некорректная цена в поле ${field}`);
        }
        updates.push({ sport, componentType, period, amount: parsed.data });
      }
    }
  }

  await prisma.$transaction(
    updates.map((item: {
      sport: "padel" | "squash";
      componentType: "court" | "instructor";
      period: "morning" | "day" | "evening_weekend";
      amount: number;
    }) =>
      prisma.componentPrice.upsert({
        where: {
          sport_componentType_period_currency: {
            sport: item.sport,
            componentType: item.componentType,
            period: item.period,
            currency: "KZT",
          },
        },
        create: {
          sport: item.sport,
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
