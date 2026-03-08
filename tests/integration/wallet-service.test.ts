import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/src/lib/prisma";
import { creditUserWallet, debitUserWallet } from "@/src/lib/wallet/service";
import { uniqueEmail } from "./helpers";

describe("wallet service integration", () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("keeps wallet adjustments working when actor id is stale", async () => {
    const customer = await prisma.user.create({
      data: {
        name: "Wallet Actor Stale Customer",
        email: uniqueEmail("wallet-actor-stale"),
        phone: "+77070001234",
        passwordHash: "test-password-hash",
        role: "customer",
      },
      select: { id: true },
    });

    const staleActorId = `stale-actor-${Date.now()}`;

    await creditUserWallet({
      userId: customer.id,
      amountKzt: 20_000,
      actorUserId: staleActorId,
      type: "admin_credit",
      applyBonus: false,
      note: "Integration stale actor credit",
    });

    await debitUserWallet({
      userId: customer.id,
      amountKzt: 5_000,
      actorUserId: staleActorId,
      type: "admin_debit",
      note: "Integration stale actor debit",
    });

    const [creditTx, debitTx, customerBalance] = await Promise.all([
      prisma.walletTransaction.findFirst({
        where: {
          userId: customer.id,
          type: "admin_credit",
        },
        orderBy: { createdAt: "desc" },
        select: { actorUserId: true },
      }),
      prisma.walletTransaction.findFirst({
        where: {
          userId: customer.id,
          type: "admin_debit",
        },
        orderBy: { createdAt: "desc" },
        select: { actorUserId: true },
      }),
      prisma.user.findUnique({
        where: { id: customer.id },
        select: { walletBalance: true },
      }),
    ]);

    expect(creditTx?.actorUserId).toBeNull();
    expect(debitTx?.actorUserId).toBeNull();
    expect(Number(customerBalance?.walletBalance ?? 0)).toBe(15_000);
  });
});

