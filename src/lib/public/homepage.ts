import { prisma } from "@/src/lib/prisma";
import { getComponentPriceMatrix } from "@/src/lib/settings/service";

type PricingTier = "morning" | "evening_weekend";

export interface HomePriceBucket {
  code: "weekday_day" | "weekday_evening" | "weekend";
  label: string;
  timeRange: string;
  price: number;
}

export interface HomeSportSection {
  sport: string;
  sportName: string;
  title: string;
  subtitle: string;
  prices: HomePriceBucket[];
}

export interface HomeClubGroup {
  sport: string;
  sportName: string;
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
        sportId: true,
        sport: {
          select: {
            slug: true,
            name: true,
          },
        },
        notes: true,
      },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
    }),
  ]);

  const courtRows = matrix.filter((row) => row.componentType === "court");

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

  const sports: HomeSportSection[] = courtRows.map((courtRow) => {
    const courtByTier: Record<PricingTier, number> = {
      morning: courtRow?.values.morning ?? 0,
      evening_weekend: courtRow?.values.evening_weekend ?? 0,
    };

    return {
      sport: courtRow.sport,
      sportName: courtRow.sportName,
      title: courtRow.sportName,
      subtitle: "Аренда корта и тренировки",
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

  const clubGroupMap = new Map<
    string,
    { sport: string; sportName: string; courts: Array<{ id: string; name: string; notes: string | null }> }
  >();
  for (const court of courts) {
    const key = court.sport.slug;
    const current = clubGroupMap.get(key) ?? { sport: court.sport.slug, sportName: court.sport.name, courts: [] };
    current.courts.push({ id: court.id, name: court.name, notes: court.notes });
    clubGroupMap.set(key, current);
  }

  const clubGroups: HomeClubGroup[] = Array.from(clubGroupMap.values()).map((group) => {
    const items = group.courts;
    const notes = items.map((item) => item.notes?.trim()).filter((value): value is string => Boolean(value));
    const baseDescription = `В клубе ${items.length} активных кортов для спорта «${group.sportName}».`;

    return {
      sport: group.sport,
      sportName: group.sportName,
      title: `${group.sportName}-корты`,
      description: notes[0] ? `${baseDescription} ${notes[0]}` : baseDescription,
      count: items.length,
      courts: items,
    };
  });

  return { sports, clubGroups };
}
