import { prisma } from "@/src/lib/prisma";
import { getComponentPriceMatrix } from "@/src/lib/settings/service";

type SportKey = "padel" | "squash";
type PricingTier = "morning" | "evening_weekend";

export interface HomePriceBucket {
  code: "weekday_day" | "weekday_evening" | "weekend";
  label: string;
  timeRange: string;
  price: number;
}

export interface HomeSportSection {
  sport: SportKey;
  title: string;
  subtitle: string;
  prices: HomePriceBucket[];
}

export interface HomeClubGroup {
  sport: SportKey;
  title: string;
  description: string;
  count: number;
  courts: Array<{
    id: string;
    name: string;
    notes: string | null;
  }>;
}

export async function getHomepageData(): Promise<{
  sports: HomeSportSection[];
  clubGroups: HomeClubGroup[];
}> {
  const [matrix, courts] = await Promise.all([
    getComponentPriceMatrix(),
    prisma.court.findMany({
      where: { active: true },
      select: {
        id: true,
        name: true,
        sport: true,
        notes: true,
      },
      orderBy: [{ sport: "asc" }, { name: "asc" }],
    }),
  ]);

  const courtMatrixBySport = {
    padel: matrix.find((row) => row.sport === "padel" && row.componentType === "court"),
    squash: matrix.find((row) => row.sport === "squash" && row.componentType === "court"),
  };

  const buckets = [
    { code: "weekday_day" as const, label: "Будни", timeRange: "08:00-17:00", tier: "morning" as PricingTier },
    {
      code: "weekday_evening" as const,
      label: "Будни",
      timeRange: "17:00-23:00",
      tier: "evening_weekend" as PricingTier,
    },
    { code: "weekend" as const, label: "Выходные", timeRange: "08:00-23:00", tier: "evening_weekend" as PricingTier },
  ];

  const sports: HomeSportSection[] = ([
    { sport: "padel" as const, title: "Падел", subtitle: "Аренда корта и тренировки" },
    { sport: "squash" as const, title: "Сквош", subtitle: "Аренда корта и тренировки" },
  ] as const).map((config) => {
    const courtRow = courtMatrixBySport[config.sport];
    const courtByTier: Record<PricingTier, number> = {
      morning: courtRow?.values.morning ?? 0,
      evening_weekend: courtRow?.values.evening_weekend ?? 0,
    };

    return {
      ...config,
      prices: buckets.map((bucket) => {
        return {
          code: bucket.code,
          label: bucket.label,
          timeRange: bucket.timeRange,
          price: courtByTier[bucket.tier] ?? 0,
        };
      }),
    };
  });

  const clubGroups: HomeClubGroup[] = (["padel", "squash"] as const).map((sport) => {
    const items = courts.filter((court) => court.sport === sport);
    const notes = items.map((item) => item.notes?.trim()).filter((value): value is string => Boolean(value));
    const baseDescription =
      sport === "padel"
        ? `В клубе ${items.length} активных падел-кортов.`
        : `В клубе ${items.length} активных сквош-кортов.`;

    return {
      sport,
      title: sport === "padel" ? "Падел-корты" : "Сквош-корты",
      description: notes[0] ? `${baseDescription} ${notes[0]}` : `${baseDescription} Фото и подробные описания добавим позже.`,
      count: items.length,
      courts: items.map((item) => ({
        id: item.id,
        name: item.name,
        notes: item.notes,
      })),
    };
  });

  return { sports, clubGroups };
}
