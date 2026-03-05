-- Seed canonical sports for enum-to-table migration.
INSERT INTO "Sport" ("id", "slug", "name", "active", "sortOrder", "createdAt", "updatedAt")
VALUES
  ('sport_padel', 'padel', 'Падел', true, 0, NOW(), NOW()),
  ('sport_squash', 'squash', 'Сквош', true, 1, NOW(), NOW())
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "active" = EXCLUDED."active",
  "sortOrder" = EXCLUDED."sortOrder",
  "updatedAt" = NOW();

-- Backfill FK references from legacy enum columns.
UPDATE "Court" AS c
SET "sportId" = s."id"
FROM "Sport" AS s
WHERE c."sportId" IS NULL
  AND s."slug" = c."sport"::text;

UPDATE "Service" AS srv
SET "sportId" = s."id"
FROM "Sport" AS s
WHERE srv."sportId" IS NULL
  AND s."slug" = srv."sport"::text;

UPDATE "ComponentPrice" AS cp
SET "sportId" = s."id"
FROM "Sport" AS s
WHERE cp."sportId" IS NULL
  AND s."slug" = cp."sport"::text;

-- Migrate per-instructor sports and legacy flat trainer pricing into join rows.
INSERT INTO "InstructorSport" ("id", "instructorId", "sportId", "pricePerHour")
SELECT
  'insport_' || md5(i."id" || s."id"),
  i."id",
  s."id",
  i."pricePerHour"
FROM "Instructor" AS i
JOIN LATERAL unnest(i."sports") AS old_sport("slug_enum") ON TRUE
JOIN "Sport" AS s ON s."slug" = old_sport."slug_enum"::text
ON CONFLICT ("instructorId", "sportId")
DO UPDATE SET "pricePerHour" = EXCLUDED."pricePerHour";

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Court" WHERE "sportId" IS NULL) THEN
    RAISE EXCEPTION 'Court.sportId backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM "Service" WHERE "sportId" IS NULL) THEN
    RAISE EXCEPTION 'Service.sportId backfill failed';
  END IF;

  IF EXISTS (SELECT 1 FROM "ComponentPrice" WHERE "sportId" IS NULL) THEN
    RAISE EXCEPTION 'ComponentPrice.sportId backfill failed';
  END IF;
END $$;

-- Finalize required FK columns.
ALTER TABLE "Court" ALTER COLUMN "sportId" SET NOT NULL;
ALTER TABLE "Service" ALTER COLUMN "sportId" SET NOT NULL;
ALTER TABLE "ComponentPrice" ALTER COLUMN "sportId" SET NOT NULL;

-- Replace legacy uniqueness/indexing with sportId-based constraints.
DROP INDEX IF EXISTS "ComponentPrice_sport_componentType_period_currency_key";
DROP INDEX IF EXISTS "ComponentPrice_sport_period_idx";
CREATE UNIQUE INDEX "ComponentPrice_sportId_componentType_period_currency_key"
  ON "ComponentPrice"("sportId", "componentType", "period", "currency");

-- Remove legacy enum-backed columns.
ALTER TABLE "Court" DROP COLUMN "sport";
ALTER TABLE "Service" DROP COLUMN "sport";
ALTER TABLE "ComponentPrice" DROP COLUMN "sport";
ALTER TABLE "Instructor"
  DROP COLUMN "sports",
  DROP COLUMN "pricePerHour";

-- Legacy enum is no longer referenced.
DROP TYPE "SportType";
