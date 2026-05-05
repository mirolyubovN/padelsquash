import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  createBookingHoldsInDb,
  createBookingSeriesInDb,
} from "@/src/lib/bookings/persistence";
import { resolveLocationBySlug } from "@/src/lib/locations/service";
import { prisma } from "@/src/lib/prisma";
import { createBookingSeriesSchema } from "@/src/lib/validation/booking";

export const dynamic = "force-dynamic";

function statusFromBookingError(message: string): number {
  if (message.includes("занят")) return 409;
  if (message.includes("не найден")) return 404;
  if (message.includes("требуется") || message.includes("hold") || message.includes("недействителен")) return 400;
  if (message.includes("закрыт") || message.includes("вне часов") || message.includes("заблокирован") || message.includes("недоступен")) return 409;
  return 500;
}

export async function POST(request: Request) {
  const session = await auth();
  const payload = await request.json().catch(() => null);
  const parsed = createBookingSeriesSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Некорректные данные бронирования", details: parsed.error.flatten() },
      { status: 400 },
    );
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
      select: { id: true, name: true, email: true, phone: true, walletBalance: true },
    })
    .catch(() => null);

  if (!accountCustomer) {
    return NextResponse.json({ error: "Пользователь аккаунта не найден" }, { status: 404 });
  }

  const customer = {
    name: accountCustomer.name,
    email: accountCustomer.email,
    phone: accountCustomer.phone,
  };

  try {
    const result = await createBookingSeriesInDb({
      serviceCode: parsed.data.serviceId,
      locationId: selectedLocation.id,
      date: parsed.data.date,
      durationMin: parsed.data.durationMin,
      instructorId: parsed.data.instructorId,
      customerUserId: accountCustomer.id,
      customer,
      slots: parsed.data.slots,
    });

    return NextResponse.json(
      {
        message: "Брони созданы и оплачены с баланса.",
        data: result,
        source: "db",
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Ошибка создания бронирования";

    if (message.includes("Недостаточно средств")) {
      try {
        const holdResult = await createBookingHoldsInDb({
          serviceCode: parsed.data.serviceId,
          locationId: selectedLocation.id,
          date: parsed.data.date,
          durationMin: parsed.data.durationMin,
          instructorId: parsed.data.instructorId,
          customerUserId: accountCustomer.id,
          customer,
          slots: parsed.data.slots,
        });

        return NextResponse.json(
          {
            error: "Недостаточно средств на балансе для всей серии",
            code: "INSUFFICIENT_WALLET_BALANCE_SERIES",
            currentBalanceKzt: Number(accountCustomer.walletBalance),
            amountRequiredKzt: holdResult.totalAmountRequiredKzt,
            shortfallKzt: Math.max(0, holdResult.totalAmountRequiredKzt - Number(accountCustomer.walletBalance)),
            data: holdResult,
          },
          { status: 402 },
        );
      } catch (holdError) {
        const holdMessage = holdError instanceof Error ? holdError.message : "Ошибка создания hold";
        return NextResponse.json({ error: holdMessage }, { status: statusFromBookingError(holdMessage) });
      }
    }

    return NextResponse.json({ error: message }, { status: statusFromBookingError(message) });
  }
}
