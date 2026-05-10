import { prisma } from "@/src/lib/prisma";
import {
  getTelegramBotUsername,
  getTelegramUpdates,
  sendTelegramMessage,
  type TelegramUpdate,
} from "@/src/lib/notifications/telegram";
import { isCustomerFullyVerified, normalizePhoneForComparison } from "@/src/lib/auth/verification";

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

    if (typeof message.text === "string" && message.text.trim().startsWith("/start")) {
      await this.sendStartInstructions(chatId);
      return;
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

  private async sendStartInstructions(chatId: string) {
    await sendTelegramMessage({
      chatId,
      text: [
        "Подтверждение телефона для Padel & Squash KZ.",
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
