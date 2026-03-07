import { Prisma } from "@prisma/client";
import type { PrismaClient, WalletTransaction, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";

export const DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT = 50_000;
export const DEFAULT_WALLET_TOP_UP_BONUS_PERCENT = 10;

export type WalletDbClient = PrismaClient | Prisma.TransactionClient;

export interface WalletBonusSettings {
  thresholdKzt: number;
  bonusPercent: number;
  active: boolean;
}

export interface CreditUserWalletArgs {
  userId: string;
  amountKzt: number;
  actorUserId?: string;
  type?: "topup" | "admin_credit" | "booking_refund";
  note?: string;
  bookingId?: string;
  holdId?: string;
  metadataJson?: Prisma.InputJsonValue;
  applyBonus?: boolean;
  tx?: Prisma.TransactionClient;
}

export interface SaveWalletBonusSettingsArgs {
  thresholdKzt: number;
  bonusPercent: number;
  active: boolean;
}

export interface DebitUserWalletArgs {
  userId: string;
  amountKzt: number;
  actorUserId?: string;
  type?: "admin_debit" | "booking_charge";
  note?: string;
  bookingId?: string;
  holdId?: string;
  metadataJson?: Prisma.InputJsonValue;
  tx?: Prisma.TransactionClient;
}

function assertPositiveWholeKzt(amountKzt: number, fieldName: string) {
  if (!Number.isFinite(amountKzt) || amountKzt <= 0) {
    throw new Error(`${fieldName} должен быть положительным числом`);
  }
}

function toDecimalAmount(amountKzt: number): Prisma.Decimal {
  return new Prisma.Decimal(amountKzt.toFixed(2));
}

async function ensureWalletBonusConfig(tx: WalletDbClient): Promise<void> {
  const existing = await tx.walletBonusConfig.findUnique({
    where: { key: "default" },
    select: { key: true },
  });

  if (existing) {
    return;
  }

  await tx.walletBonusConfig.create({
    data: {
      key: "default",
      thresholdKzt: DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
      bonusPercent: DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
      active: true,
    },
  });
}

export async function getWalletBonusSettings(tx: WalletDbClient = prisma): Promise<WalletBonusSettings> {
  await ensureWalletBonusConfig(tx);

  const config = await tx.walletBonusConfig.findUnique({
    where: { key: "default" },
  });

  if (!config) {
    return {
      thresholdKzt: DEFAULT_WALLET_TOP_UP_BONUS_THRESHOLD_KZT,
      bonusPercent: DEFAULT_WALLET_TOP_UP_BONUS_PERCENT,
      active: true,
    };
  }

  return {
    thresholdKzt: Number(config.thresholdKzt),
    bonusPercent: config.bonusPercent,
    active: config.active,
  };
}

export function calculateWalletTopUpBonus(amountKzt: number, settings: WalletBonusSettings): number {
  if (!settings.active || amountKzt < settings.thresholdKzt) {
    return 0;
  }

  return Math.floor((amountKzt * settings.bonusPercent) / 100);
}

async function appendWalletTransaction(args: {
  tx: Prisma.TransactionClient;
  userId: string;
  actorUserId?: string;
  type: WalletTransactionType;
  amountKzt: number;
  balanceAfterKzt: number;
  note?: string;
  bookingId?: string;
  holdId?: string;
  metadataJson?: Prisma.InputJsonValue;
}): Promise<WalletTransaction> {
  return args.tx.walletTransaction.create({
    data: {
      userId: args.userId,
      actorUserId: args.actorUserId,
      type: args.type,
      amount: toDecimalAmount(args.amountKzt),
      balanceAfter: toDecimalAmount(args.balanceAfterKzt),
      currency: "KZT",
      note: args.note,
      bookingId: args.bookingId,
      holdId: args.holdId,
      metadataJson: args.metadataJson,
    },
  });
}

async function runWalletMutation<T>(
  tx: Prisma.TransactionClient | undefined,
  fn: (db: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  if (tx) {
    return fn(tx);
  }

  return prisma.$transaction((innerTx) => fn(innerTx), {
    isolationLevel: "Serializable",
  });
}

export async function getUserWalletBalance(userId: string, tx: WalletDbClient = prisma): Promise<number> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { walletBalance: true },
  });

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return Number(user.walletBalance);
}

export async function saveWalletBonusSettings(args: SaveWalletBonusSettingsArgs): Promise<WalletBonusSettings> {
  assertPositiveWholeKzt(args.thresholdKzt, "thresholdKzt");

  if (!Number.isInteger(args.bonusPercent) || args.bonusPercent < 0 || args.bonusPercent > 100) {
    throw new Error("bonusPercent должен быть целым числом от 0 до 100");
  }

  const record = await prisma.walletBonusConfig.upsert({
    where: { key: "default" },
    create: {
      key: "default",
      thresholdKzt: toDecimalAmount(args.thresholdKzt),
      bonusPercent: args.bonusPercent,
      active: args.active,
    },
    update: {
      thresholdKzt: toDecimalAmount(args.thresholdKzt),
      bonusPercent: args.bonusPercent,
      active: args.active,
    },
  });

  return {
    thresholdKzt: Number(record.thresholdKzt),
    bonusPercent: record.bonusPercent,
    active: record.active,
  };
}

export async function creditUserWallet(args: CreditUserWalletArgs) {
  assertPositiveWholeKzt(args.amountKzt, "amountKzt");

  return runWalletMutation(args.tx, async (tx) => {
    const [user, settings] = await Promise.all([
      tx.user.findUnique({
        where: { id: args.userId },
        select: { id: true, walletBalance: true },
      }),
      getWalletBonusSettings(tx),
    ]);

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const bonusAmount =
      args.applyBonus === false || args.type === "admin_credit" || args.type === "booking_refund"
        ? 0
        : calculateWalletTopUpBonus(args.amountKzt, settings);

    let nextBalance = Number(user.walletBalance) + args.amountKzt;
    const transactions: WalletTransaction[] = [];

    transactions.push(
      await appendWalletTransaction({
        tx,
        userId: args.userId,
        actorUserId: args.actorUserId,
        type: args.type ?? "topup",
        amountKzt: args.amountKzt,
        balanceAfterKzt: nextBalance,
        note: args.note,
        bookingId: args.bookingId,
        holdId: args.holdId,
        metadataJson: args.metadataJson,
      }),
    );

    if (bonusAmount > 0) {
      nextBalance += bonusAmount;
      transactions.push(
        await appendWalletTransaction({
          tx,
          userId: args.userId,
          actorUserId: args.actorUserId,
          type: "bonus",
          amountKzt: bonusAmount,
          balanceAfterKzt: nextBalance,
          note: `Бонус ${settings.bonusPercent}% за пополнение`,
          metadataJson: {
            thresholdKzt: settings.thresholdKzt,
            bonusPercent: settings.bonusPercent,
          },
        }),
      );
    }

    await tx.user.update({
      where: { id: args.userId },
      data: { walletBalance: toDecimalAmount(nextBalance) },
    });

    return {
      userId: args.userId,
      creditedAmountKzt: args.amountKzt,
      bonusAmountKzt: bonusAmount,
      newBalanceKzt: nextBalance,
      transactions,
    };
  });
}

export async function debitUserWallet(args: DebitUserWalletArgs) {
  assertPositiveWholeKzt(args.amountKzt, "amountKzt");

  return runWalletMutation(args.tx, async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: args.userId },
      select: { id: true, walletBalance: true },
    });

    if (!user) {
      throw new Error("Пользователь не найден");
    }

    const currentBalance = Number(user.walletBalance);
    if (currentBalance < args.amountKzt) {
      throw new Error("Недостаточно средств на балансе");
    }

    const nextBalance = currentBalance - args.amountKzt;
    const transaction = await appendWalletTransaction({
      tx,
      userId: args.userId,
      actorUserId: args.actorUserId,
      type: args.type ?? "booking_charge",
      amountKzt: -args.amountKzt,
      balanceAfterKzt: nextBalance,
      note: args.note,
      bookingId: args.bookingId,
      holdId: args.holdId,
      metadataJson: args.metadataJson,
    });

    await tx.user.update({
      where: { id: args.userId },
      data: { walletBalance: toDecimalAmount(nextBalance) },
    });

    return {
      userId: args.userId,
      debitedAmountKzt: args.amountKzt,
      newBalanceKzt: nextBalance,
      transaction,
    };
  });
}

export async function adjustUserWalletByEmail(args: {
  customerEmail: string;
  amountKzt: number;
  direction: "credit" | "debit";
  actorUserId: string;
  note?: string;
}) {
  const normalizedEmail = args.customerEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error("Укажите email клиента");
  }

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true, role: true, walletBalance: true },
  });

  if (!user) {
    throw new Error("Клиент с таким email не найден");
  }

  if (user.role !== "customer") {
    throw new Error("Баланс можно менять только у клиентского аккаунта");
  }

  if (args.direction === "credit") {
    return creditUserWallet({
      userId: user.id,
      amountKzt: args.amountKzt,
      actorUserId: args.actorUserId,
      type: "admin_credit",
      note: args.note,
      applyBonus: false,
      metadataJson: {
        source: "admin_manual_adjustment",
        customerEmail: normalizedEmail,
      },
    });
  }

  return debitUserWallet({
    userId: user.id,
    amountKzt: args.amountKzt,
    actorUserId: args.actorUserId,
    type: "admin_debit",
    note: args.note,
    metadataJson: {
      source: "admin_manual_adjustment",
      customerEmail: normalizedEmail,
    },
  });
}
