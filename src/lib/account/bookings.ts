import {
  canCustomerCancelBooking,
  getCustomerCancellationDeadline,
  getMorningCancellationWindowLabel,
  getSafeCustomerFreeCancellationHours,
} from "@/src/lib/bookings/policy";
import { formatMoneyKzt } from "@/src/lib/format/money";
import { cancelBookingWithRefundInTx } from "@/src/lib/bookings/operations";
import { cancelCustomerEventRegistration } from "@/src/lib/events/service";
import { notifyBookingCancelled } from "@/src/lib/notifications/bookings";
import { prisma } from "@/src/lib/prisma";
import { formatTimeInVenueTimezone, isoToVenueTimezoneParts, toVenueIsoDate } from "@/src/lib/time/venue-timezone";
import { debitUserWallet } from "@/src/lib/wallet/service";

const FREE_CANCELLATION_HOURS = getSafeCustomerFreeCancellationHours();
const MORNING_WINDOW_LABEL = getMorningCancellationWindowLabel();

export interface AccountBookingRow {
  id: string;
  itemType: "booking" | "event";
  eventId?: string;
  serviceName: string;
  courtName: string;
  date: string;
  timeRange: string;
  status: "pending_payment" | "confirmed" | "cancelled" | "completed" | "no_show";
  statusLabel: string;
  paymentStatus: "unpaid" | "paid" | "failed" | "refunded" | "none";
  paymentStatusLabel: string;
  amountKzt: string;
  canCancel: boolean;
  cancelBlockedReason?: string;
  cancellationDeadlineText?: string;
  startAtIso: string;
}

export interface AccountDashboardData {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerifiedAt: Date | null;
    pendingEmail: string | null;
    phone: string;
    phoneVerifiedAt: Date | null;
    pendingPhone: string | null;
    role: "customer" | "trainer" | "admin" | "super_admin";
    walletBalanceKzt: number;
  };
  totals: {
    upcoming: number;
    history: number;
    cancellable: number;
  };
}

const BOOKING_STATUS_LABELS: Record<AccountBookingRow["status"], string> = {
  pending_payment: "Ожидает оплату",
  confirmed: "Подтверждена",
  cancelled: "Отменена",
  completed: "Завершена",
  no_show: "Неявка",
};

const PAYMENT_STATUS_LABELS: Record<AccountBookingRow["paymentStatus"], string> = {
  none: "—",
  unpaid: "Не оплачено",
  paid: "Оплачено",
  failed: "Ошибка оплаты",
  refunded: "Возврат",
};

function formatAmountKztLegacy(amount: number): string {
  if (Number.isFinite(amount)) {
    return formatMoneyKzt(amount);
  }
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

const formatAmountKzt = formatAmountKztLegacy;

function resolveAccountPaymentStatus(row: {
  payment: null | { status: "unpaid" | "paid" | "failed" | "refunded"; provider: string };
  status: AccountBookingRow["status"];
}): AccountBookingRow["paymentStatus"] {
  if (row.payment?.status) {
    return row.payment.status;
  }

  return row.status === "pending_payment" ? "unpaid" : "none";
}

function getCancellationState(args: {
  startAt: Date;
  status: AccountBookingRow["status"];
  now?: Date;
}): Pick<AccountBookingRow, "canCancel" | "cancelBlockedReason" | "cancellationDeadlineText"> {
  const now = args.now ?? new Date();
  const cancellationRule = getCustomerCancellationDeadline(args.startAt, FREE_CANCELLATION_HOURS);
  const cancelDeadline = cancellationRule.deadlineUtc;
  const deadlineParts = isoToVenueTimezoneParts(cancelDeadline);

  if (args.status === "cancelled") {
    return { canCancel: false, cancelBlockedReason: "Бронирование отменено." };
  }
  if (args.status === "completed") {
    return { canCancel: false, cancelBlockedReason: "Завершенное бронирование нельзя отменить." };
  }
  if (args.status === "no_show") {
    return { canCancel: false, cancelBlockedReason: "Неявка" };
  }

  if (!canCustomerCancelBooking(args.startAt, now, FREE_CANCELLATION_HOURS)) {
    const blockedReason =
      cancellationRule.policyKind === "morning_previous_day_midnight"
        ? `Для утреннего времени (${MORNING_WINDOW_LABEL}) отмена доступна только до 00:00 предыдущего дня.`
        : `Отмена доступна не позднее чем за ${FREE_CANCELLATION_HOURS} часов до начала.`;

    return {
      canCancel: false,
      cancelBlockedReason: blockedReason,
      cancellationDeadlineText: `${deadlineParts.date} ${deadlineParts.time}`,
    };
  }

  return {
    canCancel: true,
    cancellationDeadlineText: `${deadlineParts.date} ${deadlineParts.time}`,
  };
}

export async function getAccountDashboardData(userId: string): Promise<AccountDashboardData> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerifiedAt: true,
      pendingEmail: true,
      phone: true,
      phoneVerifiedAt: true,
      pendingPhone: true,
      role: true,
      walletBalance: true,
    },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  const now = new Date();

  const [upcoming, historyRows, eventRows] = await Promise.all([
    prisma.booking.count({
      where: {
        customerId: userId,
        startAt: { gte: now },
        status: { in: ["pending_payment", "confirmed"] },
      },
    }),
    prisma.booking.findMany({
      where: { customerId: userId },
      select: { startAt: true, status: true },
      orderBy: { startAt: "desc" },
      take: 100,
    }),
    prisma.eventRegistration.findMany({
      where: { customerId: userId },
      select: {
        status: true,
        event: {
          select: {
            startsAt: true,
          },
        },
      },
      orderBy: { event: { startsAt: "desc" } },
      take: 100,
    }),
  ]);

  const bookingCancellable = historyRows.reduce((count, row: { startAt: Date; status: AccountBookingRow["status"] }) => {
    return getCancellationState({ startAt: row.startAt, status: row.status, now }).canCancel ? count + 1 : count;
  }, 0);
  const upcomingEvents = eventRows.filter((row) => row.status === "confirmed" && row.event.startsAt >= now).length;
  const cancellableEvents = eventRows.filter((row) => row.status === "confirmed" && row.event.startsAt > now).length;

  return {
    user: {
      ...user,
      walletBalanceKzt: Number(user.walletBalance),
    },
    totals: {
      upcoming: upcoming + upcomingEvents,
      history: historyRows.length + eventRows.length,
      cancellable: bookingCancellable + cancellableEvents,
    },
  };
}

export async function getAccountBookings(userId: string, limit = 100): Promise<AccountBookingRow[]> {
  const now = new Date();
  const [rows, eventRegistrations] = await Promise.all([
    prisma.booking.findMany({
      where: { customerId: userId },
      orderBy: [{ startAt: "desc" }],
      take: limit,
      include: {
        service: true,
        payment: true,
        resources: {
          select: {
            resourceType: true,
            resourceId: true,
          },
        },
      },
    }),
    prisma.eventRegistration.findMany({
      where: { customerId: userId },
      orderBy: [{ event: { startsAt: "desc" } }],
      take: limit,
      include: {
        event: {
          include: {
            sport: { select: { name: true } },
            location: { select: { name: true } },
            courts: {
              orderBy: { court: { name: "asc" } },
              select: {
                court: { select: { name: true } },
              },
            },
          },
        },
        walletTransactions: {
          select: {
            type: true,
          },
        },
      },
    }),
  ]);

  const courtIds = Array.from(
    new Set(
      rows.flatMap((row) =>
        row.resources
          .filter((resource) => resource.resourceType === "court")
          .map((resource) => resource.resourceId),
      ),
    ),
  );

  const courtsById = new Map<string, string>();
  if (courtIds.length > 0) {
    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } },
      select: { id: true, name: true },
    });
    for (const court of courts) {
      courtsById.set(court.id, court.name);
    }
  }

  const bookingRows = rows.map(
    (row: {
      id: string;
      startAt: Date;
      endAt: Date;
      status: AccountBookingRow["status"];
      priceTotal: unknown;
      service: { name: string };
      payment: null | { status: "unpaid" | "paid" | "failed" | "refunded"; provider: string };
      resources: Array<{ resourceType: "court" | "instructor"; resourceId: string }>;
    }) => {
      const startParts = isoToVenueTimezoneParts(row.startAt);
      const endParts = isoToVenueTimezoneParts(row.endAt);
      const cancellationState = getCancellationState({ startAt: row.startAt, status: row.status, now });
      const paymentStatus = resolveAccountPaymentStatus({ payment: row.payment, status: row.status });
      const courtName =
        row.resources
          .filter((resource) => resource.resourceType === "court")
          .map((resource) => courtsById.get(resource.resourceId) ?? resource.resourceId)
          .join(", ") || "—";

      return {
        id: row.id,
        itemType: "booking" as const,
        serviceName: row.service.name,
        courtName,
        date: startParts.date,
        timeRange: `${startParts.time} - ${endParts.time}`,
        status: row.status,
        statusLabel: BOOKING_STATUS_LABELS[row.status],
        paymentStatus,
        paymentStatusLabel: PAYMENT_STATUS_LABELS[paymentStatus],
        amountKzt: formatAmountKzt(Number(row.priceTotal)),
        canCancel: cancellationState.canCancel,
        cancelBlockedReason: cancellationState.cancelBlockedReason,
        cancellationDeadlineText: cancellationState.cancellationDeadlineText,
        startAtIso: row.startAt.toISOString(),
      };
    },
  );

  const eventRows = eventRegistrations.map((registration) => {
    const startParts = isoToVenueTimezoneParts(registration.event.startsAt);
    const endParts = isoToVenueTimezoneParts(registration.event.endsAt);
    const hasRefund = registration.walletTransactions.some((transaction) => transaction.type === "event_refund");
    const paymentStatus: AccountBookingRow["paymentStatus"] =
      registration.status === "cancelled" && hasRefund
        ? "refunded"
        : Number(registration.pricePaidKzt) > 0
          ? "paid"
          : "none";
    const courtName =
      registration.event.courts.map((row) => row.court.name).join(", ") ||
      registration.event.location?.name ||
      "—";
    const canCancel = registration.status === "confirmed" && registration.event.startsAt > now;
    const cancelBlockedReason =
      registration.status === "cancelled"
        ? "Запись на событие отменена."
        : registration.event.startsAt <= now
          ? "Прошедшее событие нельзя отменить."
          : undefined;

    return {
      id: registration.id,
      itemType: "event" as const,
      eventId: registration.eventId,
      serviceName: `Событие: ${registration.event.title}`,
      courtName,
      date: startParts.date,
      timeRange: `${startParts.time} - ${endParts.time}`,
      status: registration.status === "cancelled" ? "cancelled" : "confirmed",
      statusLabel: registration.status === "cancelled" ? "Отменена" : "Записан",
      paymentStatus,
      paymentStatusLabel: PAYMENT_STATUS_LABELS[paymentStatus],
      amountKzt: formatAmountKzt(Number(registration.pricePaidKzt)),
      canCancel,
      cancelBlockedReason,
      startAtIso: registration.event.startsAt.toISOString(),
    } satisfies AccountBookingRow;
  });

  return [...bookingRows, ...eventRows]
    .sort((a, b) => new Date(b.startAtIso).getTime() - new Date(a.startAtIso).getTime())
    .slice(0, limit);
}

export async function cancelCustomerBooking(args: { userId: string; bookingId: string }) {
  const booking = await prisma.booking.findFirst({
    where: {
      id: args.bookingId,
      customerId: args.userId,
    },
    select: {
      id: true,
      status: true,
      startAt: true,
      priceTotal: true,
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
        },
      },
      walletTransactions: {
        where: {
          type: {
            in: ["booking_charge", "booking_refund"],
          },
        },
        select: {
          id: true,
          type: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  const cancellationState = getCancellationState({
    startAt: booking.startAt,
    status: booking.status as AccountBookingRow["status"],
    now: new Date(),
  });

  if (!cancellationState.canCancel) {
    throw new Error(cancellationState.cancelBlockedReason ?? "Отмена недоступна");
  }

  const cancelledBooking = await prisma.$transaction((tx) =>
    cancelBookingWithRefundInTx({
      tx,
      bookingId: booking.id,
      cancelledBy: "customer",
    }),
  );

  await notifyBookingCancelled({ bookingId: cancelledBooking.id, cancelledBy: "customer" });
  return cancelledBooking;
}

export async function cancelCustomerAccountEventRegistration(args: { userId: string; eventId: string }) {
  return cancelCustomerEventRegistration({
    customerId: args.userId,
    eventId: args.eventId,
  });
}

export interface AccountHoldSlot {
  id: string;
  courtName: string;
  date: string;
  timeRange: string;
  amountKzt: string;
}

export interface AccountHoldGroup {
  groupKey: string;
  serviceName: string;
  slots: AccountHoldSlot[];
  totalAmountKzt: string;
  expiresAtIso: string;
  holdIds: string[];
  bookReturnUrl: string;
}

export async function getAccountActiveHolds(userId: string): Promise<AccountHoldGroup[]> {
  const now = new Date();
  const holds = await prisma.bookingHold.findMany({
    where: {
      customerId: userId,
      status: "active",
      expiresAt: { gt: now },
    },
    orderBy: { expiresAt: "asc" },
    include: {
      service: {
        include: {
          sport: { select: { slug: true } },
        },
      },
      location: { select: { slug: true } },
    },
  });

  const courtIds = holds.map((h) => h.courtId).filter(Boolean) as string[];
  const courtsById = new Map<string, string>();
  if (courtIds.length > 0) {
    const courts = await prisma.court.findMany({
      where: { id: { in: courtIds } },
      select: { id: true, name: true },
    });
    for (const c of courts) courtsById.set(c.id, c.name);
  }

  // Group holds created in the same booking session (same 1-minute bucket + service + location + instructor)
  type HoldRecord = (typeof holds)[number];
  const groupMap = new Map<string, { holds: HoldRecord[]; expiresAt: Date }>();
  for (const hold of holds) {
    const minuteBucket = Math.floor(hold.expiresAt.getTime() / 60000);
    const key = `${minuteBucket}:${hold.serviceId}:${hold.locationId}:${hold.instructorId ?? ""}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, { holds: [], expiresAt: hold.expiresAt });
    }
    const entry = groupMap.get(key)!;
    entry.holds.push(hold);
    if (hold.expiresAt < entry.expiresAt) entry.expiresAt = hold.expiresAt;
  }

  return Array.from(groupMap.entries()).map(([groupKey, { holds: groupHolds, expiresAt }]) => {
    const first = groupHolds[0]!;
    const service = first.service;
    const location = first.location;
    const serviceKind = service.requiresInstructor ? "training" : "court";

    const params = new URLSearchParams({
      location: location.slug,
      sport: service.sport.slug,
      service: serviceKind,
      date: toVenueIsoDate(first.startAt),
    });
    if (first.instructorId) params.set("instructor", first.instructorId);

    const slots: AccountHoldSlot[] = groupHolds.map((hold) => {
      const startTime = formatTimeInVenueTimezone(hold.startAt);
      const endTime = formatTimeInVenueTimezone(hold.endAt);
      const courtName = hold.courtId ? (courtsById.get(hold.courtId) ?? "—") : "—";
      if (hold.courtId) {
        params.append("cell", `${startTime}|${endTime}::${hold.courtId}::${hold.id}`);
      }
      return {
        id: hold.id,
        courtName,
        date: isoToVenueTimezoneParts(hold.startAt).date,
        timeRange: `${startTime} - ${endTime}`,
        amountKzt: formatAmountKzt(Number(hold.amountRequired)),
      };
    });

    const totalAmount = groupHolds.reduce((sum, h) => sum + Number(h.amountRequired), 0);

    return {
      groupKey,
      serviceName: service.name,
      slots,
      totalAmountKzt: formatAmountKzt(totalAmount),
      expiresAtIso: expiresAt.toISOString(),
      holdIds: groupHolds.map((h) => h.id),
      bookReturnUrl: `/book?${params.toString()}`,
    };
  });
}

export async function payBookingFromWallet(args: { userId: string; bookingId: string }): Promise<void> {
  const booking = await prisma.booking.findFirst({
    where: { id: args.bookingId, customerId: args.userId },
    select: {
      id: true,
      status: true,
      priceTotal: true,
      currency: true,
      startAt: true,
      service: { select: { code: true } },
      payment: { select: { id: true, status: true } },
    },
  });

  if (!booking) throw new Error("Бронирование не найдено");
  if (booking.status === "cancelled" || booking.status === "completed" || booking.status === "no_show") {
    throw new Error("Оплата недоступна для этого бронирования");
  }
  if (booking.payment?.status === "paid") throw new Error("Бронирование уже оплачено");

  const amountKzt = Number(booking.priceTotal);

  await prisma.$transaction(async (tx) => {
    await debitUserWallet({
      tx,
      userId: args.userId,
      amountKzt,
      type: "booking_charge",
      bookingId: booking.id,
      note: "Оплата бронирования с баланса",
      metadataJson: {
        serviceCode: booking.service.code,
        startAt: booking.startAt.toISOString(),
        source: "customer_wallet_payment",
      },
    });

    if (booking.payment) {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { provider: "wallet", status: "paid" },
      });
    } else {
      await tx.payment.create({
        data: {
          bookingId: booking.id,
          provider: "wallet",
          status: "paid",
          amount: booking.priceTotal,
          currency: booking.currency,
          providerPaymentId: null,
        },
      });
    }

    if (booking.status === "pending_payment") {
      await tx.booking.update({
        where: { id: booking.id },
        data: { status: "confirmed" },
      });
    }
  });
}

export async function cancelCustomerHolds(args: { userId: string; holdIds: string[] }): Promise<void> {
  if (args.holdIds.length === 0) return;
  await prisma.bookingHold.updateMany({
    where: {
      id: { in: args.holdIds },
      customerId: args.userId,
      status: "active",
    },
    data: { status: "cancelled" },
  });
}

