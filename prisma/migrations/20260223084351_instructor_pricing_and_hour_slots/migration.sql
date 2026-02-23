/*
  Warnings:

  - Added the required column `priceDay` to the `Instructor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceEveningWeekend` to the `Instructor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `priceMorning` to the `Instructor` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sport` to the `Instructor` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Instructor" ADD COLUMN     "priceDay" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "priceEveningWeekend" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "priceMorning" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "sport" "Sport" NOT NULL;
