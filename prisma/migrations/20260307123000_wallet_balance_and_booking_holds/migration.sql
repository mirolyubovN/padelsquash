CREATE TYPE "WalletTransactionType" AS ENUM (
  'topup',
  'bonus',
  'admin_credit',
  'admin_debit',
  'booking_charge',
  'booking_refund'
);

CREATE TYPE "BookingHoldStatus" AS ENUM (
  'active',
  'converted',
  'expired',
  'cancelled'
);

ALTER TABLE "User"
ADD COLUMN "walletBalance" DECIMAL(12,2) NOT NULL DEFAULT 0;

CREATE TABLE "WalletBonusConfig" (
  "key" TEXT NOT NULL,
  "thresholdKzt" DECIMAL(10,2) NOT NULL,
  "bonusPercent" INTEGER NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "WalletBonusConfig_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "BookingHold" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "serviceId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "courtId" TEXT,
  "instructorId" TEXT,
  "convertedBookingId" TEXT,
  "startAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3) NOT NULL,
  "amountRequired" DECIMAL(10,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KZT',
  "pricingBreakdownJson" JSONB NOT NULL,
  "status" "BookingHoldStatus" NOT NULL DEFAULT 'active',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "BookingHold_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WalletTransaction" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "actorUserId" TEXT,
  "bookingId" TEXT,
  "holdId" TEXT,
  "type" "WalletTransactionType" NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "balanceAfter" DECIMAL(12,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'KZT',
  "note" TEXT,
  "metadataJson" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "BookingHold_convertedBookingId_key" ON "BookingHold"("convertedBookingId");
CREATE INDEX "BookingHold_customerId_status_expiresAt_idx" ON "BookingHold"("customerId", "status", "expiresAt");
CREATE INDEX "BookingHold_locationId_startAt_endAt_status_expiresAt_idx" ON "BookingHold"("locationId", "startAt", "endAt", "status", "expiresAt");
CREATE INDEX "BookingHold_courtId_startAt_endAt_idx" ON "BookingHold"("courtId", "startAt", "endAt");
CREATE INDEX "BookingHold_instructorId_startAt_endAt_idx" ON "BookingHold"("instructorId", "startAt", "endAt");

CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");
CREATE INDEX "WalletTransaction_actorUserId_createdAt_idx" ON "WalletTransaction"("actorUserId", "createdAt");
CREATE INDEX "WalletTransaction_bookingId_idx" ON "WalletTransaction"("bookingId");
CREATE INDEX "WalletTransaction_holdId_idx" ON "WalletTransaction"("holdId");
CREATE INDEX "WalletTransaction_type_createdAt_idx" ON "WalletTransaction"("type", "createdAt");

ALTER TABLE "BookingHold"
ADD CONSTRAINT "BookingHold_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingHold"
ADD CONSTRAINT "BookingHold_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingHold"
ADD CONSTRAINT "BookingHold_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BookingHold"
ADD CONSTRAINT "BookingHold_convertedBookingId_fkey" FOREIGN KEY ("convertedBookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "WalletTransaction"
ADD CONSTRAINT "WalletTransaction_holdId_fkey" FOREIGN KEY ("holdId") REFERENCES "BookingHold"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "WalletBonusConfig" ("key", "thresholdKzt", "bonusPercent", "active", "updatedAt")
VALUES ('default', 50000, 10, true, CURRENT_TIMESTAMP);
