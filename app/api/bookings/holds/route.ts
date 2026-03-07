import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBookingHoldsInDb } from "@/src/lib/bookings/persistence";
import { prisma } from "@/src/lib/prisma";
import { createBookingHoldsSchema } from "@/src/lib/validation/booking";
import { resolveLocationBySlug } from "@/src/lib/locations/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  const payload = await request.json().catch(() => null);
  const parsed = createBookingHoldsSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные hold-запроса", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Для сохранения hold требуется вход в аккаунт." },
      { status: 401 },
    );
  }

  const locationSelection = await resolveLocationBySlug(parsed.data.location);
  const selectedLocation = locationSelection.selected;

  const accountCustomer = await prisma.user
    .findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, phone: true },
    })
    .catch(() => null);

  if (!accountCustomer) {
    return NextResponse.json({ error: "Пользователь аккаунта не найден" }, { status: 404 });
  }

  try {
    const result = await createBookingHoldsInDb({
      serviceCode: parsed.data.serviceId,
      locationId: selectedLocation.id,
      date: parsed.data.date,
      durationMin: parsed.data.durationMin,
      instructorId: parsed.data.instructorId,
      customerUserId: accountCustomer.id,
      customer: {
        name: accountCustomer.name,
        email: accountCustomer.email,
        phone: accountCustomer.phone,
      },
      slots: parsed.data.slots,
    });

    return NextResponse.json(
      {
        message: "Слоты временно удержаны.",
        data: result,
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания hold";
    const status = message.includes("занят")
      ? 409
      : message.includes("не найден")
        ? 404
        : message.includes("требуется")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
