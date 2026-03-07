import { auth } from "@/auth";
import { LiveBookingForm } from "@/src/components/booking/live-booking-form";
import { demoServices } from "@/src/lib/availability/demo";
import { parseBookingUrlState } from "@/src/lib/bookings/url-state";
import { demoComponentPrices } from "@/src/lib/pricing/demo";
import { bookPageContent, siteConfig } from "@/src/lib/content/site-data";
import { resolveLocationBySlug } from "@/src/lib/locations/service";
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
  sport: string;
  sportName: string;
  requiresCourt: boolean;
  requiresInstructor: boolean;
}

interface BookInstructorOption {
  id: string;
  name: string;
  sports: string[];
  sportPrices: Record<string, number>;
}

interface BookLocationOption {
  id: string;
  slug: string;
  name: string;
  address: string;
}

type CourtPriceMatrix = Record<string, Record<"morning" | "day" | "evening_weekend", number>>;

const DEMO_COURT_NAMES: Record<string, string> = {
  "padel-1": "Падел 1",
  "padel-2": "Падел 2",
  "padel-3": "Падел 3",
  "squash-1": "Сквош 1",
  "squash-2": "Сквош 2",
};

function getFallbackSportName(slug: string): string {
  if (slug === "padel") return "Падел";
  if (slug === "squash") return "Сквош";
  return slug;
}

async function getInitialCustomerProfile(userId?: string): Promise<{
  name?: string;
  email?: string;
  phone?: string;
  walletBalanceKzt?: number;
}> {
  if (!userId) {
    return {};
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { name: true, email: true, phone: true, walletBalance: true },
    });

    if (!user) return {};

    return {
      name: user.name || undefined,
      email: user.email || undefined,
      phone: user.phone || undefined,
      walletBalanceKzt: Number(user.walletBalance),
    };
  } catch {
    return {};
  }
}

async function getBookServices(locationId: string): Promise<BookServiceOption[]> {
  try {
    const rows = await prisma.service.findMany({
      where: {
        active: true,
        OR: [{ locationId: null }, { locationId }],
      },
      orderBy: [{ sport: { sortOrder: "asc" } }, { name: "asc" }],
      select: {
        code: true,
        name: true,
        sport: {
          select: {
            slug: true,
            name: true,
          },
        },
        requiresCourt: true,
        requiresInstructor: true,
      },
    });

    if (rows.length > 0) {
      return rows.map(
        (row: {
          code: string;
          name: string;
          sport: { slug: string; name: string };
          requiresCourt: boolean;
          requiresInstructor: boolean;
        }) => ({
          id: row.code,
          name: row.name,
          sport: row.sport.slug,
          sportName: row.sport.name,
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
      sportName: getFallbackSportName(service.sport),
      requiresCourt: service.requiresCourt,
      requiresInstructor: service.requiresInstructor,
    }));
}

async function getBookCourtNames(locationId: string): Promise<Record<string, string>> {
  try {
    const rows = await prisma.court.findMany({
      where: { active: true, locationId },
      select: { id: true, name: true },
      orderBy: [{ name: "asc" }],
    });

    if (rows.length > 0) {
      return Object.fromEntries(rows.map((row: { id: string; name: string }) => [row.id, row.name]));
    }
  } catch {
    // Fall back to demo labels if DB is unavailable.
  }

  return DEMO_COURT_NAMES;
}

async function getBookInstructors(locationId: string): Promise<BookInstructorOption[]> {
  try {
    const rows = await prisma.instructor.findMany({
      where: {
        active: true,
        instructorLocations: {
          some: {
            locationId,
            active: true,
          },
        },
      },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        instructorSports: {
          select: {
            pricePerHour: true,
            sport: {
              select: {
                slug: true,
              },
            },
          },
        },
      },
    });

    if (rows.length > 0) {
      return rows.map(
        (row: {
          id: string;
          name: string;
          instructorSports: Array<{ pricePerHour: unknown; sport: { slug: string } }>;
        }) => ({
          id: row.id,
          name: row.name,
          sports: row.instructorSports.map((item) => item.sport.slug),
          sportPrices: Object.fromEntries(
            row.instructorSports.map((item) => [item.sport.slug, Number(item.pricePerHour)]),
          ),
        }),
      );
    }
  } catch {
    // Fallback below
  }

  return [
    {
      id: "coach-1",
      name: "Тренер Падел",
      sports: ["padel"],
      sportPrices: { padel: 9000 },
    },
    {
      id: "coach-2",
      name: "Тренер Сквош",
      sports: ["squash"],
      sportPrices: { squash: 7000 },
    },
  ];
}

async function getCourtPriceMatrix(locationId: string): Promise<CourtPriceMatrix> {
  const base: CourtPriceMatrix = {};

  try {
    const rows = await prisma.componentPrice.findMany({
      where: {
        locationId,
        componentType: "court",
        currency: "KZT",
      },
      select: {
        sport: {
          select: {
            slug: true,
          },
        },
        period: true,
        amount: true,
      },
    });
    if (rows.length > 0) {
      for (const row of rows as Array<{
        sport: { slug: string };
        period: "morning" | "day" | "evening_weekend";
        amount: unknown;
      }>) {
        const sportSlug = row.sport.slug;
        if (!base[sportSlug]) {
          base[sportSlug] = { morning: 0, day: 0, evening_weekend: 0 };
        }
        if (row.period !== "day") {
          base[sportSlug][row.period] = Number(row.amount);
        }
        base[sportSlug].day = base[sportSlug].morning;
      }
      return base;
    }
  } catch {
    // fallback below
  }

  for (const item of demoComponentPrices) {
    if (item.componentType === "court" && item.currency === "KZT") {
      if (!base[item.sport]) {
        base[item.sport] = { morning: 0, day: 0, evening_weekend: 0 };
      }
      if (item.tier !== "day") {
        base[item.sport][item.tier] = item.amount;
      }
      base[item.sport].day = base[item.sport].morning;
    }
  }
  return base;
}

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  const params = await searchParams;
  const bookingUrlState = parseBookingUrlState(params);
  const requestedLocationSlug = Array.isArray(params.location) ? params.location[0] : params.location;

  let selectedLocation: BookLocationOption = {
    id: "fallback-main",
    slug: "main",
    name: siteConfig.name,
    address: siteConfig.address,
  };
  let locationOptions: BookLocationOption[] = [selectedLocation];

  try {
    const locationSelection = await resolveLocationBySlug(requestedLocationSlug);
    selectedLocation = {
      id: locationSelection.selected.id,
      slug: locationSelection.selected.slug,
      name: locationSelection.selected.name,
      address: locationSelection.selected.address,
    };
    locationOptions = locationSelection.activeLocations.map((location) => ({
      id: location.id,
      slug: location.slug,
      name: location.name,
      address: location.address,
    }));
  } catch {
    // Keep booking page available even if location table is not ready.
  }

  const [services, courtNames, instructors, courtPrices, initialCustomer] = await Promise.all([
    getBookServices(selectedLocation.id),
    getBookCourtNames(selectedLocation.id),
    getBookInstructors(selectedLocation.id),
    getCourtPriceMatrix(selectedLocation.id),
    getInitialCustomerProfile(session?.user?.id),
  ]);

  return (
    <div className="booking-page">
      <LiveBookingForm
        locations={locationOptions}
        selectedLocationSlug={selectedLocation.slug}
        services={services}
        courtNames={courtNames}
        instructors={instructors}
      courtPrices={courtPrices}
      isAuthenticated={Boolean(session?.user?.id)}
      initialCustomer={initialCustomer}
      initialWalletBalanceKzt={initialCustomer.walletBalanceKzt ?? null}
      initialSelection={bookingUrlState}
    />

      <section className="booking-flow" aria-labelledby="booking-notes-title">
        <h2 id="booking-notes-title" className="booking-flow__title">
          {bookPageContent.notesTitle}
        </h2>
        <div className="booking-flow__section">
          {bookPageContent.notices.map((notice) => (
            <p key={notice} className="booking-flow__notice">
              {notice}
            </p>
          ))}
        </div>
      </section>
    </div>
  );
}
