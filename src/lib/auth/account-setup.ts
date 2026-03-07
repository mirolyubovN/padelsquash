import { createHmac, timingSafeEqual } from "crypto";

const ACCOUNT_SETUP_TOKEN_VERSION = 1;
const ACCOUNT_SETUP_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type AccountSetupPayload = {
  v: number;
  uid: string;
  exp: number;
};

function getAccountSetupSecret(): string {
  return process.env.NEXTAUTH_SECRET ?? "dev-account-setup-secret";
}

function encodePayload(payload: AccountSetupPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

function decodePayload(encoded: string): AccountSetupPayload | null {
  try {
    const parsed = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as AccountSetupPayload;
    if (
      parsed &&
      parsed.v === ACCOUNT_SETUP_TOKEN_VERSION &&
      typeof parsed.uid === "string" &&
      typeof parsed.exp === "number"
    ) {
      return parsed;
    }
  } catch {
    return null;
  }

  return null;
}

function signPayload(encodedPayload: string, passwordHash: string, email: string): Buffer {
  return createHmac("sha256", getAccountSetupSecret())
    .update(`${encodedPayload}.${passwordHash}.${email.trim().toLowerCase()}`)
    .digest();
}

export function userNeedsPasswordSetup(passwordHash: string): boolean {
  return !passwordHash.startsWith("$2");
}

export function createAccountSetupToken(args: {
  userId: string;
  email: string;
  passwordHash: string;
  expiresAt?: Date;
}): string {
  const encodedPayload = encodePayload({
    v: ACCOUNT_SETUP_TOKEN_VERSION,
    uid: args.userId,
    exp: (args.expiresAt ?? new Date(Date.now() + ACCOUNT_SETUP_TTL_MS)).getTime(),
  });
  const signature = signPayload(encodedPayload, args.passwordHash, args.email).toString("base64url");
  return `${encodedPayload}.${signature}`;
}

export function buildAccountSetupPath(token: string, nextPath = "/account"): string {
  const params = new URLSearchParams({ token });
  if (nextPath.startsWith("/")) {
    params.set("next", nextPath);
  }
  return `/activate-account?${params.toString()}`;
}

export function verifyAccountSetupToken(args: {
  token: string;
  email: string;
  passwordHash: string;
}): { userId: string; expiresAt: Date } | null {
  const [encodedPayload, encodedSignature] = args.token.split(".");
  if (!encodedPayload || !encodedSignature) {
    return null;
  }

  const payload = decodePayload(encodedPayload);
  if (!payload || payload.exp <= Date.now()) {
    return null;
  }

  const actualSignature = Buffer.from(encodedSignature, "base64url");
  const expectedSignature = signPayload(encodedPayload, args.passwordHash, args.email);
  if (actualSignature.length !== expectedSignature.length) {
    return null;
  }
  if (!timingSafeEqual(actualSignature, expectedSignature)) {
    return null;
  }

  return {
    userId: payload.uid,
    expiresAt: new Date(payload.exp),
  };
}
