import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";

export interface AdminBookingRow {
  id: string;
  customerName: string;
  customerEmail: string;
  serviceName: string;
  serviceCode: string;
  date: string;
  time: string;
  status: string;
  paymentStatus: string;
  amountKzt: string;
}

export async function getAdminBookings(limit = 100): Promise<AdminBookingRow[]> {
  const rows = await prisma.booking.findMany({
    take: limit,
    orderBy: [{ startAt: "desc" }],
    include: {
      customer: true,
      service: true,
      payment: true,
    },
  });

  return rows.map((row: {
    id: string;
    startAt: Date;
    status: string;
    currency: string;
    priceTotal: unknown;
    customer: { name: string; email: string };
    service: { name: string; code: string };
    payment: null | { status: string };
  }) => {
    const when = isoToVenueTimezoneParts(row.startAt);
    return {
      id: row.id,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      serviceName: row.service.name,
      serviceCode: row.service.code,
      date: when.date,
      time: when.time,
      status: row.status,
      paymentStatus: row.payment?.status ?? (row.status === "confirmed" ? "paid" : "—"),
      amountKzt: `${Number(row.priceTotal).toLocaleString("ru-KZ")} ₸`,
    };
  });
}

export async function setBookingStatus(args: {
  bookingId: string;
  status: "cancelled" | "completed" | "no_show";
}) {
  return prisma.booking.update({
    where: { id: args.bookingId },
    data: { status: args.status },
  });
}

export async function confirmPlaceholderPaymentByBookingId(bookingId: string) {
  const payment = await prisma.payment.findFirst({
    where: {
      bookingId,
      provider: "placeholder",
    },
  });

  if (!payment) {
    throw new Error("Платеж placeholder не найден");
  }

  const [updatedPayment, updatedBooking] = await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: { status: "paid" },
    }),
    prisma.booking.update({
      where: { id: bookingId },
      data: { status: "confirmed" },
    }),
  ]);

  return { updatedPayment, updatedBooking };
}
