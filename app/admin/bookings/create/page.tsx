import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { CreateBookingForm, type CreateBookingActionResult } from "@/src/components/admin/create-booking-form";
import { getAdminInstructors, getAdminServices, getAdminSportOptions } from "@/src/lib/admin/resources";
import { assertAdmin } from "@/src/lib/auth/guards";
import { createBookingInDb, InsufficientWalletBalanceError, type BookingPaymentMode } from "@/src/lib/bookings/persistence";
import { demoComponentPrices } from "@/src/lib/pricing/demo";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Создать бронирование | Админ",
  description: "Ручное создание бронирования от имени клиента.",
  path: "/admin/bookings/create",
  noIndex: true,
});

export const dynamic = "force-dynamic";

type PricingTier = "morning" | "day" | "evening_weekend";
type CourtPriceMatrix = Record<string, Record<PricingTier, number>>;
type LocationCourtPriceMatrix = Record<string, CourtPriceMatrix>;

interface ParsedSlotCourt {
  startTime: string;
  courtId: string;
  holdId?: string;
}

async function getAdminLocations() {
  try {
    const rows = await prisma.location.findMany({
      where: { active: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      select: { id: true, slug: true, name: true },
    });
    if (rows.length > 0) {
      return rows;
    }
  } catch {
    // fallback below
  }

  return [{ id: "fallback", slug: "main", name: "Основная локация" }];
}

function createDemoCourtPriceMatrix(): CourtPriceMatrix {
  const matrix: CourtPriceMatrix = {};

  for (const item of demoComponentPrices) {
    if (item.componentType !== "court" || item.currency !== "KZT") {
      continue;
    }
    if (!matrix[item.sport]) {
      matrix[item.sport] = { morning: 0, day: 0, evening_weekend: 0 };
    }
    if (item.tier !== "day") {
      matrix[item.sport][item.tier] = item.amount;
    }
    matrix[item.sport].day = matrix[item.sport].morning;
  }

  return matrix;
}

async function getCourtPricesByLocation(locations: Array<{ id: string; slug: string }>): Promise<LocationCourtPriceMatrix> {
  const matrixByLocation = Object.fromEntries(
    locations.map((location) => [location.slug, {} as CourtPriceMatrix]),
  ) as LocationCourtPriceMatrix;
  const demoMatrix = createDemoCourtPriceMatrix();

  try {
    const rows = await prisma.componentPrice.findMany({
      where: {
        locationId: { in: locations.map((location) => location.id) },
        componentType: "court",
        currency: "KZT",
      },
      select: {
        locationId: true,
        sport: {
          select: {
            slug: true,
          },
        },
        period: true,
        amount: true,
      },
    });

    const locationSlugById = new Map(locations.map((location) => [location.id, location.slug]));
    for (const row of rows) {
      const locationSlug = locationSlugById.get(row.locationId);
      if (!locationSlug) {
        continue;
      }
      const target = matrixByLocation[locationSlug];
      if (!target[row.sport.slug]) {
        target[row.sport.slug] = { morning: 0, day: 0, evening_weekend: 0 };
      }
      if (row.period !== "day") {
        target[row.sport.slug][row.period] = Number(row.amount);
      }
      target[row.sport.slug].day = target[row.sport.slug].morning;
    }
  } catch {
    // fallback below
  }

  for (const location of locations) {
    if (Object.keys(matrixByLocation[location.slug] ?? {}).length === 0) {
      matrixByLocation[location.slug] = demoMatrix;
    }
  }

  return matrixByLocation;
}

async function ensureAdminBookingCustomer(args: {
  email: string;
  name: string;
  phone: string;
}) {
  const normalizedEmail = args.email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Укажите email клиента");
  }

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: {
      id: true,
      role: true,
      name: true,
      phone: true,
      email: true,
    },
  });

  if (existing && existing.role !== "customer") {
    throw new Error("Для ручного бронирования можно использовать только клиентский аккаунт");
  }

  if (existing) {
    if (existing.name !== args.name || existing.phone !== args.phone) {
      return prisma.user.update({
        where: { id: existing.id },
        data: {
          name: args.name,
          phone: args.phone,
        },
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
        },
      });
    }

    return existing;
  }

  return prisma.user.create({
    data: {
      name: args.name,
      email: normalizedEmail,
      phone: args.phone,
      passwordHash: "admin-wallet-topup-placeholder",
      role: "customer",
    },
    select: {
      id: true,
      name: true,
      phone: true,
      email: true,
    },
  });
}

function parseSelectedSlotCourts(formData: FormData): ParsedSlotCourt[] {
  const holdBySlotKey = new Map<string, string>();
  for (const rawValue of formData.getAll("slotHold")) {
    const raw = String(rawValue ?? "").trim();
    if (!raw) {
      continue;
    }
    const [startTime, courtId, holdId] = raw.split("|");
    if (!startTime || !courtId || !holdId) {
      continue;
    }
    if (!/^\d{2}:00$/.test(startTime)) {
      continue;
    }
    holdBySlotKey.set(`${startTime}|${courtId}`, holdId);
  }

  const parsedSelections = new Map<string, ParsedSlotCourt>();
  for (const rawValue of formData.getAll("slotCourt")) {
    const raw = String(rawValue ?? "").trim();
    if (!raw) {
      continue;
    }
    const [startTime, courtId] = raw.split("|");
    if (!startTime || !courtId || !/^\d{2}:00$/.test(startTime)) {
      continue;
    }
    const key = `${startTime}|${courtId}`;
    parsedSelections.set(key, {
      startTime,
      courtId,
      holdId: holdBySlotKey.get(key),
    });
  }

  if (parsedSelections.size === 0) {
    const fallbackStartTime = String(formData.get("startTime") ?? "").trim();
    const fallbackCourtId = String(formData.get("courtId") ?? "").trim();
    if (/^\d{2}:00$/.test(fallbackStartTime) && fallbackCourtId) {
      const key = `${fallbackStartTime}|${fallbackCourtId}`;
      parsedSelections.set(key, {
        startTime: fallbackStartTime,
        courtId: fallbackCourtId,
        holdId: holdBySlotKey.get(key),
      });
    }
  }

  return Array.from(parsedSelections.values()).sort((a, b) =>
    a.startTime === b.startTime ? a.courtId.localeCompare(b.courtId) : a.startTime.localeCompare(b.startTime),
  );
}

export default async function AdminCreateBookingPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; time?: string; court?: string; location?: string; customerEmail?: string }>;
}) {
  await assertAdmin();

  const [params, sports, services, instructors, locations] = await Promise.all([
    searchParams,
    getAdminSportOptions(),
    getAdminServices(),
    getAdminInstructors(),
    getAdminLocations(),
  ]);

  const [courts, courtPricesByLocation] = await Promise.all([
    prisma.court.findMany({
      where: { active: true },
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        sport: { select: { slug: true } },
        location: { select: { slug: true } },
      },
    }),
    getCourtPricesByLocation(locations),
  ]);

  const defaultLocationSlug = locations[0]?.slug ?? "main";

  const sportOptions = sports.map((sport) => ({ id: sport.id, slug: sport.slug, name: sport.name }));
  const serviceOptions = services
    .filter((service) => service.active)
    .map((service) => ({
      code: service.code,
      name: service.name,
      sportSlug: service.sportSlug,
      requiresInstructor: service.requiresInstructor,
    }));
  const instructorOptions = instructors
    .filter((instructor) => instructor.active)
    .map((instructor) => ({
      id: instructor.id,
      name: instructor.name,
      sportSlugs: instructor.sports.map((sport) => sport.slug),
      sportPrices: Object.fromEntries(instructor.sports.map((sport) => [sport.slug, sport.pricePerHour])),
    }));
  const locationOptions = locations.map((location) => ({ id: location.id, slug: location.slug, name: location.name }));

  const initialDate = /^\d{4}-\d{2}-\d{2}$/.test(params.date ?? "") ? params.date : undefined;
  const initialStartTime = /^\d{2}:00$/.test(params.time ?? "") ? params.time : undefined;
  const requestedCustomerEmail = params.customerEmail?.trim().toLowerCase();

  const selectedCourt = params.court
    ? await prisma.court.findUnique({
        where: { id: params.court },
        select: {
          id: true,
          sport: { select: { slug: true } },
          location: { select: { slug: true } },
        },
      })
    : null;

  const selectedCustomer = requestedCustomerEmail
    ? await prisma.user.findUnique({
        where: { email: requestedCustomerEmail },
        select: {
          id: true,
          role: true,
          name: true,
          phone: true,
          email: true,
          walletBalance: true,
        },
      })
    : null;

  const initialLocationSlug = selectedCourt?.location.slug ?? params.location?.trim() ?? defaultLocationSlug;
  const initialSportSlug = selectedCourt?.sport.slug ?? sportOptions[0]?.slug ?? "";
  const initialServiceCode =
    serviceOptions.find((service) => service.sportSlug === initialSportSlug && !service.requiresInstructor)?.code ??
    serviceOptions.find((service) => service.sportSlug === initialSportSlug)?.code ??
    "";

  async function createBookingAction(formData: FormData): Promise<CreateBookingActionResult> {
    "use server";
    await assertAdmin();

    const locationSlug = String(formData.get("locationSlug") ?? "").trim();
    const serviceCode = String(formData.get("serviceCode") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();
    const instructorId = String(formData.get("instructorId") ?? "").trim() || undefined;
    const customerName = String(formData.get("customerName") ?? "").trim();
    const customerPhone = String(formData.get("customerPhone") ?? "").trim();
    const customerEmail = String(formData.get("customerEmail") ?? "").trim().toLowerCase();
    const paymentModeRaw = String(formData.get("paymentMode") ?? "auto").trim();
    const paymentMode: BookingPaymentMode =
      paymentModeRaw === "wallet" || paymentModeRaw === "cash" || paymentModeRaw === "auto" ? paymentModeRaw : "auto";
    const selectedSlotCourts = parseSelectedSlotCourts(formData);

    if (!serviceCode || !date || !customerName || !customerPhone || !customerEmail) {
      return { error: "Заполните все обязательные поля" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Некорректный формат даты" };
    }

    if (selectedSlotCourts.length === 0) {
      return { error: "Выберите хотя бы один слот и корт" };
    }

    let locationId: string;
    try {
      const location = await prisma.location.findFirst({
        where: { slug: locationSlug, active: true },
        select: { id: true },
      });
      if (!location) {
        const fallback = await prisma.location.findFirst({
          where: { active: true },
          select: { id: true },
        });
        if (!fallback) {
          return { error: "Локация не найдена" };
        }
        locationId = fallback.id;
      } else {
        locationId = location.id;
      }
    } catch {
      return { error: "Ошибка при поиске локации" };
    }

    try {
      const customerUser = await ensureAdminBookingCustomer({
        name: customerName,
        phone: customerPhone,
        email: customerEmail,
      });

      const createdSessions: NonNullable<CreateBookingActionResult["createdSessions"]> = [];
      const failures: string[] = [];

      for (const selection of selectedSlotCourts) {
        try {
          const created = await createBookingInDb({
            serviceCode,
            locationId,
            date,
            startTime: selection.startTime,
            durationMin: 60,
            courtId: selection.courtId,
            instructorId,
            holdId: selection.holdId,
            paymentMode,
            allowCurrentHourLateBooking: true,
            customerUserId: customerUser.id,
            customer: {
              name: customerUser.name,
              email: customerUser.email,
              phone: customerUser.phone,
            },
          });

          createdSessions.push({
            bookingId: created.booking.id,
            startTime: selection.startTime,
            courtId: selection.courtId,
            amountKzt: created.booking.priceTotal,
          });
        } catch (error) {
          if (error instanceof InsufficientWalletBalanceError) {
            return {
              error: `Недостаточно средств на балансе. Нужно минимум ${error.shortfallKzt.toLocaleString("ru-KZ")} KZT доплаты.`,
              warning:
                createdSessions.length > 0
                  ? `Создано ${createdSessions.length} из ${selectedSlotCourts.length}. Остальные слоты ожидают пополнения.`
                  : undefined,
              holdId: error.holdId,
              insufficientSlotKey: `${selection.startTime}|${selection.courtId}`,
              shortfallKzt: error.shortfallKzt,
              currentBalanceKzt: error.currentBalanceKzt,
              amountRequiredKzt: error.amountRequiredKzt,
              successCount: createdSessions.length,
              totalCount: selectedSlotCourts.length,
              createdSessions,
            };
          }

          failures.push(
            `${selection.startTime} (${selection.courtId}): ${
              error instanceof Error ? error.message : "Ошибка создания бронирования"
            }`,
          );
        }
      }

      if (createdSessions.length === 0) {
        return {
          error: failures[0] ?? "Ошибка создания бронирования",
          successCount: 0,
          totalCount: selectedSlotCourts.length,
        };
      }

      if (failures.length > 0) {
        return {
          warning: `Создано ${createdSessions.length} из ${selectedSlotCourts.length}. ${failures[0]}`,
          successCount: createdSessions.length,
          totalCount: selectedSlotCourts.length,
          createdSessions,
        };
      }

      return {
        successCount: createdSessions.length,
        totalCount: selectedSlotCourts.length,
        createdSessions,
      };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Ошибка создания бронирования" };
    }
  }

  return (
    <AdminPageShell
      title="Создать бронирование"
      description="Создание бронирования в интерфейсе, повторяющем клиентский booking-flow: спорт, услуга, тренер, время/корт и итоговая стоимость."
    >
      <CreateBookingForm
        sports={sportOptions}
        services={serviceOptions}
        instructors={instructorOptions}
        courtPricesByLocation={courtPricesByLocation}
        locations={locationOptions}
        courts={courts.map((court) => ({
          id: court.id,
          name: court.name,
          sportSlug: court.sport.slug,
          locationSlug: court.location.slug,
        }))}
        defaultLocationSlug={defaultLocationSlug}
        initialLocationSlug={initialLocationSlug}
        initialSportSlug={initialSportSlug}
        initialServiceCode={initialServiceCode}
        initialDate={initialDate}
        initialStartTime={initialStartTime}
        initialCourtId={selectedCourt?.id}
        initialCustomerName={selectedCustomer?.role === "customer" ? selectedCustomer.name : undefined}
        initialCustomerPhone={selectedCustomer?.role === "customer" ? selectedCustomer.phone : undefined}
        initialCustomerEmail={selectedCustomer?.role === "customer" ? selectedCustomer.email : requestedCustomerEmail}
        initialCustomerBalanceKzt={selectedCustomer?.role === "customer" ? Number(selectedCustomer.walletBalance) : null}
        createAction={createBookingAction}
      />
    </AdminPageShell>
  );
}
