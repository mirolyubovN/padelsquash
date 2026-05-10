import { prisma } from "@/src/lib/prisma";
import { hashTelegramLinkToken } from "@/src/lib/notifications/telegram-link-tokens";

export async function connectTrainerTelegramFromToken(input: {
  token: string;
  chatId: string;
  telegramUsername: string | null;
}): Promise<boolean> {
  const tokenHash = hashTelegramLinkToken(input.token);
  const now = new Date();

  const linkToken = await prisma.telegramLinkToken.findFirst({
    where: {
      tokenHash,
      purpose: "trainer_notifications",
      consumedAt: null,
      expiresAt: { gt: now },
      user: {
        role: "trainer",
        active: true,
      },
    },
    select: {
      id: true,
      userId: true,
    },
  });

  if (!linkToken) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await tx.telegramLinkToken.update({
      where: { id: linkToken.id },
      data: { consumedAt: now },
    });
    await tx.user.update({
      where: { id: linkToken.userId },
      data: {
        telegramChatId: input.chatId,
        telegramUsername: input.telegramUsername,
      },
    });
  });

  return true;
}
