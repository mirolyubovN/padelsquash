-- Create locations table for multi-center support.
CREATE TABLE "Location" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "address" TEXT NOT NULL,
  "phone" TEXT,
  "email" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'Asia/Almaty',
  "mapUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Location_slug_key" ON "Location"("slug");
CREATE INDEX "Location_active_sortOrder_idx" ON "Location"("active", "sortOrder");

-- Join table: instructors can work at multiple locations.
CREATE TABLE "InstructorLocation" (
  "id" TEXT NOT NULL,
  "instructorId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "InstructorLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InstructorLocation_instructorId_locationId_key"
  ON "InstructorLocation"("instructorId", "locationId");
CREATE INDEX "InstructorLocation_locationId_active_idx"
  ON "InstructorLocation"("locationId", "active");

-- Seed one default location from current single-center setup.
INSERT INTO "Location" (
  "id", "name", "slug", "address", "phone", "email", "timezone", "mapUrl", "active", "sortOrder", "createdAt", "updatedAt"
)
VALUES (
  'location_main',
  'Padel & Squash KZ',
  'main',
  'г. Алматы, ул. Абая, 120',
  '+7 (727) 355-77-00',
  'info@padelsquash.kz',
  'Asia/Almaty',
  'https://www.google.com/maps/search/?api=1&query=%D0%90%D0%BB%D0%BC%D0%B0%D1%82%D1%8B%2C+%D1%83%D0%BB.+%D0%90%D0%B1%D0%B0%D1%8F%2C+120',
  true,
  0,
  NOW(),
  NOW()
)
ON CONFLICT ("slug")
DO UPDATE SET
  "name" = EXCLUDED."name",
  "address" = EXCLUDED."address",
  "phone" = EXCLUDED."phone",
  "email" = EXCLUDED."email",
  "timezone" = EXCLUDED."timezone",
  "mapUrl" = EXCLUDED."mapUrl",
  "active" = EXCLUDED."active",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Add location columns (nullable first for backfill safety).
ALTER TABLE "Court" ADD COLUMN "locationId" TEXT;
ALTER TABLE "OpeningHour" ADD COLUMN "locationId" TEXT;
ALTER TABLE "ComponentPrice" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Booking" ADD COLUMN "locationId" TEXT;
ALTER TABLE "Service" ADD COLUMN "locationId" TEXT;
ALTER TABLE "ScheduleException" ADD COLUMN "locationId" TEXT;

-- Base backfill for required models.
UPDATE "Court"
SET "locationId" = (SELECT "id" FROM "Location" WHERE "slug" = 'main' LIMIT 1)
WHERE "locationId" IS NULL;

UPDATE "OpeningHour"
SET "locationId" = (SELECT "id" FROM "Location" WHERE "slug" = 'main' LIMIT 1)
WHERE "locationId" IS NULL;

UPDATE "ComponentPrice"
SET "locationId" = (SELECT "id" FROM "Location" WHERE "slug" = 'main' LIMIT 1)
WHERE "locationId" IS NULL;

-- Existing services stay global by default (`locationId` remains NULL).

-- Link all instructors to the default location.
INSERT INTO "InstructorLocation" ("id", "instructorId", "locationId", "active")
SELECT
  'inloc_' || md5(i."id" || l."id"),
  i."id",
  l."id",
  true
FROM "Instructor" i
JOIN "Location" l ON l."slug" = 'main'
ON CONFLICT ("instructorId", "locationId")
DO UPDATE SET "active" = true;

-- Backfill schedule exceptions by resource location.
UPDATE "ScheduleException" se
SET "locationId" = c."locationId"
FROM "Court" c
WHERE se."locationId" IS NULL
  AND se."resourceType" = 'court'
  AND se."resourceId" = c."id";

UPDATE "ScheduleException" se
SET "locationId" = il."locationId"
FROM "InstructorLocation" il
WHERE se."locationId" IS NULL
  AND se."resourceType" = 'instructor'
  AND se."resourceId" = il."instructorId";

UPDATE "ScheduleException"
SET "locationId" = (SELECT "id" FROM "Location" WHERE "slug" = 'main' LIMIT 1)
WHERE "locationId" IS NULL
  AND "resourceType" = 'venue';

-- Backfill bookings by linked court, then service location, then default.
UPDATE "Booking" b
SET "locationId" = c."locationId"
FROM "BookingResource" br
JOIN "Court" c ON c."id" = br."resourceId"
WHERE b."locationId" IS NULL
  AND br."bookingId" = b."id"
  AND br."resourceType" = 'court';

UPDATE "Booking" b
SET "locationId" = s."locationId"
FROM "Service" s
WHERE b."locationId" IS NULL
  AND b."serviceId" = s."id"
  AND s."locationId" IS NOT NULL;

UPDATE "Booking"
SET "locationId" = (SELECT "id" FROM "Location" WHERE "slug" = 'main' LIMIT 1)
WHERE "locationId" IS NULL;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Court" WHERE "locationId" IS NULL) THEN
    RAISE EXCEPTION 'Court.locationId backfill failed';
  END IF;
  IF EXISTS (SELECT 1 FROM "OpeningHour" WHERE "locationId" IS NULL) THEN
    RAISE EXCEPTION 'OpeningHour.locationId backfill failed';
  END IF;
  IF EXISTS (SELECT 1 FROM "ComponentPrice" WHERE "locationId" IS NULL) THEN
    RAISE EXCEPTION 'ComponentPrice.locationId backfill failed';
  END IF;
  IF EXISTS (SELECT 1 FROM "Booking" WHERE "locationId" IS NULL) THEN
    RAISE EXCEPTION 'Booking.locationId backfill failed';
  END IF;
END $$;

-- Finalize required location columns.
ALTER TABLE "Court" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "OpeningHour" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "ComponentPrice" ALTER COLUMN "locationId" SET NOT NULL;
ALTER TABLE "Booking" ALTER COLUMN "locationId" SET NOT NULL;

-- Foreign keys.
ALTER TABLE "InstructorLocation"
  ADD CONSTRAINT "InstructorLocation_instructorId_fkey"
  FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InstructorLocation"
  ADD CONSTRAINT "InstructorLocation_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Court"
  ADD CONSTRAINT "Court_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OpeningHour"
  ADD CONSTRAINT "OpeningHour_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ComponentPrice"
  ADD CONSTRAINT "ComponentPrice_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Booking"
  ADD CONSTRAINT "Booking_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Service"
  ADD CONSTRAINT "Service_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScheduleException"
  ADD CONSTRAINT "ScheduleException_locationId_fkey"
  FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Replace uniqueness/indexes with location-scoped variants.
DROP INDEX IF EXISTS "OpeningHour_dayOfWeek_key";
DROP INDEX IF EXISTS "OpeningHour_active_idx";
CREATE UNIQUE INDEX "OpeningHour_locationId_dayOfWeek_key"
  ON "OpeningHour"("locationId", "dayOfWeek");
CREATE INDEX "OpeningHour_locationId_active_idx"
  ON "OpeningHour"("locationId", "active");

DROP INDEX IF EXISTS "ComponentPrice_sportId_componentType_period_currency_key";
DROP INDEX IF EXISTS "ComponentPrice_sportId_period_idx";
CREATE UNIQUE INDEX "ComponentPrice_locationId_sportId_componentType_period_currency_key"
  ON "ComponentPrice"("locationId", "sportId", "componentType", "period", "currency");
CREATE INDEX "ComponentPrice_locationId_sportId_period_idx"
  ON "ComponentPrice"("locationId", "sportId", "period");

CREATE INDEX "Court_locationId_active_idx" ON "Court"("locationId", "active");
CREATE INDEX "Court_locationId_sportId_active_idx" ON "Court"("locationId", "sportId", "active");
CREATE INDEX "Service_locationId_active_idx" ON "Service"("locationId", "active");
CREATE INDEX "Service_locationId_sportId_active_idx" ON "Service"("locationId", "sportId", "active");
CREATE INDEX "ScheduleException_locationId_date_idx" ON "ScheduleException"("locationId", "date");
CREATE INDEX "Booking_locationId_startAt_idx" ON "Booking"("locationId", "startAt");
