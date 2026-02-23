import { auth } from "@/auth";
import { PageHero } from "@/src/components/page-hero";
import { LiveBookingForm } from "@/src/components/booking/live-booking-form";
import { demoServices } from "@/src/lib/availability/demo";
import { demoComponentPrices } from "@/src/lib/pricing/demo";
import { bookPageContent, courtItems } from "@/src/lib/content/site-data";
import { prisma } from "@/src/lib/prisma";

export const metadata = {
  title: "Забронировать | Padel & Squash KZ",
};

export const dynamic = "force-dynamic";

interface BookServiceOption {
  id: string;
  name: string;
  sport: "padel" | "squash";
  requiresCourt: boolean;
  requiresInstructor: boolean;
}

interface BookInstructorOption {
  id: string;
  name: string;
  sport: "padel" | "squash";
  prices: {
    morning: number;
    day: number;
    evening_weekend: number;
  };
}

type CourtPriceMatrix = Record<"padel" | "squash", Record<"morning" | "day" | "evening_weekend", number>>;

async function getBookServices(): Promise<BookServiceOption[]> {
  try {
    const rows = await prisma.service.findMany({
      where: { active: true },
      orderBy: [{ sport: "asc" }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        sport: true,
        requiresCourt: true,
        requiresInstructor: true,
      },
    });

    if (rows.length > 0) {
      return rows.map(
        (row: {
          code: string;
          name: string;
          sport: "padel" | "squash";
          requiresCourt: boolean;
          requiresInstructor: boolean;
        }) => ({
          id: row.code,
          name: row.name,
          sport: row.sport,
          requiresCourt: row.requiresCourt,
          requiresInstructor: row.requiresInstructor,
        }),
      );
    }
  } catch {
    // Fall back to demo services if DB is unavailable.
  }

  return demoServices
    .filter((service) => service.active)
    .map((service) => ({
      id: service.id,
      name: service.name,
      sport: service.sport,
      requiresCourt: service.requiresCourt,
      requiresInstructor: service.requiresInstructor,
    }));
}

async function getBookCourtNames(): Promise<Record<string, string>> {
  try {
    const rows = await prisma.court.findMany({
      where: { active: true },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    });

    if (rows.length > 0) {
      return Object.fromEntries(rows.map((row: { id: string; name: string }) => [row.id, row.name]));
    }
  } catch {
    // Fall back to demo labels if DB is unavailable.
  }

  return Object.fromEntries(courtItems.map((court) => [court.id, court.name]));
}

async function getBookInstructors(): Promise<BookInstructorOption[]> {
  try {
    const rows = await prisma.instructor.findMany({
      where: { active: true },
      orderBy: [{ sport: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        sport: true,
        priceMorning: true,
        priceDay: true,
        priceEveningWeekend: true,
      },
    });

    if (rows.length > 0) {
      return rows.map(
        (row: {
          id: string;
          name: string;
          sport: "padel" | "squash";
          priceMorning: unknown;
          priceDay: unknown;
          priceEveningWeekend: unknown;
        }) => ({
          id: row.id,
          name: row.name,
          sport: row.sport,
          prices: {
            morning: Number(row.priceMorning),
            day: Number(row.priceDay),
            evening_weekend: Number(row.priceEveningWeekend),
          },
        }),
      );
    }
  } catch {
    // Fallback below
  }

  return [
    {
      id: "coach-1",
      name: "Тренер Падел (demo)",
      sport: "padel",
      prices: { morning: 9000, day: 10000, evening_weekend: 11500 },
    },
    {
      id: "coach-2",
      name: "Тренер Сквош (demo)",
      sport: "squash",
      prices: { morning: 7000, day: 8000, evening_weekend: 9500 },
    },
  ];
}

async function getCourtPriceMatrix(): Promise<CourtPriceMatrix> {
  const base: CourtPriceMatrix = {
    padel: { morning: 0, day: 0, evening_weekend: 0 },
    squash: { morning: 0, day: 0, evening_weekend: 0 },
  };

  try {
    const rows = await prisma.componentPrice.findMany({
      where: { componentType: "court", currency: "KZT" },
      select: { sport: true, period: true, amount: true },
    });
    if (rows.length > 0) {
      for (const row of rows as Array<{
        sport: "padel" | "squash";
        period: "morning" | "day" | "evening_weekend";
        amount: unknown;
      }>) {
        base[row.sport][row.period] = Number(row.amount);
      }
      return base;
    }
  } catch {
    // fallback below
  }

  for (const item of demoComponentPrices) {
    if (item.componentType === "court" && item.currency === "KZT") {
      base[item.sport][item.tier] = item.amount;
    }
  }
  return base;
}

export default async function BookPage() {
  const [session, services, courtNames, instructors, courtPrices] = await Promise.all([
    auth(),
    getBookServices(),
    getBookCourtNames(),
    getBookInstructors(),
    getCourtPriceMatrix(),
  ]);

  return (
    <div className="booking-page">
      <PageHero
        eyebrow={bookPageContent.hero.eyebrow}
        title={bookPageContent.hero.title}
        description={bookPageContent.hero.description}
      />

      <LiveBookingForm
        services={services}
        courtNames={courtNames}
        instructors={instructors}
        courtPrices={courtPrices}
        isAuthenticated={Boolean(session?.user?.id)}
        initialCustomer={{
          name: session?.user?.name ?? undefined,
          email: session?.user?.email ?? undefined,
          phone: undefined,
        }}
      />

      <section className="booking-flow" aria-labelledby="booking-notes-title">
        <h2 id="booking-notes-title" className="booking-flow__title">
          {bookPageContent.notesTitle}
        </h2>
        <div className="booking-flow__panel">
          {bookPageContent.notices.map((notice) => (
            <div key={notice} className="booking-flow__notice">
              {notice}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
