import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createBookingInDb,
  InsufficientWalletBalanceError,
} from "@/src/lib/bookings/persistence";
import { demoServices } from "@/src/lib/availability/demo";
import { prisma } from "@/src/lib/prisma";
import { PromoIneligibleError } from "@/src/lib/promo/apply";
import { createBookingSchema } from "@/src/lib/validation/booking";
import { resolveLocationBySlug } from "@/src/lib/locations/service";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const session = await auth();
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
        locationId: true,
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
    const result = await createBookingInDb({
      serviceCode: parsed.data.serviceId,
      locationId: selectedLocation.id,
      date: parsed.data.date,
      startTime: parsed.data.startTime,
      durationMin: parsed.data.durationMin,
      courtId: parsed.data.courtId,
      instructorId: parsed.data.instructorId,
      holdId: parsed.data.holdId,
      promoCode: parsed.data.promoCode,
      customerUserId: accountCustomer.id,
      customer: {
        name: accountCustomer.name,
        email: accountCustomer.email,
        phone: accountCustomer.phone,
      },
    });

    return NextResponse.json(
      {
        message: "Бронь создана и оплачена с баланса.",
        data: result,
        source: "db",
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof InsufficientWalletBalanceError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          holdId: error.holdId,
          currentBalanceKzt: error.currentBalanceKzt,
          amountRequiredKzt: error.amountRequiredKzt,
          shortfallKzt: error.shortfallKzt,
          expiresAt: error.expiresAtIso,
        },
        { status: 402 },
      );
    }

    if (error instanceof PromoIneligibleError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : "Ошибка создания бронирования";

    const status = message.includes("занят")
      ? 409
      : message.includes("не найдена")
        ? 404
        : message.includes("требуется зарегистрированный аккаунт")
          ? 401
          : message.includes("требуется") || message.includes("hold")
            ? 400
            : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
