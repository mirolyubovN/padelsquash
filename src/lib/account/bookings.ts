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
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";

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
    phone: string;
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
    select: { id: true, name: true, email: true, phone: true, role: true, walletBalance: true },
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

