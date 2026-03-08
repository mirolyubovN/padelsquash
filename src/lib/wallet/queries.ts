import { prisma } from "@/src/lib/prisma";
import { buildRussianYoVariants } from "@/src/lib/search/russian";
import { getWalletBonusSettings } from "@/src/lib/wallet/service";

export interface WalletTransactionListItem {
  id: string;
  createdAtIso: string;
  type: string;
  amountKzt: number;
  balanceAfterKzt: number;
  note?: string;
  bookingId?: string;
  holdId?: string;
  userName?: string;
  userEmail?: string;
  actorName?: string;
}

export interface AdminWalletCustomerListItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  balanceKzt: number;
  bookingsCount: number;
  createdAtIso: string;
  needsPasswordSetup: boolean;
}

export async function getAccountWalletPageData(userId: string, limit = 12) {
  const [user, bonusSettings, transactions] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        walletBalance: true,
      },
    }),
    getWalletBonusSettings(),
    prisma.walletTransaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        type: true,
        amount: true,
        balanceAfter: true,
        note: true,
        bookingId: true,
        holdId: true,
      },
    }),
  ]);

  if (!user) {
    throw new Error("Пользователь не найден");
  }

  return {
    balanceKzt: Number(user.walletBalance),
    bonusSettings,
    transactions: transactions.map((row) => ({
      id: row.id,
      createdAtIso: row.createdAt.toISOString(),
      type: row.type,
      amountKzt: Number(row.amount),
      balanceAfterKzt: Number(row.balanceAfter),
      note: row.note ?? undefined,
      bookingId: row.bookingId ?? undefined,
      holdId: row.holdId ?? undefined,
    })) satisfies WalletTransactionListItem[],
  };
}

export async function getAdminWalletPageData(limit = 30, customerQuery?: string, customerLimit = 40) {
  const normalizedCustomerQuery = customerQuery?.trim();
  const yoAwareNameQueries = normalizedCustomerQuery ? buildRussianYoVariants(normalizedCustomerQuery) : [];

  const [bonusSettings, transactions, customers] = await Promise.all([
    getWalletBonusSettings(),
    prisma.walletTransaction.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        createdAt: true,
        type: true,
        amount: true,
        balanceAfter: true,
        note: true,
        bookingId: true,
        holdId: true,
        user: {
          select: {
            name: true,
            email: true,
          },
        },
        actorUser: {
          select: {
            name: true,
          },
        },
      },
    }),
    prisma.user.findMany({
      where: {
        role: "customer",
        ...(normalizedCustomerQuery
          ? {
              OR: [
                ...yoAwareNameQueries.map((nameQuery) => ({
                  name: { contains: nameQuery, mode: "insensitive" as const },
                })),
                { phone: { contains: normalizedCustomerQuery } },
              ],
            }
          : {}),
      },
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      take: customerLimit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        passwordHash: true,
        walletBalance: true,
        createdAt: true,
        _count: {
          select: {
            bookings: true,
          },
        },
      },
    }),
  ]);

  return {
    bonusSettings,
    transactions: transactions.map((row) => ({
      id: row.id,
      createdAtIso: row.createdAt.toISOString(),
      type: row.type,
      amountKzt: Number(row.amount),
      balanceAfterKzt: Number(row.balanceAfter),
      note: row.note ?? undefined,
      bookingId: row.bookingId ?? undefined,
      holdId: row.holdId ?? undefined,
      userName: row.user.name,
      userEmail: row.user.email,
      actorName: row.actorUser?.name ?? undefined,
    })) satisfies WalletTransactionListItem[],
    customers: customers.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      phone: row.phone,
      passwordHash: row.passwordHash,
      balanceKzt: Number(row.walletBalance),
      bookingsCount: row._count.bookings,
      createdAtIso: row.createdAt.toISOString(),
      needsPasswordSetup: !row.passwordHash.startsWith("$2"),
    })) satisfies AdminWalletCustomerListItem[],
  };
}
