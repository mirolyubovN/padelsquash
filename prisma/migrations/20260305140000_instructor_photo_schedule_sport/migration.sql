-- Add photo URL to Instructor
ALTER TABLE "Instructor" ADD COLUMN "photoUrl" TEXT;

-- Add optional sport scoping to ResourceSchedule
ALTER TABLE "ResourceSchedule" ADD COLUMN "sportId" TEXT;

ALTER TABLE "ResourceSchedule"
  ADD CONSTRAINT "ResourceSchedule_sportId_fkey"
  FOREIGN KEY ("sportId") REFERENCES "Sport"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

CREATE INDEX "ResourceSchedule_sportId_idx" ON "ResourceSchedule"("sportId");
