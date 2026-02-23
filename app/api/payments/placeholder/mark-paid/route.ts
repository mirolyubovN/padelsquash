import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/src/lib/prisma";
import { markPlaceholderPaidSchema } from "@/src/lib/validation/booking";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = request.headers.get("x-admin-token");
  const expectedToken = process.env.PAYMENTS_PLACEHOLDER_ADMIN_TOKEN;
  const session = await auth();
  const isAdminSession = session?.user?.role === "admin";
  const tokenAllowed = Boolean(expectedToken && token === expectedToken);

  if (!isAdminSession && !tokenAllowed) {
    return NextResponse.json({ error: "Доступ запрещен" }, { status: 401 });
  }

  const payload = await request.json().catch(() => null);
  const parsed = markPlaceholderPaidSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Некорректный запрос",
        details: parsed.error.flatten(),
      },
      { status: 400 },
    );
  }

  const payment = await prisma.payment.findFirst({
    where: {
      ...(parsed.data.paymentId
        ? { id: parsed.data.paymentId }
        : { bookingId: parsed.data.bookingId }),
      provider: "placeholder",
    },
    include: { booking: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Платеж не найден" }, { status: 404 });
  }

  const [updatedPayment, updatedBooking] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    }),
    prisma.booking.update({
      where: { id: payment.bookingId },
      data: { status: "confirmed" },
    }),
  ]);

  return NextResponse.json({
    message: "Оплата отмечена как paid (placeholder). Бронь переведена в confirmed.",
    data: {
      bookingId: updatedBooking.id,
      paymentId: updatedPayment.id,
      paymentStatus: updatedPayment.status,
      bookingStatus: updatedBooking.status,
      provider: updatedPayment.provider,
    },
  });
}
