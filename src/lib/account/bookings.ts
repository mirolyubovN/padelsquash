import {
  canCustomerCancelBooking,
  getSafeCustomerFreeCancellationHours,
} from "@/src/lib/bookings/policy";
import { prisma } from "@/src/lib/prisma";
import { isoToVenueTimezoneParts } from "@/src/lib/time/venue-timezone";
import { creditUserWallet } from "@/src/lib/wallet/service";

const FREE_CANCELLATION_HOURS = getSafeCustomerFreeCancellationHours();
const CANCELLATION_WINDOW_MS = FREE_CANCELLATION_HOURS * 60 * 60 * 1000;

export interface AccountBookingRow {
  id: string;
  serviceName: string;
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

function formatAmountKzt(amount: number): string {
  return `${amount.toLocaleString("ru-KZ")} ₸`;
}

function resolveAccountPaymentStatus(row: {
  payment: null | { status: "unpaid" | "paid" | "failed" | "refunded"; provider: string };
  status: AccountBookingRow["status"];
}): AccountBookingRow["paymentStatus"] {
  if (row.payment?.status) {
    return row.payment.status;
  }

  return row.status === "confirmed" ? "paid" : "none";
}

function getCancellationState(args: {
  startAt: Date;
  status: AccountBookingRow["status"];
  now?: Date;
}): Pick<AccountBookingRow, "canCancel" | "cancelBlockedReason" | "cancellationDeadlineText"> {
  const now = args.now ?? new Date();
  const cancelDeadline = new Date(args.startAt.getTime() - CANCELLATION_WINDOW_MS);
  const deadlineParts = isoToVenueTimezoneParts(cancelDeadline);

  if (args.status === "cancelled") {
    return { canCancel: false, cancelBlockedReason: "Бронирование уже отменено." };
  }
  if (args.status === "completed") {
    return { canCancel: false, cancelBlockedReason: "Завершенное бронирование нельзя отменить." };
  }
  if (args.status === "no_show") {
    return { canCancel: false, cancelBlockedReason: "Бронирование помечено как no_show." };
  }

  if (!canCustomerCancelBooking(args.startAt, now)) {
    return {
      canCancel: false,
      cancelBlockedReason: `Отмена без штрафа доступна не позднее чем за ${FREE_CANCELLATION_HOURS} часов до начала.`,
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

  const [upcoming, historyRows] = await Promise.all([
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
  ]);

  const cancellable = historyRows.reduce((count, row: { startAt: Date; status: AccountBookingRow["status"] }) => {
    return getCancellationState({ startAt: row.startAt, status: row.status, now }).canCancel ? count + 1 : count;
  }, 0);

  return {
    user: {
      ...user,
      walletBalanceKzt: Number(user.walletBalance),
    },
    totals: {
      upcoming,
      history: historyRows.length,
      cancellable,
    },
  };
}

export async function getAccountBookings(userId: string, limit = 100): Promise<AccountBookingRow[]> {
  const now = new Date();
  const rows = await prisma.booking.findMany({
    where: { customerId: userId },
    orderBy: [{ startAt: "desc" }],
    take: limit,
    include: {
      service: true,
      payment: true,
    },
  });

  return rows.map(
    (row: {
      id: string;
      startAt: Date;
      endAt: Date;
      status: AccountBookingRow["status"];
      priceTotal: unknown;
      service: { name: string };
      payment: null | { status: "unpaid" | "paid" | "failed" | "refunded"; provider: string };
    }) => {
      const startParts = isoToVenueTimezoneParts(row.startAt);
      const endParts = isoToVenueTimezoneParts(row.endAt);
      const cancellationState = getCancellationState({ startAt: row.startAt, status: row.status, now });
      const paymentStatus = resolveAccountPaymentStatus({ payment: row.payment, status: row.status });

      return {
        id: row.id,
        serviceName: row.service.name,
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

  return prisma.$transaction(async (tx) => {
    if (booking.payment?.status === "paid") {
      await tx.payment.update({
        where: { id: booking.payment.id },
        data: { status: "refunded" },
      });
    }

    const hasWalletCharge = booking.walletTransactions.some((row) => row.type === "booking_charge");
    const alreadyRefundedToWallet = booking.walletTransactions.some((row) => row.type === "booking_refund");

    if (hasWalletCharge && !alreadyRefundedToWallet) {
      await creditUserWallet({
        tx,
        userId: args.userId,
        amountKzt: Number(booking.priceTotal),
        type: "booking_refund",
        bookingId: booking.id,
        note: "Возврат на баланс после отмены бронирования",
        metadataJson: {
          source: "booking_cancellation",
        },
      });
    }

    return tx.booking.update({
      where: { id: booking.id },
      data: { status: "cancelled" },
    });
  });
}

