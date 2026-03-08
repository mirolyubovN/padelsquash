ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "phoneVerifiedAt" TIMESTAMP(3),
  ADD COLUMN "telegramChatId" TEXT,
  ADD COLUMN "telegramUsername" TEXT;

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");
CREATE INDEX "EmailVerificationToken_expiresAt_idx" ON "EmailVerificationToken"("expiresAt");

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "PhoneVerificationSession" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "startToken" TEXT NOT NULL,
  "telegramChatId" TEXT,
  "telegramUserId" TEXT,
  "telegramUsername" TEXT,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PhoneVerificationSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PhoneVerificationSession_startToken_key" ON "PhoneVerificationSession"("startToken");
CREATE INDEX "PhoneVerificationSession_userId_expiresAt_idx" ON "PhoneVerificationSession"("userId", "expiresAt");
CREATE INDEX "PhoneVerificationSession_telegramUserId_expiresAt_idx" ON "PhoneVerificationSession"("telegramUserId", "expiresAt");

ALTER TABLE "PhoneVerificationSession"
  ADD CONSTRAINT "PhoneVerificationSession_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Keep existing accounts usable after rollout; new registrations remain unverified until confirmation.
UPDATE "User"
SET
  "emailVerifiedAt" = COALESCE("emailVerifiedAt", "createdAt"),
  "phoneVerifiedAt" = COALESCE("phoneVerifiedAt", "createdAt");
