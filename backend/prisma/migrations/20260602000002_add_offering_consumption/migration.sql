-- Create ConsumptionMode enum type
CREATE TYPE "ConsumptionMode" AS ENUM ('PRIVATE', 'SHARED');

-- Add consumptionMode to OfferingCatalog
ALTER TABLE "OfferingCatalog" ADD COLUMN "consumptionMode" "ConsumptionMode" NOT NULL DEFAULT 'SHARED';

-- Add consumption tracking fields to OfferingSent
ALTER TABLE "OfferingSent" ADD COLUMN "consumptionCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "OfferingSent" ADD COLUMN "lastConsumedAt" TIMESTAMP(3);
ALTER TABLE "OfferingSent" ADD COLUMN "lastConsumedBy" VARCHAR(255);
