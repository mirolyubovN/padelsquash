import { prisma } from "@/src/lib/prisma";
import { assertTrainer } from "@/src/lib/auth/guards";
import { getTelegramBotUsername, sendTelegramMessage } from "@/src/lib/notifications/telegram";
import {
	createTelegramLinkToken,
	getTelegramLinkTtlMinutes,
	hashTelegramLinkToken,
} from "@/src/lib/notifications/telegram-link-tokens";

export interface TrainerTelegramNotificationState {
	botUsername: string | null;
	connected: boolean;
	telegramChatId: string | null;
	telegramUsername: string | null;
	linkUrl: string | null;
	expiresAt: Date | null;
}

export async function getTrainerTelegramNotificationState(): Promise<TrainerTelegramNotificationState> {
	const session = await assertTrainer();
	const botUsername = getTelegramBotUsername();
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: {
			telegramChatId: true,
			telegramUsername: true,
		},
	});

	if (!botUsername) {
		return {
			botUsername: null,
			connected: Boolean(user?.telegramChatId),
			telegramChatId: user?.telegramChatId ?? null,
			telegramUsername: user?.telegramUsername ?? null,
			linkUrl: null,
			expiresAt: null,
		};
	}

	if (user?.telegramChatId) {
		return {
			botUsername,
			connected: true,
			telegramChatId: user.telegramChatId,
			telegramUsername: user.telegramUsername ?? null,
			linkUrl: null,
			expiresAt: null,
		};
	}

	const link = await requestTrainerTelegramLink();

	return {
		botUsername,
		connected: false,
		telegramChatId: null,
		telegramUsername: null,
		linkUrl: link.url,
		expiresAt: link.expiresAt,
	};
}

export async function requestTrainerTelegramLink(): Promise<{ url: string; expiresAt: Date }> {
	const session = await assertTrainer();
	const botUsername = getTelegramBotUsername();
	if (!botUsername) {
		throw new Error("Telegram-бот не настроен.");
	}

	const token = createTelegramLinkToken();
	const now = new Date();
	const expiresAt = new Date(now.getTime() + getTelegramLinkTtlMinutes() * 60 * 1000);

	await prisma.$transaction(async (tx) => {
		await tx.telegramLinkToken.deleteMany({
			where: {
				userId: session.user.id,
				purpose: "trainer_notifications",
			},
		});
		await tx.telegramLinkToken.create({
			data: {
				userId: session.user.id,
				purpose: "trainer_notifications",
				tokenHash: hashTelegramLinkToken(token),
				expiresAt,
			},
		});
	});

	return {
		url: `https://t.me/${botUsername}?start=trainer_${token}`,
		expiresAt,
	};
}

export async function disconnectTrainerTelegram(): Promise<void> {
	const session = await assertTrainer();
	const user = await prisma.user.findUnique({
		where: { id: session.user.id },
		select: { telegramChatId: true },
	});

	if (user?.telegramChatId) {
		await sendTelegramMessage({
			chatId: user.telegramChatId,
			text: "Личные уведомления Racket Community Kst отключены.",
		});
	}

	await prisma.user.update({
		where: { id: session.user.id },
		data: {
			telegramChatId: null,
			telegramUsername: null,
		},
	});
}
