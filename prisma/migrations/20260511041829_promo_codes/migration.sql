-- CreateEnum
CREATE TYPE "PromoDiscountType" AS ENUM ('percent', 'fixed_kzt');

-- CreateEnum
CREATE TYPE "PromoCodeStatus" AS ENUM ('active', 'paused', 'archived');

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "discountKzt" DECIMAL(10,2),
ADD COLUMN     "promoCodeId" TEXT;

-- AlterTable
ALTER TABLE "WalletBonusConfig" ALTER COLUMN "key" SET DEFAULT 'default';

-- CreateTable
CREATE TABLE "PromoCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "discountType" "PromoDiscountType" NOT NULL,
    "discountValue" DECIMAL(10,2) NOT NULL,
    "maxDiscountKzt" DECIMAL(10,2),
    "minOrderKzt" DECIMAL(10,2),
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "totalRedemptionLimit" INTEGER,
    "perCustomerLimit" INTEGER DEFAULT 1,
    "appliesToServiceCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "appliesToSportIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "firstBookingOnly" BOOLEAN NOT NULL DEFAULT false,
    "status" "PromoCodeStatus" NOT NULL DEFAULT 'active',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromoCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromoCodeRedemption" (
    "id" TEXT NOT NULL,
    "promoCodeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "bookingId" TEXT,
    "amountKzt" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PromoCodeRedemption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PromoCode_code_key" ON "PromoCode"("code");

-- CreateIndex
CREATE INDEX "PromoCode_status_idx" ON "PromoCode"("status");

-- CreateIndex
CREATE INDEX "PromoCode_validFrom_validUntil_idx" ON "PromoCode"("validFrom", "validUntil");

-- CreateIndex
CREATE INDEX "PromoCodeRedemption_promoCodeId_createdAt_idx" ON "PromoCodeRedemption"("promoCodeId", "createdAt");

-- CreateIndex
CREATE INDEX "PromoCodeRedemption_customerId_createdAt_idx" ON "PromoCodeRedemption"("customerId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PromoCodeRedemption_promoCodeId_bookingId_key" ON "PromoCodeRedemption"("promoCodeId", "bookingId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromoCodeRedemption" ADD CONSTRAINT "PromoCodeRedemption_promoCodeId_fkey" FOREIGN KEY ("promoCodeId") REFERENCES "PromoCode"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
