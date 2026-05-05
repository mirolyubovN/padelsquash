-- AlterEnum
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'event_charge';
ALTER TYPE "WalletTransactionType" ADD VALUE IF NOT EXISTS 'event_refund';

-- CreateEnum
CREATE TYPE "ClubEventStatus" AS ENUM ('draft', 'published', 'cancelled');

-- CreateEnum
CREATE TYPE "EventRegistrationStatus" AS ENUM ('confirmed', 'cancelled');

-- CreateTable
CREATE TABLE "ClubEventSeries" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'group_training',
    "level" TEXT,
    "sportId" TEXT,
    "locationId" TEXT,
    "instructorId" TEXT,
    "recurrence" TEXT NOT NULL DEFAULT 'weekly',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEventSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubEvent" (
    "id" TEXT NOT NULL,
    "seriesId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'group_training',
    "level" TEXT,
    "sportId" TEXT,
    "locationId" TEXT,
    "instructorId" TEXT,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "priceKzt" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "capacity" INTEGER NOT NULL,
    "status" "ClubEventStatus" NOT NULL DEFAULT 'published',
    "createdByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClubEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EventRegistration" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "status" "EventRegistrationStatus" NOT NULL DEFAULT 'confirmed',
    "pricePaidKzt" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KZT',
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EventRegistration_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "WalletTransaction" ADD COLUMN "eventRegistrationId" TEXT;

-- CreateIndex
CREATE INDEX "ClubEventSeries_sportId_idx" ON "ClubEventSeries"("sportId");

-- CreateIndex
CREATE INDEX "ClubEventSeries_locationId_idx" ON "ClubEventSeries"("locationId");

-- CreateIndex
CREATE INDEX "ClubEventSeries_instructorId_idx" ON "ClubEventSeries"("instructorId");

-- CreateIndex
CREATE INDEX "ClubEvent_status_startsAt_idx" ON "ClubEvent"("status", "startsAt");

-- CreateIndex
CREATE INDEX "ClubEvent_seriesId_idx" ON "ClubEvent"("seriesId");

-- CreateIndex
CREATE INDEX "ClubEvent_sportId_idx" ON "ClubEvent"("sportId");

-- CreateIndex
CREATE INDEX "ClubEvent_locationId_idx" ON "ClubEvent"("locationId");

-- CreateIndex
CREATE INDEX "ClubEvent_instructorId_idx" ON "ClubEvent"("instructorId");

-- CreateIndex
CREATE UNIQUE INDEX "EventRegistration_eventId_customerId_key" ON "EventRegistration"("eventId", "customerId");

-- CreateIndex
CREATE INDEX "EventRegistration_customerId_createdAt_idx" ON "EventRegistration"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "EventRegistration_eventId_status_idx" ON "EventRegistration"("eventId", "status");

-- CreateIndex
CREATE INDEX "WalletTransaction_eventRegistrationId_idx" ON "WalletTransaction"("eventRegistrationId");

-- AddForeignKey
ALTER TABLE "ClubEventSeries" ADD CONSTRAINT "ClubEventSeries_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventSeries" ADD CONSTRAINT "ClubEventSeries_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEventSeries" ADD CONSTRAINT "ClubEventSeries_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "ClubEventSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubEvent" ADD CONSTRAINT "ClubEvent_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ClubEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EventRegistration" ADD CONSTRAINT "EventRegistration_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_eventRegistrationId_fkey" FOREIGN KEY ("eventRegistrationId") REFERENCES "EventRegistration"("id") ON DELETE SET NULL ON UPDATE CASCADE;
