-- Simplify pricing from 3 tiers (morning/day/evening_weekend) to 2 (off_peak/peak).
-- morning + day → off_peak (day rows deleted first to avoid unique constraint violation)
-- evening_weekend → peak

-- 1. Convert to text to allow data changes before re-casting
ALTER TABLE "ComponentPrice" ALTER COLUMN "period" TYPE TEXT USING "period"::TEXT;

-- 2. Drop the old enum
DROP TYPE "PricingPeriod";

-- 3. Create the new simplified enum
CREATE TYPE "PricingPeriod" AS ENUM ('off_peak', 'peak');

-- 4. Merge day rows into morning (off_peak) — delete day entries; morning entries carry the off_peak price
DELETE FROM "ComponentPrice" WHERE "period" = 'day';

-- 5. Rename surviving tiers
UPDATE "ComponentPrice" SET "period" = 'off_peak' WHERE "period" = 'morning';
UPDATE "ComponentPrice" SET "period" = 'peak'     WHERE "period" = 'evening_weekend';

-- 6. Cast column back to the new enum
ALTER TABLE "ComponentPrice" ALTER COLUMN "period" TYPE "PricingPeriod" USING "period"::"PricingPeriod";
