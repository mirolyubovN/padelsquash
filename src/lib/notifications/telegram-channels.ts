import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/src/lib/prisma";
import { sendTelegramMessage } from "@/src/lib/notifications/telegram";

const DEFAULT_KEY = "default";
const SECRET_TTL_MS = 10 * 60 * 1000;
const SECRET_VERSION = 1;

export interface TelegramRecipient {
  kind: "user" | "common_chat";
  chatId: string;
  label?: string;
}

export interface TelegramChannelSettings {
  commonChatId: string | null;
  commonChatTitle: string | null;
  enabled: boolean;
  updatedAt: Date | null;
}

interface RegisterChatPayload {
  v: number;
  uid: string;
  exp: number;
}

function getSecretKey(): string {
  return process.env.NEXTAUTH_SECRET ?? "dev-telegram-channel-secret";
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSecretKey()).update(encodedPayload).digest("base64url");
}

function verifyRegisterChatSecret(secret: string): RegisterChatPayload | null {
  const [encodedPayload, signature] = secret.split(".");
  if (!encodedPayload || !signature) return null;

  const expected = signPayload(encodedPayload);
  const actualBuffer = Buffer.from(signature, "base64url");
  const expectedBuffer = Buffer.from(expected, "base64url");
  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8")) as RegisterChatPayload;
    if (payload.v !== SECRET_VERSION || typeof payload.uid !== "string" || payload.exp <= Date.now()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

export function createRegisterChatSecret(userId: string): string {
  const payload: RegisterChatPayload = {
    v: SECRET_VERSION,
    uid: userId,
    exp: Date.now() + SECRET_TTL_MS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${encodedPayload}.${signPayload(encodedPayload)}`;
}

export async function resolveCommonChatRecipient(): Promise<TelegramRecipient | null> {
  const config = await prisma.telegramChannelConfig.findUnique({ where: { key: DEFAULT_KEY } });
  if (!config?.enabled || !config.commonChatId) return null;
  return {
    kind: "common_chat",
    chatId: config.commonChatId,
    label: config.commonChatTitle ?? "Общий канал",
  };
}

export async function getTelegramChannelSettings(): Promise<TelegramChannelSettings> {
  const config = await prisma.telegramChannelConfig.findUnique({ where: { key: DEFAULT_KEY } });
  return {
    commonChatId: config?.commonChatId ?? null,
    commonChatTitle: config?.commonChatTitle ?? null,
    enabled: config?.enabled ?? true,
    updatedAt: config?.updatedAt ?? null,
  };
}

export async function saveTelegramChannelSettings(input: {
  commonChatId: string;
  commonChatTitle?: string;
  enabled?: boolean;
  actorUserId: string;
}): Promise<void> {
  const chatId = input.commonChatId.trim();
  if (!chatId) {
    throw new Error("Укажите chat id.");
  }

  await prisma.telegramChannelConfig.upsert({
    where: { key: DEFAULT_KEY },
    create: {
      key: DEFAULT_KEY,
      commonChatId: chatId,
      commonChatTitle: input.commonChatTitle?.trim() || null,
      enabled: input.enabled ?? true,
      updatedByUserId: input.actorUserId,
    },
    update: {
      commonChatId: chatId,
      commonChatTitle: input.commonChatTitle?.trim() || null,
      enabled: input.enabled ?? true,
      updatedByUserId: input.actorUserId,
    },
  });
}

export async function disconnectTelegramChannel(actorUserId: string): Promise<void> {
  const current = await prisma.telegramChannelConfig.findUnique({ where: { key: DEFAULT_KEY } });
  if (current?.commonChatId) {
    await sendTelegramMessage({
      chatId: current.commonChatId,
      text: "Общий канал уведомлений Padel & Squash KZ отключен.",
    });
  }

  await prisma.telegramChannelConfig.upsert({
    where: { key: DEFAULT_KEY },
    create: {
      key: DEFAULT_KEY,
      commonChatId: null,
      commonChatTitle: null,
      enabled: false,
      updatedByUserId: actorUserId,
    },
    update: {
      commonChatId: null,
      commonChatTitle: null,
      enabled: false,
      updatedByUserId: actorUserId,
    },
  });
}

export async function registerCommonChatFromSecret(input: {
  secret: string;
  chatId: string;
  chatTitle?: string | null;
}): Promise<boolean> {
  const payload = verifyRegisterChatSecret(input.secret.trim());
  if (!payload) {
    return false;
  }

  const actor = await prisma.user.findFirst({
    where: {
      id: payload.uid,
      role: "super_admin",
      active: true,
    },
    select: { id: true },
  });
  if (!actor) {
    return false;
  }

  await saveTelegramChannelSettings({
    commonChatId: input.chatId,
    commonChatTitle: input.chatTitle?.trim() || undefined,
    enabled: true,
    actorUserId: actor.id,
  });

  return true;
}

export async function sendCommonChatTestMessage(): Promise<boolean> {
  const recipient = await resolveCommonChatRecipient();
  if (!recipient) return false;
  const result = await sendTelegramMessage({
    chatId: recipient.chatId,
    text: "Тестовое сообщение Padel & Squash KZ: общий канал уведомлений подключен.",
  });
  return result.ok;
}
