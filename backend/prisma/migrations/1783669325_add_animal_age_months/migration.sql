-- AlterTable
ALTER TABLE "RefugeSession" ADD COLUMN "animalAgeMonths" INTEGER NOT NULL DEFAULT 12;

-- Remove default after setting values
ALTER TABLE "RefugeSession" ALTER COLUMN "animalAgeMonths" DROP DEFAULT;
