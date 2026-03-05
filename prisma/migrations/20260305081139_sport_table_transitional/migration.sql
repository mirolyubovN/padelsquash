/*
  Warnings:

  - The `sports` column on the `Instructor` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Changed the type of `sport` on the `ComponentPrice` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sport` on the `Court` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `sport` on the `Service` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "SportType" AS ENUM ('padel', 'squash');

-- AlterTable
ALTER TABLE "ComponentPrice" ADD COLUMN     "sportId" TEXT,
DROP COLUMN "sport",
ADD COLUMN     "sport" "SportType" NOT NULL;

-- AlterTable
ALTER TABLE "Court" ADD COLUMN     "sportId" TEXT,
DROP COLUMN "sport",
ADD COLUMN     "sport" "SportType" NOT NULL;

-- AlterTable
ALTER TABLE "Instructor" DROP COLUMN "sports",
ADD COLUMN     "sports" "SportType"[];

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "sportId" TEXT,
DROP COLUMN "sport",
ADD COLUMN     "sport" "SportType" NOT NULL;

-- DropEnum
DROP TYPE "Sport";

-- CreateTable
CREATE TABLE "Sport" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorSport" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "sportId" TEXT NOT NULL,
    "pricePerHour" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "InstructorSport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sport_slug_key" ON "Sport"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "InstructorSport_instructorId_sportId_key" ON "InstructorSport"("instructorId", "sportId");

-- CreateIndex
CREATE INDEX "ComponentPrice_sport_period_idx" ON "ComponentPrice"("sport", "period");

-- CreateIndex
CREATE INDEX "ComponentPrice_sportId_period_idx" ON "ComponentPrice"("sportId", "period");

-- CreateIndex
CREATE UNIQUE INDEX "ComponentPrice_sport_componentType_period_currency_key" ON "ComponentPrice"("sport", "componentType", "period", "currency");

-- AddForeignKey
ALTER TABLE "Court" ADD CONSTRAINT "Court_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComponentPrice" ADD CONSTRAINT "ComponentPrice_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorSport" ADD CONSTRAINT "InstructorSport_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorSport" ADD CONSTRAINT "InstructorSport_sportId_fkey" FOREIGN KEY ("sportId") REFERENCES "Sport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
