import { redirect } from "next/navigation";
import { AdminPageShell } from "@/src/components/admin/admin-page-shell";
import { CreateBookingForm } from "@/src/components/admin/create-booking-form";
import { assertAdmin } from "@/src/lib/auth/guards";
import { getAdminSportOptions, getAdminServices, getAdminInstructors } from "@/src/lib/admin/resources";
import { createBookingInDb } from "@/src/lib/bookings/persistence";
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
    if (rows.length > 0) return rows;
  } catch {
    // fallback below
  }
  return [{ id: "fallback", slug: "main", name: "Основная локация" }];
}

export default async function AdminCreateBookingPage() {
  await assertAdmin();

  const [sports, services, instructors, locations] = await Promise.all([
    getAdminSportOptions(),
    getAdminServices(),
    getAdminInstructors(),
    getAdminLocations(),
  ]);

  const defaultLocationSlug = locations[0]?.slug ?? "main";

  const sportOptions = sports.map((s) => ({ id: s.id, slug: s.slug, name: s.name }));
  const serviceOptions = services
    .filter((s) => s.active)
    .map((s) => ({
      code: s.code,
      name: s.name,
      sportSlug: s.sportSlug,
      requiresInstructor: s.requiresInstructor,
    }));
  const instructorOptions = instructors
    .filter((i) => i.active)
    .map((i) => ({
      id: i.id,
      name: i.name,
      sportSlugs: i.sports.map((sp) => sp.slug),
    }));
  const locationOptions = locations.map((l) => ({ id: l.id, slug: l.slug, name: l.name }));

  async function createBookingAction(formData: FormData): Promise<{ error?: string } | void> {
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
    const customerEmail = String(formData.get("customerEmail") ?? "").trim();
    const paymentStatus = String(formData.get("paymentStatus") ?? "pending");

    if (!serviceCode || !date || !startTime || !customerName || !customerPhone || !customerEmail) {
      return { error: "Заполните все обязательные поля" };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return { error: "Некорректный формат даты" };
    }

    if (!/^\d{2}:00$/.test(startTime)) {
      return { error: "Время должно быть началом часа (например, 09:00)" };
    }

    // Resolve locationId from slug
    let locationId: string;
    try {
      const loc = await prisma.location.findFirst({
        where: { slug: locationSlug, active: true },
        select: { id: true },
      });
      if (!loc) {
        const fallback = await prisma.location.findFirst({ where: { active: true }, select: { id: true } });
        if (!fallback) return { error: "Локация не найдена" };
        locationId = fallback.id;
      } else {
        locationId = loc.id;
      }
    } catch {
      return { error: "Ошибка при поиске локации" };
    }

    try {
      const result = await createBookingInDb({
        serviceCode,
        locationId,
        date,
        startTime,
        durationMin: 60,
        courtId,
        instructorId,
        customer: { name: customerName, email: customerEmail, phone: customerPhone },
      });

      // Mark as paid if cash or free
      if (paymentStatus === "cash" || paymentStatus === "free") {
        const bookingId = result.booking.id;
        await prisma.$transaction([
          prisma.payment.updateMany({
            where: { bookingId },
            data: { status: "paid" },
          }),
          prisma.booking.update({
            where: { id: bookingId },
            data: { status: "confirmed" },
          }),
        ]);
      }
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Ошибка создания бронирования" };
    }

    redirect("/admin/bookings");
  }

  return (
    <AdminPageShell
      title="Создать бронирование"
      description="Ручное создание бронирования для клиента (walk-in, телефонный звонок)."
    >
      <CreateBookingForm
        sports={sportOptions}
        services={serviceOptions}
        instructors={instructorOptions}
        locations={locationOptions}
        defaultLocationSlug={defaultLocationSlug}
        createAction={createBookingAction}
      />
    </AdminPageShell>
  );
}
