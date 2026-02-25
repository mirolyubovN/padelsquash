import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { createBookingMvp } from "@/src/lib/bookings/service";
import { createBookingInDb } from "@/src/lib/bookings/persistence";
import { demoServices } from "@/src/lib/availability/demo";
import { demoComponentPrices } from "@/src/lib/pricing/demo";
import { prisma } from "@/src/lib/prisma";
import { createBookingSchema } from "@/src/lib/validation/booking";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
  const allowDemoFallback = process.env.ALLOW_DEMO_FALLBACK === "true";
  const payload = await request.json().catch(() => null);
  const parsed = createBookingSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные бронирования", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const dbService = await prisma.service
    .findUnique({
      where: { code: parsed.data.serviceId },
      select: {
        code: true,
        name: true,
        sport: true,
        requiresCourt: true,
        requiresInstructor: true,
        active: true,
      },
    })
    .catch(() => null);

  const effectiveService =
    dbService && dbService.active
      ? dbService
      : demoServices.find((item) => item.id === parsed.data.serviceId) ?? null;

  if (!effectiveService) {
    return NextResponse.json({ error: "Услуга не найдена" }, { status: 404 });
  }

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Для бронирования требуется зарегистрированный аккаунт и вход в систему." },
      { status: 401 },
    );
  }

  const accountCustomer =
    session?.user?.id
      ? await prisma.user
          .findUnique({
            where: { id: session.user.id },
            select: { id: true, name: true, email: true, phone: true },
          })
          .catch(() => null)
      : null;

  try {
    const result = await createBookingInDb({
      serviceCode: parsed.data.serviceId,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      durationMin: parsed.data.durationMin,
      courtId: parsed.data.courtId,
      instructorId: parsed.data.instructorId,
      customerUserId: accountCustomer?.id,
      customer: accountCustomer
        ? {
            name: accountCustomer.name,
            email: accountCustomer.email,
            phone: accountCustomer.phone,
          }
        : parsed.data.customer,
    });

    return NextResponse.json(
      {
        message:
          process.env.PAYMENTS_ENABLED === "true"
            ? "Бронь создана. Ожидается подтверждение оплаты."
            : "Бронь создана и подтверждена.",
        data: result,
        source: "db",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания бронирования";

    // Demo fallback is disabled by default to avoid masking DB persistence failures.
    const service = demoServices.find((item) => item.id === parsed.data.serviceId);
    if (allowDemoFallback && service) {
      const result = await createBookingMvp({
        customerId: parsed.data.customerId ?? "demo-customer",
        service,
        date: parsed.data.date,
        startTime: parsed.data.startTime,
        durationMin: parsed.data.durationMin,
        courtId: parsed.data.courtId,
        instructorId: parsed.data.instructorId,
        componentPrices: demoComponentPrices,
        customer: parsed.data.customer,
      });

      return NextResponse.json(
        {
          message:
            process.env.PAYMENTS_ENABLED === "true"
              ? "Бронь создана. Ожидается подтверждение оплаты."
              : "Бронь создана и подтверждена.",
          data: result,
          source: "demo-fallback",
          note: message,
        },
        { status: 201 },
      );
    }

    const status = message.includes("занят")
      ? 409
      : message.includes("не найдена")
        ? 404
        : message.includes("требуется зарегистрированный аккаунт")
          ? 401
        : message.includes("требуется")
          ? 400
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
