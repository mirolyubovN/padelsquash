import { prisma } from "@/src/lib/prisma";
import { buildRussianYoVariants } from "@/src/lib/search/russian";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { notifyBookingCancelled } from "@/src/lib/notifications/bookings";
import {
  cancelBookingWithRefundInTx,
  settlePendingBookingPaymentInTx,
  setAdminBookingPaymentStateInTx,
  type AdminBookingPaymentState,
} from "@/src/lib/bookings/operations";
import { isoToVenueTimezoneParts, venueDateRangeUtc, venueDateTimeToUtc, toVenueIsoDate } from "@/src/lib/time/venue-timezone";
import { logAuditEvent } from "@/src/lib/audit/log";
import {
  ADMIN_BOOKING_STATUS_LABELS,
  ADMIN_PAYMENT_STATUS_LABELS,
  type AdminBookingStatus,
  type AdminPaymentStatus,
  type AdminBookingFilters,
  type AdminBookingRow,
  type AdminBookingListResult,
} from "@/src/lib/admin/booking-types";

export type { AdminBookingStatus, AdminPaymentStatus, AdminBookingSort, AdminBookingFilters, AdminBookingRow, AdminBookingListResult } from "@/src/lib/admin/booking-types";
export { ADMIN_BOOKING_STATUS_LABELS, ADMIN_PAYMENT_STATUS_LABELS } from "@/src/lib/admin/booking-types";

function toPaymentStatus(row: { payment: null | { status: string }; status: AdminBookingStatus }): AdminPaymentStatus {
  const raw = row.payment?.status;
  if (raw === "unpaid" || raw === "paid" || raw === "failed" || raw === "refunded") {
    return raw;
  }
  if (row.status === "pending_payment") {
    return "unpaid";
  }
  return "none";
}

function toPaymentProvider(row: { payment: null | { provider: string } }): string {
  return row.payment?.provider ?? "—";
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
      return `${componentLabel}: ${formatMoneyKzt(amount)} (${tierLabel})`;
    })
    .filter((line): line is string => Boolean(line));
}

export async function getAdminBookings(filters: AdminBookingFilters): Promise<AdminBookingListResult> {
  const page = Math.max(1, Number.isFinite(filters.page) ? filters.page : 1);
  const pageSize = Math.min(100, Math.max(10, Number.isFinite(filters.pageSize) ? filters.pageSize : 20));
  const sortDirection: "asc" | "desc" = filters.sort === "date_desc" ? "desc" : "asc";

  const where: Record<string, unknown> = {};

  if (filters.bookingId) {
    where.id = filters.bookingId;
  }

  if (filters.customerEmail) {
    where.customer = {
      is: {
        email: filters.customerEmail.trim().toLowerCase(),
      },
    };
  }

  if (filters.status) {
    where.status = filters.status;
  }

  if (filters.sport) {
    where.service = { is: { sport: { is: { slug: filters.sport } } } };
  }

  if (filters.q) {
    const q = filters.q.trim();
    if (q) {
      const yoAwareNameQueries = buildRussianYoVariants(q);
      (where as { AND?: unknown[] }).AND = [
        ...(((where as { AND?: unknown[] }).AND ?? []) as unknown[]),
        {
          OR: [
            ...yoAwareNameQueries.map((nameQuery) => ({
              customer: { is: { name: { contains: nameQuery, mode: "insensitive" as const } } },
            })),
            { customer: { is: { phone: { contains: q } } } },
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
      orderBy: [{ startAt: sortDirection }, { id: sortDirection }],
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
        location: { select: { slug: true } },
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

    const courtIds = row.resources
      .filter((resource) => resource.resourceType === "court")
      .map((resource) => resource.resourceId);

    return {
      id: row.id,
      customerId: row.customer.id,
      customerName: row.customer.name,
      customerEmail: row.customer.email,
      customerPhone: row.customer.phone,
      serviceId: row.service.id,
      serviceName: row.service.name,
      serviceCode: row.service.code,
      serviceSport: row.service.sport.slug,
      serviceSportName: row.service.sport.name,
      requiresCourt: row.service.requiresCourt,
      locationId: row.locationId,
      locationSlug: row.location.slug,
      courtIds,
      date: whenStart.date,
      dateIso: toVenueIsoDate(row.startAt),
      time: `${whenStart.time} - ${whenEnd.time}`,
      startAtIso: row.startAt.toISOString(),
      endAtIso: row.endAt.toISOString(),
      status,
      statusLabel: ADMIN_BOOKING_STATUS_LABELS[status],
      paymentStatus,
      paymentStatusLabel: ADMIN_PAYMENT_STATUS_LABELS[paymentStatus],
      paymentProvider: toPaymentProvider({ payment: row.payment }),
      amountKzt: formatMoneyKzt(amountRaw),
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
  status: AdminBookingStatus;
  actorUserId?: string;
  cancellationReason?: string;
}) {
  if (args.status === "cancelled") {
    const updated = await prisma.$transaction((tx) =>
      cancelBookingWithRefundInTx({
        tx,
        bookingId: args.bookingId,
        cancelledBy: "admin",
        cancellationReason: args.cancellationReason,
      }),
    );

    await notifyBookingCancelled({ bookingId: updated.id, cancelledBy: "admin" });
    await logAuditEvent({
      actorUserId: args.actorUserId,
      action: "booking.cancel",
      entityType: "booking",
      entityId: updated.id,
      detail: { cancelledBy: "admin", reason: args.cancellationReason ?? null },
    });
    return updated;
  }

  const existing = await prisma.booking.findUnique({
    where: { id: args.bookingId },
    select: { id: true, status: true },
  });

  if (!existing) {
    throw new Error("Бронирование не найдено");
  }

  const result = await prisma.booking.update({
    where: { id: args.bookingId },
    data: { status: args.status },
  });

  await logAuditEvent({
    actorUserId: args.actorUserId,
    action: "booking.status_change",
    entityType: "booking",
    entityId: args.bookingId,
    detail: { oldStatus: existing.status, newStatus: args.status },
  });

  return result;
}

export interface BulkSetStatusResult {
  updated: number;
  failed: number;
  total: number;
}

export async function bulkSetBookingStatus(args: {
  bookingIds: string[];
  status: AdminBookingStatus;
  actorUserId?: string;
}): Promise<BulkSetStatusResult> {
  let updated = 0;
  let failed = 0;
  for (const bookingId of args.bookingIds) {
    try {
      await setBookingStatus({ bookingId, status: args.status, actorUserId: args.actorUserId });
      updated++;
    } catch {
      failed++;
    }
  }
  return { updated, failed, total: args.bookingIds.length };
}

export async function markBookingPaid(args: {
  bookingId: string;
  method: "wallet" | "cash";
}) {
  return prisma.$transaction((tx) =>
    settlePendingBookingPaymentInTx({
      tx,
      bookingId: args.bookingId,
      method: args.method,
    }),
  );
}

export async function setBookingPaymentState(args: {
  bookingId: string;
  state: AdminBookingPaymentState;
}) {
  return prisma.$transaction((tx) =>
    setAdminBookingPaymentStateInTx({
      tx,
      bookingId: args.bookingId,
      state: args.state,
    }),
  );
}
