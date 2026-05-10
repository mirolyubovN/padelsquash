interface TelegramSendMessageInput {
  chatId: string;
  text: string;
  replyMarkup?: Record<string, unknown>;
}

export interface TelegramUpdateMessage {
  message_id?: number;
  chat?: {
    id?: number | string;
  };
  from?: {
    id?: number | string;
    username?: string;
  };
  text?: string;
  contact?: {
    phone_number?: string;
    user_id?: number | string;
  };
}

export interface TelegramUpdate {
  update_id: number;
  message?: TelegramUpdateMessage;
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

export async function getTelegramUpdates(input: { offset?: number; timeoutSeconds?: number } = {}): Promise<TelegramUpdate[]> {
  const url = getTelegramApiUrl("getUpdates");
  if (!url) {
    console.info("[telegram] Bot token is not configured; skipping update polling");
    return [];
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        offset: input.offset,
        limit: 100,
        timeout: input.timeoutSeconds ?? 30,
        allowed_updates: ["message"],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      console.error("[telegram] Telegram API responded with error while polling updates", {
        status: response.status,
        body: errorText,
      });
      return [];
    }

    const payload = (await response.json().catch(() => null)) as { ok?: boolean; result?: TelegramUpdate[] } | null;
    return payload?.ok && Array.isArray(payload.result) ? payload.result : [];
  } catch (error) {
    console.error("[telegram] Failed to poll Telegram updates", { error });
    return [];
  }
}
