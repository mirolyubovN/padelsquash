import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/src/lib/prisma";
import { createRegisterChatSecret, registerCommonChatFromSecret } from "@/src/lib/notifications/telegram-channels";
import { createTelegramLinkToken, hashTelegramLinkToken } from "@/src/lib/notifications/telegram-link-tokens";
import { connectTrainerTelegramFromToken } from "@/src/lib/notifications/trainer-telegram-link";
import { uniqueEmail } from "./helpers";

describe("Telegram notification integration", () => {
  function uniquePhone(): string {
    return `+7707${String(Date.now()).slice(-7)}`;
  }

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it("registers a common chat with a signed super-admin secret", async () => {
    const superAdmin = await prisma.user.findFirstOrThrow({
      where: { role: "super_admin", active: true },
      select: { id: true },
    });
    const secret = createRegisterChatSecret(superAdmin.id);

    const registered = await registerCommonChatFromSecret({
      secret,
      chatId: "-1005550001",
      chatTitle: "Ops test chat",
    });

    const config = await prisma.telegramChannelConfig.findUnique({ where: { key: "default" } });
    expect(registered).toBe(true);
    expect(config?.commonChatId).toBe("-1005550001");
    expect(config?.commonChatTitle).toBe("Ops test chat");
  });

  it("connects a trainer DM from a single-use token", async () => {
    const [sport, location] = await Promise.all([
      prisma.sport.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
      prisma.location.findFirstOrThrow({ where: { active: true }, select: { id: true } }),
    ]);
    const instructor = await prisma.instructor.create({
      data: {
        name: "Telegram Test Trainer",
        active: true,
        instructorSports: { create: { sportId: sport.id, pricePerHour: 10000 } },
        instructorLocations: { create: { locationId: location.id, active: true } },
      },
      select: { id: true },
    });
    const trainer = await prisma.user.create({
      data: {
        name: "Telegram Trainer",
        email: uniqueEmail("telegram-trainer"),
        phone: uniquePhone(),
        passwordHash: "test-password-hash",
        role: "trainer",
        active: true,
        instructorId: instructor.id,
      },
      select: { id: true },
    });
    const token = createTelegramLinkToken();
    await prisma.telegramLinkToken.create({
      data: {
        userId: trainer.id,
        purpose: "trainer_notifications",
        tokenHash: hashTelegramLinkToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    });

    await expect(
      connectTrainerTelegramFromToken({
        token,
        chatId: "123456",
        telegramUsername: "trainer_test",
      }),
    ).resolves.toBe(true);
    await expect(
      connectTrainerTelegramFromToken({
        token,
        chatId: "999",
        telegramUsername: "trainer_test_2",
      }),
    ).resolves.toBe(false);

    const updated = await prisma.user.findUniqueOrThrow({ where: { id: trainer.id } });
    expect(updated.telegramChatId).toBe("123456");
    expect(updated.telegramUsername).toBe("trainer_test");
  });
});
