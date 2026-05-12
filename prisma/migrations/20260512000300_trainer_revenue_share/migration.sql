ALTER TABLE "Instructor"
ADD COLUMN "revenueSharePercent" INTEGER NOT NULL DEFAULT 90;

DROP TABLE IF EXISTS "RevenueShareConfig";
