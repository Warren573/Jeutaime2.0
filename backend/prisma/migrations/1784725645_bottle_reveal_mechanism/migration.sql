-- AlterEnum: Add REVEALED and BROKEN to BottleStatus
ALTER TYPE "BottleStatus" ADD VALUE 'REVEALED';
ALTER TYPE "BottleStatus" ADD VALUE 'BROKEN';

-- CreateEnum: BottleRevealStatus
CREATE TYPE "BottleRevealStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED');

-- AlterTable: Add revealedAt to MessageInABottle
ALTER TABLE "MessageInABottle" ADD COLUMN "revealedAt" TIMESTAMP(3);

-- CreateTable: BottleRevealRequest
CREATE TABLE "BottleRevealRequest" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "respondentId" TEXT NOT NULL,
    "status" "BottleRevealStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),

    CONSTRAINT "BottleRevealRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex for BottleRevealRequest
CREATE UNIQUE INDEX "BottleRevealRequest_bottleId_requestedById_key" ON "BottleRevealRequest"("bottleId", "requestedById");
CREATE INDEX "BottleRevealRequest_bottleId_status_idx" ON "BottleRevealRequest"("bottleId", "status");
CREATE INDEX "BottleRevealRequest_respondentId_status_idx" ON "BottleRevealRequest"("respondentId", "status");

-- AddForeignKey
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BottleRevealRequest" ADD CONSTRAINT "BottleRevealRequest_respondentId_fkey" FOREIGN KEY ("respondentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
