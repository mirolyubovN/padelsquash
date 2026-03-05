import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts, venueDateRangeUtc, venueDateTimeToUtc } from "@/src/lib/time/venue-timezone";

export type AdminBookingStatus = "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
export type AdminPaymentStatus = "none" | "unpaid" | "paid" | "failed" | "refunded";

export const ADMIN_BOOKING_STATUS_LABELS: Record<AdminBookingStatus, string> = {
  pending_payment: "Ожидает оплаты",
  confirmed: "Подтверждено",
  cancelled: "Отменено",
  completed: "Завершено",
  no_show: "Неявка",
};

export const ADMIN_PAYMENT_STATUS_LABELS: Record<AdminPaymentStatus, string> = {
  none: "—",
  unpaid: "Не оплачено",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
  refunded: "Возврат",
};

export interface AdminBookingFilters {
  page: number;
  pageSize: number;
  q?: string;
  status?: AdminBookingStatus;
  sport?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface AdminBookingRow {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceName: string;
  serviceCode: string;
  serviceSport: string;
  serviceSportName: string;
  date: string;
  time: string;
  startAtIso: string;
  endAtIso: string;
  status: AdminBookingStatus;
  statusLabel: string;
  paymentStatus: AdminPaymentStatus;
  paymentStatusLabel: string;
  paymentProvider: string;
  amountKzt: string;
  amountRaw: number;
  currency: string;
  courtLabels: string[];
  instructorLabels: string[];
  pricingBreakdownLines: string[];
}

export interface AdminBookingListResult {
  rows: AdminBookingRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

function formatAmountKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function toPaymentStatus(row: { payment: null | { status: string }; status: AdminBookingStatus }): AdminPaymentStatus {
  const raw = row.payment?.status;
  if (raw === "unpaid" || raw === "paid" || raw === "failed" || raw === "refunded") {
    return raw;
  }
  if (!raw) {
    return row.status === "confirmed" ? "paid" : "none";
  }
  return "none";
}

function parsePricingBreakdownLines(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const componentType = "componentType" in item ? String(item.componentType) : "";
      const tier = "tier" in item ? String(item.tier) : "";
      const amount = "amount" in item ? Number(item.amount) : NaN;
      if (!componentType || !tier || Number.isNaN(amount)) return null;
      const componentLabel =
        componentType === "court" ? "Корт" : componentType === "instructor" ? "Тренер" : componentType;
      const tierLabel =
        tier === "morning" ? "утро" : tier === "day" ? "день" : tier === "evening_weekend" ? "вечер/выходные" : tier;
      return `${componentLabel}: ${formatAmountKzt(amount)} (${tierLabel})`;
    })
    .filter((line): line is string => Boolean(line));
}

export async function getAdminBookings(filters: AdminBookingFilters): Promise<AdminBookingListResult> {
  const page = Math.max(1, Number.isFinite(filters.page) ? filters.page : 1);
  const pageSize = Math.min(100, Math.max(10, Number.isFinite(filters.pageSize) ? filters.pageSize : 20));

  const where: Record<string, unknown> = {};

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.sport) {
    where.service = { is: { sport: { is: { slug: filters.sport } } } };
  }

  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      (where as { AND?: unknown[] }).AND = [
        ...(((where as { AND?: unknown[] }).AND ?? []) as unknown[]),
        {
          OR: [
            { customer: { is: { name: { contains: q, mode: "insensitive" } } } },
            { customer: { is: { email: { contains: q, mode: "insensitive" } } } },
          ],
        },
      ];
    }
  }

  if (filters.dateFrom || filters.dateTo) {
    const startAt: { gte?: Date; lt?: Date } = {};
    if (filters.dateFrom) {
      startAt.gte = venueDateRangeUtc(filters.dateFrom).startUtc;
    }
    if (filters.dateTo) {
      startAt.lt = venueDateTimeToUtc(filters.dateTo, "00:00");
      const nextDay = new Date(startAt.lt.getTime() + 24 * 60 * 60 * 1000);
      startAt.lt = nextDay;
    }
    where.startAt = startAt;
  }

  const [total, rows] = await Promise.all([
    prisma.booking.count({ where }),
    prisma.booking.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: [{ startAt: "desc" }],
      include: {
        customer: true,
        service: {
          include: {
            sport: {
              select: {
                slug: true,
                name: true,
              },
            },
          },
        },
        payment: true,
        resources: true,
      },
    }),
  ]);

  const courtIds = new Set<string>();
  const instructorIds = new Set<string>();
  for (const row of rows) {
    for (const resource of row.resources) {
      if (resource.resourceType === "court") courtIds.add(resource.resourceId);
      if (resource.resourceType === "instructor") instructorIds.add(resource.resourceId);
    }
  }

  const [courts, instructors] = await Promise.all([
    courtIds.size
      ? prisma.court.findMany({
          where: { id: { in: Array.from(courtIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
    instructorIds.size
      ? prisma.instructor.findMany({
          where: { id: { in: Array.from(instructorIds) } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),
  ]);

  const courtNames = new Map(courts.map((row) => [row.id, row.name]));
  const instructorNames = new Map(instructors.map((row) => [row.id, row.name]));

  const mappedRows: AdminBookingRow[] = rows.map((row) => {
    const whenStart = isoToVenueTimezoneParts(row.startAt);
    const whenEnd = isoToVenueTimezoneParts(row.endAt);
    const status = row.status as AdminBookingStatus;
    const paymentStatus = toPaymentStatus({ payment: row.payment, status });
    const amountRaw = Number(row.priceTotal);

    const courtLabels = row.resources
      .filter((resource) => resource.resourceType === "court")
      .map((resource) => courtNames.get(resource.resourceId) ?? resource.resourceId);
    const instructorLabels = row.resources
      .filter((resource) => resource.resourceType === "instructor")
      .map((resource) => instructorNames.get(resource.resourceId) ?? resource.resourceId);

    return {
      id: row.id,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      customerPhone: row.customer.phone,
      serviceName: row.service.name,
      serviceCode: row.service.code,
      serviceSport: row.service.sport.slug,
      serviceSportName: row.service.sport.name,
      date: whenStart.date,
      time: `${whenStart.time} - ${whenEnd.time}`,
      startAtIso: row.startAt.toISOString(),
      endAtIso: row.endAt.toISOString(),
      status,
      statusLabel: ADMIN_BOOKING_STATUS_LABELS[status],
      paymentStatus,
      paymentStatusLabel: ADMIN_PAYMENT_STATUS_LABELS[paymentStatus],
      paymentProvider: row.payment?.provider ?? "placeholder",
      amountKzt: formatAmountKzt(amountRaw),
      amountRaw,
      currency: row.currency,
      courtLabels,
      instructorLabels,
      pricingBreakdownLines: parsePricingBreakdownLines(row.pricingBreakdownJson),
    };
  });

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    rows: mappedRows,
    total,
    page,
    pageSize,
    totalPages,
  };
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
