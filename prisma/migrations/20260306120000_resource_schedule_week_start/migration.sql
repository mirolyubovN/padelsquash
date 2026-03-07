ALTER TABLE "ResourceSchedule" ADD COLUMN "weekStart" DATE;
CREATE INDEX "ResourceSchedule_resourceType_resourceId_weekStart_idx"
  ON "ResourceSchedule"("resourceType", "resourceId", "weekStart");
