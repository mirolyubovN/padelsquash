import { createHash, randomBytes } from "node:crypto";

export function createTelegramLinkToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashTelegramLinkToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function getTelegramLinkTtlMinutes(): number {
  const value = Number(process.env.TELEGRAM_LINK_TTL_MINUTES ?? 30);
  return Number.isFinite(value) && value > 0 ? value : 30;
}
