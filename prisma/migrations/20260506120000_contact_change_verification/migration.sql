DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VerificationPurpose') THEN
    CREATE TYPE "VerificationPurpose" AS ENUM ('registration', 'email_change', 'phone_change');
  END IF;
END $$;

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "pendingEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "pendingPhone" TEXT;

ALTER TABLE "PhoneVerificationSession"
  ADD COLUMN IF NOT EXISTS "purpose" "VerificationPurpose" NOT NULL DEFAULT 'registration',
  ADD COLUMN IF NOT EXISTS "targetPhone" TEXT,
  ADD COLUMN IF NOT EXISTS "codeHash" TEXT,
  ADD COLUMN IF NOT EXISTS "codeSentAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "codeAttemptCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "PhoneVerificationSession" pvs
SET "targetPhone" = u."phone"
FROM "User" u
WHERE pvs."userId" = u."id"
  AND pvs."targetPhone" IS NULL;

ALTER TABLE "PhoneVerificationSession"
  ALTER COLUMN "targetPhone" SET NOT NULL;

CREATE TABLE IF NOT EXISTS "EmailVerificationCode" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "purpose" "VerificationPurpose" NOT NULL DEFAULT 'registration',
  "targetEmail" TEXT NOT NULL,
  "codeHash" TEXT NOT NULL,
  "attemptCount" INTEGER NOT NULL DEFAULT 0,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationCode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "EmailVerificationCode_userId_purpose_expiresAt_idx"
  ON "EmailVerificationCode"("userId", "purpose", "expiresAt");

CREATE INDEX IF NOT EXISTS "EmailVerificationCode_targetEmail_purpose_expiresAt_idx"
  ON "EmailVerificationCode"("targetEmail", "purpose", "expiresAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'EmailVerificationCode_userId_fkey'
  ) THEN
    ALTER TABLE "EmailVerificationCode"
      ADD CONSTRAINT "EmailVerificationCode_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
