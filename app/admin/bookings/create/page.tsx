import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { CreateBookingForm } from "@/src/components/admin/create-booking-form";
import { assertAdmin } from "@/src/lib/auth/guards";
import { getAdminSportOptions, getAdminServices, getAdminInstructors } from "@/src/lib/admin/resources";
import { createBookingInDb, InsufficientWalletBalanceError } from "@/src/lib/bookings/persistence";
import { prisma } from "@/src/lib/prisma";
import { buildPageMetadata } from "@/src/lib/seo/metadata";

export const metadata = buildPageMetadata({
  title: "Создать бронирование | Админ",
  description: "Ручное создание бронирования от имени клиента.",
  path: "/admin/bookings/create",
  noIndex: true,
});

export const dynamic = "force-dynamic";

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
        },
      })
    : null;

  const initialLocationSlug = selectedCourt?.location.slug ?? params.location?.trim() ?? defaultLocationSlug;
  const initialSportSlug = selectedCourt?.sport.slug ?? sportOptions[0]?.slug ?? "";
  const initialServiceCode =
    serviceOptions.find((service) => service.sportSlug === initialSportSlug && !service.requiresInstructor)?.code ??
    serviceOptions.find((service) => service.sportSlug === initialSportSlug)?.code ??
    "";

  async function createBookingAction(
    formData: FormData,
  ): Promise<
    | {
        error: string;
        holdId?: string;
        shortfallKzt?: number;
        currentBalanceKzt?: number;
        amountRequiredKzt?: number;
      }
    | void
  > {
    "use server";
    await assertAdmin();

    const locationSlug = String(formData.get("locationSlug") ?? "").trim();
    const serviceCode = String(formData.get("serviceCode") ?? "").trim();
    const date = String(formData.get("date") ?? "").trim();
    const startTime = String(formData.get("startTime") ?? "").trim();
    const courtId = String(formData.get("courtId") ?? "").trim() || undefined;
    const instructorId = String(formData.get("instructorId") ?? "").trim() || undefined;
    const customerName = String(formData.get("customerName") ?? "").trim();
    const customerPhone = String(formData.get("customerPhone") ?? "").trim();
    const customerEmail = String(formData.get("customerEmail") ?? "").trim().toLowerCase();
    const holdId = String(formData.get("holdId") ?? "").trim() || undefined;

    if (!serviceCode || !date || !startTime || !customerName || !customerPhone || !customerEmail) {
      return { error: "Заполните все обязательные поля" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Некорректный формат даты" };
    }

    if (!/^\d{2}:00$/.test(startTime)) {
      return { error: "Время должно быть началом часа, например 09:00" };
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

      await createBookingInDb({
        serviceCode,
        locationId,
        date,
        startTime,
        durationMin: 60,
        courtId,
        instructorId,
        holdId,
        customerUserId: customerUser.id,
        customer: {
          name: customerUser.name,
          email: customerUser.email,
          phone: customerUser.phone,
        },
      });
    } catch (error) {
      if (error instanceof InsufficientWalletBalanceError) {
        return {
          error: `Недостаточно средств на балансе. Сначала начислите клиенту минимум ${error.shortfallKzt.toLocaleString("ru-KZ")} KZT в разделе баланса, затем повторите создание брони.`,
          holdId: error.holdId,
          shortfallKzt: error.shortfallKzt,
          currentBalanceKzt: error.currentBalanceKzt,
          amountRequiredKzt: error.amountRequiredKzt,
        };
      }

      return { error: error instanceof Error ? error.message : "Ошибка создания бронирования" };
    }

    redirect("/admin/bookings");
  }

  return (
    <AdminPageShell
      title="Создать бронирование"
      description="Ручное создание бронирования для клиента. Все новые бронирования списываются с внутреннего баланса клиента."
    >
      <CreateBookingForm
        sports={sportOptions}
        services={serviceOptions}
        instructors={instructorOptions}
        locations={locationOptions}
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
        createAction={createBookingAction}
      />
    </AdminPageShell>
  );
}
