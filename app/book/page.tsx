import { auth } from "@/auth";
import { PageHero } from "@/src/components/page-hero";
import { LiveBookingForm } from "@/src/components/booking/live-booking-form";
import { demoServices } from "@/src/lib/availability/demo";
import { demoComponentPrices } from "@/src/lib/pricing/demo";
import { bookPageContent, courtItems } from "@/src/lib/content/site-data";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Забронировать | Padel & Squash KZ",
  description: "Онлайн-запись на падел и сквош: выберите спорт, формат занятия, дату и свободные слоты. Для тренировок сначала выберите тренера.",
  path: "/book",
});

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
  sports: Array<"padel" | "squash">;
  pricePerHour: number;
}

type CourtPriceMatrix = Record<"padel" | "squash", Record<"morning" | "day" | "evening_weekend", number>>;

async function getInitialCustomerProfile(userId?: string): Promise<{
  name?: string;
  email?: string;
  phone?: string;
}> {
  if (!userId) {
    return {};
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true },
    });

    if (!user) return {};

    return {
      name: user.name || undefined,
      email: user.email || undefined,
      phone: user.phone || undefined,
    };
  } catch {
    return {};
  }
}

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
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        sports: true,
        pricePerHour: true,
      },
    });

    if (rows.length > 0) {
      return rows.map(
        (row: {
          id: string;
          name: string;
          sports: Array<"padel" | "squash">;
          pricePerHour: unknown;
        }) => ({
          id: row.id,
          name: row.name,
          sports: row.sports,
          pricePerHour: Number(row.pricePerHour),
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
      sports: ["padel"],
      pricePerHour: 9000,
    },
    {
      id: "coach-2",
      name: "Тренер Сквош (demo)",
      sports: ["squash"],
      pricePerHour: 7000,
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
        if (row.period !== "day") {
          base[row.sport][row.period] = Number(row.amount);
        }
      }
      base.padel.day = base.padel.morning;
      base.squash.day = base.squash.morning;
      return base;
    }
  } catch {
    // fallback below
  }

  for (const item of demoComponentPrices) {
    if (item.componentType === "court" && item.currency === "KZT") {
      if (item.tier !== "day") {
        base[item.sport][item.tier] = item.amount;
      }
    }
  }
  base.padel.day = base.padel.morning;
  base.squash.day = base.squash.morning;
  return base;
}

export default async function BookPage() {
  const session = await auth();
  const [services, courtNames, instructors, courtPrices, initialCustomer] = await Promise.all([
    getBookServices(),
    getBookCourtNames(),
    getBookInstructors(),
    getCourtPriceMatrix(),
    getInitialCustomerProfile(session?.user?.id),
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
        initialCustomer={initialCustomer}
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
