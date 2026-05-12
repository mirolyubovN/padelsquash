CREATE TABLE "RevenueShareConfig" (
    "key" TEXT NOT NULL DEFAULT 'default',
    "trainingTrainerPercent" INTEGER NOT NULL DEFAULT 90,
    "eventTrainerPercent" INTEGER NOT NULL DEFAULT 90,
    "updatedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RevenueShareConfig_pkey" PRIMARY KEY ("key")
);

INSERT INTO "RevenueShareConfig" ("key", "trainingTrainerPercent", "eventTrainerPercent", "updatedAt")
VALUES ('default', 90, 90, CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
