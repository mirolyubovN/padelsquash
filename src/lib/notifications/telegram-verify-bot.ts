import { prisma } from "@/src/lib/prisma";
import {
	getTelegramBotUsername,
	getTelegramUpdates,
	sendTelegramMessage,
	type TelegramUpdate,
} from "@/src/lib/notifications/telegram";
import { isCustomerFullyVerified, normalizePhoneForComparison } from "@/src/lib/auth/verification";
import { registerCommonChatFromSecret } from "@/src/lib/notifications/telegram-channels";
import { connectTrainerTelegramFromToken } from "@/src/lib/notifications/trainer-telegram-link";

class TelegramVerifyBot {
	private isRunning = false;
	private lastUpdateId = 0;
	private pollTimer: ReturnType<typeof setTimeout> | null = null;

	start() {
		if (!getTelegramBotUsername() || !process.env.TELEGRAM_BOT_TOKEN?.trim()) {
			console.info("[telegram-verify] Bot token or username is not configured; verification bot disabled");
			return;
		}

		if (this.isRunning) {
			return;
		}

		this.isRunning = true;
		void this.poll();
	}

	stop() {
		this.isRunning = false;
		if (this.pollTimer) {
			clearTimeout(this.pollTimer);
			this.pollTimer = null;
		}
	}

	private async poll() {
		if (!this.isRunning) {
			return;
		}

		try {
			const updates = await getTelegramUpdates({
				offset: this.lastUpdateId + 1,
				timeoutSeconds: 30,
			});

			for (const update of updates) {
				await this.handleUpdate(update);
				this.lastUpdateId = update.update_id;
			}
		} catch (error) {
			console.error("[telegram-verify] Failed to poll Telegram updates", { error });
		}

		this.pollTimer = setTimeout(() => void this.poll(), 1000);
	}

	private async handleUpdate(update: TelegramUpdate) {
		const message = update.message;
		const chatId = message?.chat?.id !== undefined ? String(message.chat.id) : "";
		const fromId = message?.from?.id !== undefined ? String(message.from.id) : "";
		const username = typeof message?.from?.username === "string" ? message.from.username : null;

		if (!message || !chatId || !fromId) {
			return;
		}

		if (typeof message.text === "string") {
			const handled = await this.handleCommand({
				chatId,
				fromId,
				username,
				text: message.text,
				chatTitle: message.chat?.title ?? null,
				chatType: message.chat?.type ?? null,
			});
			if (handled) {
				return;
			}
		}

		if (message.contact?.phone_number) {
			const contactUserId = message.contact.user_id !== undefined ? String(message.contact.user_id) : null;
			if (contactUserId && contactUserId !== fromId) {
				await sendTelegramMessage({
					chatId,
					text: "Нужно отправить ваш собственный контакт, а не чужой.",
				});
				return;
			}

			await this.handleContact({
				chatId,
				telegramUserId: fromId,
				telegramUsername: username,
				phoneNumber: String(message.contact.phone_number),
			});
			return;
		}

		await this.sendStartInstructions(chatId);
	}

	private async handleCommand(input: {
		chatId: string;
		fromId: string;
		username: string | null;
		text: string;
		chatTitle: string | null;
		chatType: string | null;
	}): Promise<boolean> {
		const [commandWithBot, ...rest] = input.text.trim().split(/\s+/);
		const command = commandWithBot.split("@")[0]?.toLowerCase();

		if (command === "/getchatid") {
			await sendTelegramMessage({
				chatId: input.chatId,
				text: [`chat.id: ${input.chatId}`, `chat.type: ${input.chatType ?? "unknown"}`].join("\n"),
			});
			return true;
		}

		if (command === "/registerchat") {
			const chatType = input.chatType ?? "";
			if (chatType !== "group" && chatType !== "supergroup" && chatType !== "channel") {
				await sendTelegramMessage({
					chatId: input.chatId,
					text: "Команду /registerchat можно использовать только в групповом чате или канале.",
				});
				return true;
			}
			const secret = rest[0] ?? "";
			const registered = await registerCommonChatFromSecret({
				secret,
				chatId: input.chatId,
				chatTitle: input.chatTitle,
			});
			await sendTelegramMessage({
				chatId: input.chatId,
				text: registered
					? "Подключено как общий канал уведомлений Racket Community Kst."
					: "Не удалось подключить чат: секрет недействителен или истек.",
			});
			return true;
		}

		if (command === "/start") {
			const payload = rest[0] ?? "";
			if (payload.startsWith("trainer_")) {
				await this.handleTrainerStart({
					chatId: input.chatId,
					telegramUsername: input.username,
					token: payload.slice("trainer_".length),
				});
				return true;
			}
			if (payload.length > 0) {
				await sendTelegramMessage({
					chatId: input.chatId,
					text: "Эта ссылка подключения недействительна. Откройте свой раздел на сайте и запросите новую ссылку.",
				});
				return true;
			}
			await this.sendStartInstructions(input.chatId);
			return true;
		}

		return false;
	}

	private async handleTrainerStart(input: {
		chatId: string;
		telegramUsername: string | null;
		token: string;
	}) {
		const connected = await connectTrainerTelegramFromToken(input);
		if (!connected) {
			await sendTelegramMessage({
				chatId: input.chatId,
				text: "Ссылка подключения недействительна или истекла. Откройте кабинет тренера и создайте новую ссылку.",
			});
			return;
		}

		await sendTelegramMessage({
			chatId: input.chatId,
			text: "Личные уведомления о тренировках подключены.",
		});
	}

	private async sendStartInstructions(chatId: string) {
		await sendTelegramMessage({
			chatId,
			text: [
				"Подтверждение телефона для Racket Community Kst.",
				"Нажмите кнопку ниже и отправьте ваш контакт Telegram.",
			].join("\n"),
			replyMarkup: {
				keyboard: [[{ text: "Подтвердить номер телефона", request_contact: true }]],
				resize_keyboard: true,
				one_time_keyboard: true,
			},
		});
	}

	private async handleContact(input: {
		chatId: string;
		telegramUserId: string;
		telegramUsername: string | null;
		phoneNumber: string;
	}) {
		const normalizedContactPhone = normalizePhoneForComparison(input.phoneNumber);
		const now = new Date();
		const sessions = await prisma.phoneVerificationSession.findMany({
			where: {
				consumedAt: null,
				expiresAt: {
					gt: now,
				},
			},
			orderBy: {
				createdAt: "desc",
			},
			select: {
				id: true,
				userId: true,
				targetPhone: true,
				user: {
					select: {
						id: true,
						email: true,
						phone: true,
						pendingEmail: true,
						pendingPhone: true,
						role: true,
						emailVerifiedAt: true,
						phoneVerifiedAt: true,
					},
				},
			},
			take: 100,
		});

		const session = sessions.find((row) => normalizePhoneForComparison(row.targetPhone) === normalizedContactPhone);
		if (!session) {
			await sendTelegramMessage({
				chatId: input.chatId,
				text: [
					"Не найден активный запрос подтверждения для номера, который Telegram отправил из вашего контакта.",
					"Проверьте, что в регистрации указан тот же номер телефона, который привязан к вашему Telegram.",
					"Если номер в анкете неверный, вернитесь на сайт и измените телефон.",
				].join("\n"),
				replyMarkup: {
					remove_keyboard: true,
				},
			});
			return;
		}

		if ((session.user.phoneVerifiedAt && !session.user.pendingPhone) || isCustomerFullyVerified(session.user)) {
			await prisma.phoneVerificationSession.update({
				where: { id: session.id },
				data: {
					consumedAt: now,
					telegramChatId: input.chatId,
					telegramUserId: input.telegramUserId,
					telegramUsername: input.telegramUsername,
				},
			});
			await sendTelegramMessage({
				chatId: input.chatId,
				text: "Телефон уже подтвержден. Если email тоже подтвержден, можно входить в аккаунт.",
				replyMarkup: {
					remove_keyboard: true,
				},
			});
			return;
		}

		const updatedUser = await prisma.$transaction(async (tx) => {
			await tx.phoneVerificationSession.update({
				where: { id: session.id },
				data: {
					consumedAt: new Date(),
					telegramChatId: input.chatId,
					telegramUserId: input.telegramUserId,
					telegramUsername: input.telegramUsername,
				},
			});

			return tx.user.update({
				where: { id: session.userId },
				data: {
					phone: session.targetPhone,
					pendingPhone: null,
					phoneVerifiedAt: new Date(),
					telegramChatId: input.chatId,
					telegramUsername: input.telegramUsername,
				},
				select: {
					role: true,
					emailVerifiedAt: true,
					phoneVerifiedAt: true,
					pendingEmail: true,
					pendingPhone: true,
				},
			});
		});

		await sendTelegramMessage({
			chatId: input.chatId,
			text: isCustomerFullyVerified(updatedUser)
				? "Телефон подтвержден. Регистрация завершена, теперь вы можете войти в свой аккаунт."
				: "Телефон подтвержден. Осталось подтвердить email кодом из письма.",
			replyMarkup: {
				remove_keyboard: true,
			},
		});
	}
}

declare global {
	var __padelsquashTelegramVerifyBot: TelegramVerifyBot | undefined;
}

export function startTelegramVerifyBot() {
	globalThis.__padelsquashTelegramVerifyBot ??= new TelegramVerifyBot();
	globalThis.__padelsquashTelegramVerifyBot.start();
}
