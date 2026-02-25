/*
  Manual migration:
  - Instructor: single price per hour + multi-sport array
  - Backfill existing data from legacy single sport + tiered trainer prices
  - Remove redundant instructor component-price rows from the base pricing matrix
*/

-- Add new columns as nullable first so existing rows can be backfilled safely.
ALTER TABLE "Instructor"
ADD COLUMN "sports" "Sport"[],
ADD COLUMN "pricePerHour" DECIMAL(10,2);

-- Backfill new columns from legacy data.
UPDATE "Instructor"
SET
  "sports" = ARRAY["sport"],
  "pricePerHour" = COALESCE("priceEveningWeekend", "priceDay", "priceMorning", 0);

-- Enforce required columns after backfill.
ALTER TABLE "Instructor"
ALTER COLUMN "sports" SET NOT NULL,
ALTER COLUMN "pricePerHour" SET NOT NULL;

-- Remove legacy trainer fields (single sport + tiered pricing).
ALTER TABLE "Instructor"
DROP COLUMN "sport",
DROP COLUMN "priceMorning",
DROP COLUMN "priceDay",
DROP COLUMN "priceEveningWeekend";

-- Trainer pricing now lives on Instructor records only.
DELETE FROM "ComponentPrice"
WHERE "componentType" = 'instructor';
