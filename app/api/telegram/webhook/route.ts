import { NextResponse } from "next/server";
import {
  attachTelegramToVerificationSession,
  confirmPhoneByTelegramContact,
} from "@/src/lib/auth/verification";
import { sendTelegramMessage } from "@/src/lib/notifications/telegram";

export const dynamic = "force-dynamic";

function isWebhookAuthorized(request: Request): boolean {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return true;
  }

  const headerSecret = request.headers.get("x-telegram-bot-api-secret-token");
  return headerSecret === secret;
}

function parseStartPayload(text: string): string {
  const [command, payload] = text.trim().split(/\s+/, 2);
  if (command !== "/start") return "";
  return payload ?? "";
}

export async function POST(request: Request) {
  if (!isWebhookAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const update = await request.json().catch(() => null);
  const message = update?.message;
  if (!message) {
    return NextResponse.json({ ok: true });
  }

  const chatId = message.chat?.id !== undefined ? String(message.chat.id) : "";
  const fromId = message.from?.id !== undefined ? String(message.from.id) : "";
  const username = typeof message.from?.username === "string" ? message.from.username : null;

  if (!chatId || !fromId) {
    return NextResponse.json({ ok: true });
  }

  if (typeof message.text === "string" && message.text.trim().startsWith("/start")) {
    const payload = parseStartPayload(message.text);
    const result = await attachTelegramToVerificationSession({
      rawStartToken: payload,
      telegramChatId: chatId,
      telegramUserId: fromId,
      telegramUsername: username,
    });

    if (result.status === "awaiting_contact") {
      await sendTelegramMessage({
        chatId,
        text: [
          "Подтверждение телефона начато.",
          "Нажмите кнопку ниже и отправьте ваш контакт Telegram.",
        ].join("\n"),
        replyMarkup: {
          keyboard: [[{ text: "Подтвердить номер телефона", request_contact: true }]],
          resize_keyboard: true,
          one_time_keyboard: true,
        },
      });
    } else if (result.status === "already_verified") {
      await sendTelegramMessage({
        chatId,
        text: "Телефон уже подтвержден для этого аккаунта. Можете войти в приложении.",
      });
    } else if (result.status === "session_expired") {
      await sendTelegramMessage({
        chatId,
        text: "Ссылка подтверждения устарела. Откройте новую ссылку из страницы подтверждения регистрации.",
      });
    } else {
      await sendTelegramMessage({
        chatId,
        text: "Ссылка подтверждения недействительна. Проверьте ее и повторите попытку.",
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (message.contact?.phone_number) {
    const contactUserId = message.contact.user_id !== undefined ? String(message.contact.user_id) : null;

    if (contactUserId && contactUserId !== fromId) {
      await sendTelegramMessage({
        chatId,
        text: "Нужно отправить ваш собственный контакт, а не чужой.",
      });
      return NextResponse.json({ ok: true });
    }

    const result = await confirmPhoneByTelegramContact({
      telegramChatId: chatId,
      telegramUserId: fromId,
      telegramUsername: username,
      contactPhone: String(message.contact.phone_number),
    });

    if (result.status === "verified") {
      await sendTelegramMessage({
        chatId,
        text: result.fullyVerified
          ? "Телефон подтвержден. Регистрация завершена, теперь вы можете войти."
          : "Телефон подтвержден. Осталось подтвердить email по ссылке из письма.",
        replyMarkup: {
          remove_keyboard: true,
        },
      });
    } else if (result.status === "already_verified") {
      await sendTelegramMessage({
        chatId,
        text: "Телефон уже подтвержден. Если email тоже подтвержден, можно входить в аккаунт.",
        replyMarkup: {
          remove_keyboard: true,
        },
      });
    } else if (result.status === "phone_mismatch") {
      await sendTelegramMessage({
        chatId,
        text: `Этот номер не совпадает с номером в анкете: ${result.expectedPhone}. Проверьте введенный телефон и повторите.`,
      });
    } else {
      await sendTelegramMessage({
        chatId,
        text: "Не найдена активная сессия подтверждения. Откройте ссылку из страницы регистрации заново.",
      });
    }

    return NextResponse.json({ ok: true });
  }

  await sendTelegramMessage({
    chatId,
    text: "Для подтверждения телефона отправьте команду /start по ссылке из страницы регистрации.",
  });

  return NextResponse.json({ ok: true });
}
