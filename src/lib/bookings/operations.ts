import type { Prisma } from "@prisma/client";
import { creditUserWallet, debitUserWallet } from "@/src/lib/wallet/service";

type BookingOpsTx = Prisma.TransactionClient;
export type AdminBookingPaymentState = "unpaid_manual" | "paid_manual" | "paid_wallet" | "refunded_manual";

async function upsertBookingPayment(args: {
  tx: BookingOpsTx;
  bookingId: string;
  paymentId?: string;
  provider: "manual" | "wallet";
  status: "unpaid" | "paid" | "refunded";
  amount: Prisma.Decimal;
  currency: string;
}) {
  if (args.paymentId) {
    return args.tx.payment.update({
      where: { id: args.paymentId },
      data: {
        provider: args.provider,
        status: args.status,
      },
    });
  }

  return args.tx.payment.create({
    data: {
      bookingId: args.bookingId,
      provider: args.provider,
      status: args.status,
      amount: args.amount,
      currency: args.currency,
      providerPaymentId: null,
    },
  });
}

export async function cancelBookingWithRefundInTx(args: {
  tx: BookingOpsTx;
  bookingId: string;
  cancelledBy?: string;
  cancellationReason?: string;
}) {
  const booking = await args.tx.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      customerId: true,
      status: true,
      priceTotal: true,
      payment: {
        select: {
          id: true,
          status: true,
        },
      },
      walletTransactions: {
        where: {
          type: {
            in: ["booking_charge", "booking_refund"],
          },
        },
        select: {
          type: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  if (booking.status === "cancelled") {
    return booking;
  }

  if (booking.status === "completed") {
    throw new Error("Завершенное бронирование нельзя отменить");
  }

  if (booking.status === "no_show") {
    throw new Error("Бронирование с неявкой нельзя отменить");
  }

  if (booking.payment?.status === "paid") {
    await args.tx.payment.update({
      where: { id: booking.payment.id },
      data: { status: "refunded" },
    });
  }

  const hasWalletCharge = booking.walletTransactions.some((row) => row.type === "booking_charge");
  const alreadyRefundedToWallet = booking.walletTransactions.some((row) => row.type === "booking_refund");

  if (hasWalletCharge && !alreadyRefundedToWallet) {
    await creditUserWallet({
      tx: args.tx,
      userId: booking.customerId,
      amountKzt: Number(booking.priceTotal),
      type: "booking_refund",
      bookingId: booking.id,
      note: "Возврат на баланс после отмены бронирования",
      metadataJson: {
        source: "booking_cancellation",
      },
    });
  }

  return args.tx.booking.update({
    where: { id: booking.id },
    data: {
      status: "cancelled",
      cancelledBy: args.cancelledBy ?? null,
      cancelledAt: new Date(),
      cancellationReason: args.cancellationReason ?? null,
    },
  });
}

export async function settlePendingBookingPaymentInTx(args: {
  tx: BookingOpsTx;
  bookingId: string;
  method: "wallet" | "cash";
}) {
  const booking = await args.tx.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      customerId: true,
      status: true,
      priceTotal: true,
      currency: true,
      startAt: true,
      service: {
        select: {
          code: true,
        },
      },
      payment: {
        select: {
          id: true,
          status: true,
          provider: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  if (booking.status !== "pending_payment") {
    throw new Error("Оплатить можно только бронирование со статусом ожидания оплаты");
  }

  if (args.method === "wallet") {
    await debitUserWallet({
      tx: args.tx,
      userId: booking.customerId,
      amountKzt: Number(booking.priceTotal),
      type: "booking_charge",
      bookingId: booking.id,
      note: "Оплата бронирования с баланса",
      metadataJson: {
        serviceCode: booking.service.code,
        startAt: booking.startAt.toISOString(),
        source: "admin_pending_payment_settlement",
      },
    });
  }

  if (booking.payment) {
    await args.tx.payment.update({
      where: { id: booking.payment.id },
      data: {
        provider: args.method === "wallet" ? "wallet" : "manual",
        status: "paid",
      },
    });
  } else {
    await args.tx.payment.create({
      data: {
        bookingId: booking.id,
        provider: args.method === "wallet" ? "wallet" : "manual",
        status: "paid",
        amount: booking.priceTotal,
        currency: booking.currency,
        providerPaymentId: null,
      },
    });
  }

  return args.tx.booking.update({
    where: { id: booking.id },
    data: { status: "confirmed" },
  });
}

export async function setAdminBookingPaymentStateInTx(args: {
  tx: BookingOpsTx;
  bookingId: string;
  state: AdminBookingPaymentState;
}) {
  const booking = await args.tx.booking.findUnique({
    where: { id: args.bookingId },
    select: {
      id: true,
      customerId: true,
      status: true,
      priceTotal: true,
      currency: true,
      startAt: true,
      service: {
        select: {
          code: true,
        },
      },
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
          amount: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Бронирование не найдено");
  }

  const walletNetDelta = booking.walletTransactions.reduce((sum, row) => sum + Number(row.amount), 0);
  const walletPaidActive = walletNetDelta < 0;

  if (args.state === "paid_wallet" && !walletPaidActive) {
    await debitUserWallet({
      tx: args.tx,
      userId: booking.customerId,
      amountKzt: Number(booking.priceTotal),
      type: "booking_charge",
      bookingId: booking.id,
      note: "Коррекция оплаты бронирования с баланса",
      metadataJson: {
        serviceCode: booking.service.code,
        startAt: booking.startAt.toISOString(),
        source: "admin_payment_status_correction",
      },
    });
  }

  if (args.state !== "paid_wallet" && walletPaidActive) {
    await creditUserWallet({
      tx: args.tx,
      userId: booking.customerId,
      amountKzt: Number(booking.priceTotal),
      type: "booking_refund",
      bookingId: booking.id,
      note: "Возврат на баланс после коррекции статуса оплаты",
      metadataJson: {
        source: "admin_payment_status_correction",
      },
    });
  }

  if (args.state === "unpaid_manual") {
    await upsertBookingPayment({
      tx: args.tx,
      bookingId: booking.id,
      paymentId: booking.payment?.id,
      provider: "manual",
      status: "unpaid",
      amount: booking.priceTotal,
      currency: booking.currency,
    });

    if (booking.status === "confirmed") {
      await args.tx.booking.update({
        where: { id: booking.id },
        data: { status: "pending_payment" },
      });
    }

    return;
  }

  if (args.state === "paid_manual") {
    await upsertBookingPayment({
      tx: args.tx,
      bookingId: booking.id,
      paymentId: booking.payment?.id,
      provider: "manual",
      status: "paid",
      amount: booking.priceTotal,
      currency: booking.currency,
    });

    if (booking.status === "pending_payment") {
      await args.tx.booking.update({
        where: { id: booking.id },
        data: { status: "confirmed" },
      });
    }

    return;
  }

  if (args.state === "paid_wallet") {
    await upsertBookingPayment({
      tx: args.tx,
      bookingId: booking.id,
      paymentId: booking.payment?.id,
      provider: "wallet",
      status: "paid",
      amount: booking.priceTotal,
      currency: booking.currency,
    });

    if (booking.status === "pending_payment") {
      await args.tx.booking.update({
        where: { id: booking.id },
        data: { status: "confirmed" },
      });
    }

    return;
  }

  await upsertBookingPayment({
    tx: args.tx,
    bookingId: booking.id,
    paymentId: booking.payment?.id,
    provider: "manual",
    status: "refunded",
    amount: booking.priceTotal,
    currency: booking.currency,
  });
}
