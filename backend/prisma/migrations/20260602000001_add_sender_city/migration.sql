-- AlterTable
ALTER TABLE "MessageInABottle" ADD COLUMN "senderCity" TEXT NOT NULL DEFAULT 'Unknown';

-- Update existing bottles with default city
UPDATE "MessageInABottle" SET "senderCity" = 'Unknown' WHERE "senderCity" IS NULL;

-- Set NOT NULL constraint (already done above, but explicit)
ALTER TABLE "MessageInABottle" ALTER COLUMN "senderCity" SET NOT NULL;
