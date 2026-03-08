import { createHash, randomBytes } from "crypto";
import { APP_TIMEZONE } from "@/src/lib/time/venue-timezone";
import { sendEmailMessage } from "@/src/lib/notifications/email";
import { getTelegramBotUsername } from "@/src/lib/notifications/telegram";
import { prisma } from "@/src/lib/prisma";

const EMAIL_VERIFICATION_TTL_HOURS = parseTtlHours(process.env.EMAIL_VERIFICATION_TTL_HOURS, 24);
const PHONE_VERIFICATION_TTL_HOURS = parseTtlHours(process.env.PHONE_VERIFICATION_TTL_HOURS, 24);
const TELEGRAM_START_PREFIX = "verify_";

export interface VerificationStatusSource {
  role: string;
  emailVerifiedAt: Date | null;
  phoneVerifiedAt: Date | null;
}

export type EmailVerificationConsumeResult =
  | {
      status: "invalid";
    }
  | {
      status: "expired";
      email: string;
      fullyVerified: boolean;
    }
  | {
      status: "already_used";
      email: string;
      fullyVerified: boolean;
    }
  | {
      status: "verified";
      email: string;
      fullyVerified: boolean;
    };

export type TelegramStartVerificationResult =
  | {
      status: "session_not_found";
    }
  | {
      status: "session_expired";
    }
  | {
      status: "already_verified";
      email: string;
    }
  | {
      status: "awaiting_contact";
      email: string;
      phone: string;
    };

export type TelegramPhoneConfirmationResult =
  | {
      status: "session_not_found";
    }
  | {
      status: "already_verified";
      email: string;
      fullyVerified: boolean;
    }
  | {
      status: "phone_mismatch";
      expectedPhone: string;
    }
  | {
      status: "verified";
      email: string;
      fullyVerified: boolean;
    };

function parseTtlHours(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(raw ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXTAUTH_URL?.trim();
  if (!fromEnv) return "http://localhost:3000";
  return fromEnv.endsWith("/") ? fromEnv.slice(0, -1) : fromEnv;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function formatExpiry(expiresAt: Date): string {
  return expiresAt.toLocaleString("ru-KZ", {
    timeZone: APP_TIMEZONE,
  });
}

function buildEmailVerificationUrl(args: {
  token: string;
  email: string;
  nextPath: string;
}): string {
  const params = new URLSearchParams({
    token: args.token,
    email: args.email,
  });
  if (args.nextPath.startsWith("/")) {
    params.set("next", args.nextPath);
  }
  return `${getAppBaseUrl()}/verify/email?${params.toString()}`;
}

function isFutureDate(value: Date): boolean {
  return value.getTime() > Date.now();
}

function resolveTelegramStartToken(rawToken: string): string | null {
  const token = rawToken.trim();
  if (!token) return null;
  if (token.startsWith(TELEGRAM_START_PREFIX)) {
    return token.slice(TELEGRAM_START_PREFIX.length) || null;
  }
  return token;
}

export function normalizePhoneForComparison(phone: string): string {
  const digits = phone.replace(/\D+/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `7${digits}`;
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 11) return digits;
  if (digits.length > 11) return digits.slice(-11);
  return digits;
}

export function isCustomerFullyVerified(source: VerificationStatusSource): boolean {
  if (source.role !== "customer") {
    return true;
  }
  return Boolean(source.emailVerifiedAt && source.phoneVerifiedAt);
}

export async function issueEmailVerification(args: {
  userId: string;
  email: string;
  name: string;
  nextPath: string;
}): Promise<{
  sent: boolean;
  verificationUrl: string;
  expiresAt: Date;
}> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + EMAIL_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(rawToken);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.updateMany({
      where: {
        userId: args.userId,
        consumedAt: null,
      },
      data: {
        expiresAt: now,
      },
    });

    await tx.emailVerificationToken.create({
      data: {
        userId: args.userId,
        tokenHash,
        expiresAt,
      },
    });
  });

  const verificationUrl = buildEmailVerificationUrl({
    token: rawToken,
    email: normalizeEmail(args.email),
    nextPath: args.nextPath,
  });

  const sent = await sendEmailMessage({
    to: normalizeEmail(args.email),
    subject: "Подтвердите email для Padel & Squash KZ",
    text: [
      `Здравствуйте, ${args.name}.`,
      "",
      "Подтвердите email, чтобы завершить регистрацию в Padel & Squash KZ:",
      verificationUrl,
      "",
      `Ссылка действует до ${formatExpiry(expiresAt)}.`,
    ].join("\n"),
  });

  return {
    sent,
    verificationUrl,
    expiresAt,
  };
}

export async function consumeEmailVerificationToken(token: string): Promise<EmailVerificationConsumeResult> {
  const tokenHash = hashToken(token.trim());
  const now = new Date();

  const tokenRow = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      },
    },
  });

  if (!tokenRow) {
    return { status: "invalid" };
  }

  const existingVerificationStatus = isCustomerFullyVerified(tokenRow.user);
  if (tokenRow.consumedAt) {
    return {
      status: "already_used",
      email: tokenRow.user.email,
      fullyVerified: existingVerificationStatus,
    };
  }

  if (!isFutureDate(tokenRow.expiresAt)) {
    return {
      status: "expired",
      email: tokenRow.user.email,
      fullyVerified: existingVerificationStatus,
    };
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.emailVerificationToken.update({
      where: { id: tokenRow.id },
      data: {
        consumedAt: now,
      },
    });

    return tx.user.update({
      where: { id: tokenRow.userId },
      data: {
        emailVerifiedAt: now,
      },
      select: {
        email: true,
        role: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
  });

  return {
    status: "verified",
    email: updatedUser.email,
    fullyVerified: isCustomerFullyVerified(updatedUser),
  };
}

export async function issuePhoneVerificationSession(args: {
  userId: string;
}): Promise<{
  startToken: string;
  expiresAt: Date;
  telegramUrl: string | null;
}> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + PHONE_VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
  const startToken = randomBytes(24).toString("base64url");

  await prisma.$transaction(async (tx) => {
    await tx.phoneVerificationSession.updateMany({
      where: {
        userId: args.userId,
        consumedAt: null,
      },
      data: {
        expiresAt: now,
      },
    });

    await tx.phoneVerificationSession.create({
      data: {
        userId: args.userId,
        startToken,
        expiresAt,
      },
    });
  });

  return {
    startToken,
    expiresAt,
    telegramUrl: buildTelegramPhoneVerificationLink(startToken),
  };
}

export async function getActivePhoneVerificationSession(userId: string): Promise<{
  startToken: string;
  expiresAt: Date;
  telegramUrl: string | null;
} | null> {
  const now = new Date();
  const session = await prisma.phoneVerificationSession.findFirst({
    where: {
      userId,
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    select: {
      startToken: true,
      expiresAt: true,
    },
  });

  if (!session) {
    return null;
  }

  return {
    startToken: session.startToken,
    expiresAt: session.expiresAt,
    telegramUrl: buildTelegramPhoneVerificationLink(session.startToken),
  };
}

export function buildTelegramPhoneVerificationLink(startToken: string): string | null {
  const botUsername = getTelegramBotUsername();
  if (!botUsername) return null;
  return `https://t.me/${botUsername}?start=${TELEGRAM_START_PREFIX}${startToken}`;
}

export async function attachTelegramToVerificationSession(args: {
  rawStartToken: string;
  telegramChatId: string;
  telegramUserId: string;
  telegramUsername?: string | null;
}): Promise<TelegramStartVerificationResult> {
  const startToken = resolveTelegramStartToken(args.rawStartToken);
  if (!startToken) {
    return { status: "session_not_found" };
  }

  const now = new Date();
  const session = await prisma.phoneVerificationSession.findUnique({
    where: { startToken },
    include: {
      user: {
        select: {
          email: true,
          phone: true,
          role: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      },
    },
  });

  if (!session) {
    return { status: "session_not_found" };
  }

  if (session.consumedAt || !isFutureDate(session.expiresAt)) {
    return { status: "session_expired" };
  }

  if (isCustomerFullyVerified(session.user)) {
    await prisma.phoneVerificationSession.update({
      where: { id: session.id },
      data: {
        consumedAt: now,
        telegramChatId: args.telegramChatId,
        telegramUserId: args.telegramUserId,
        telegramUsername: args.telegramUsername ?? null,
      },
    });
    return {
      status: "already_verified",
      email: session.user.email,
    };
  }

  await prisma.phoneVerificationSession.update({
    where: { id: session.id },
    data: {
      telegramChatId: args.telegramChatId,
      telegramUserId: args.telegramUserId,
      telegramUsername: args.telegramUsername ?? null,
    },
  });

  return {
    status: "awaiting_contact",
    email: session.user.email,
    phone: session.user.phone,
  };
}

export async function confirmPhoneByTelegramContact(args: {
  telegramChatId: string;
  telegramUserId: string;
  telegramUsername?: string | null;
  contactPhone: string;
}): Promise<TelegramPhoneConfirmationResult> {
  const now = new Date();
  const session = await prisma.phoneVerificationSession.findFirst({
    where: {
      consumedAt: null,
      expiresAt: {
        gt: now,
      },
      telegramChatId: args.telegramChatId,
      telegramUserId: args.telegramUserId,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          phone: true,
          emailVerifiedAt: true,
          phoneVerifiedAt: true,
        },
      },
    },
  });

  if (!session) {
    return { status: "session_not_found" };
  }

  const userStatusBefore = isCustomerFullyVerified(session.user);
  if (session.user.phoneVerifiedAt || userStatusBefore) {
    await prisma.phoneVerificationSession.update({
      where: { id: session.id },
      data: { consumedAt: now },
    });
    return {
      status: "already_verified",
      email: session.user.email,
      fullyVerified: userStatusBefore,
    };
  }

  const expectedPhone = normalizePhoneForComparison(session.user.phone);
  const providedPhone = normalizePhoneForComparison(args.contactPhone);
  if (!expectedPhone || expectedPhone !== providedPhone) {
    return {
      status: "phone_mismatch",
      expectedPhone: session.user.phone,
    };
  }

  const updatedUser = await prisma.$transaction(async (tx) => {
    await tx.phoneVerificationSession.update({
      where: { id: session.id },
      data: {
        consumedAt: now,
      },
    });

    return tx.user.update({
      where: { id: session.userId },
      data: {
        phoneVerifiedAt: now,
        telegramChatId: args.telegramChatId,
        telegramUsername: args.telegramUsername ?? null,
      },
      select: {
        email: true,
        role: true,
        emailVerifiedAt: true,
        phoneVerifiedAt: true,
      },
    });
  });

  return {
    status: "verified",
    email: updatedUser.email,
    fullyVerified: isCustomerFullyVerified(updatedUser),
  };
}
