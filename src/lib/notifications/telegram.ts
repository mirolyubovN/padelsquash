interface TelegramSendMessageInput {
  chatId: string;
  text: string;
  replyMarkup?: Record<string, unknown>;
}

function getTelegramBotToken(): string | null {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return token ? token : null;
}

export function getTelegramBotUsername(): string | null {
  const raw = process.env.TELEGRAM_BOT_USERNAME?.trim();
  if (!raw) return null;
  return raw.startsWith("@") ? raw.slice(1) : raw;
}

export function isTelegramDeliveryConfigured(): boolean {
  return getTelegramBotToken() !== null;
}

function getTelegramApiUrl(path: string): string | null {
  const token = getTelegramBotToken();
  if (!token) return null;
  return `https://api.telegram.org/bot${token}/${path}`;
}

export async function sendTelegramMessage(input: TelegramSendMessageInput): Promise<boolean> {
  const url = getTelegramApiUrl("sendMessage");
  if (!url) {
    console.info("[telegram] Bot token is not configured; skipping message delivery", { chatId: input.chatId });
    return false;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        chat_id: input.chatId,
        text: input.text,
        reply_markup: input.replyMarkup,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[telegram] Telegram API responded with error", {
        status: response.status,
        body: errorText,
      });
      return false;
    }

    return true;
  } catch (error) {
    console.error("[telegram] Failed to send Telegram message", { error });
    return false;
  }
}
