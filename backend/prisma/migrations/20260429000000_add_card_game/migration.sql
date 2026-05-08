-- CreateEnum
CREATE TYPE "CardGameStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'EXPIRED');

-- AlterEnum
ALTER TYPE "CoinTxnType" ADD VALUE 'GAME_ENTRY';

-- CreateTable
CREATE TABLE "CardGameSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "CardGameStatus" NOT NULL DEFAULT 'ACTIVE',
    "deck" JSONB NOT NULL,
    "revealed" INTEGER NOT NULL DEFAULT 0,
    "gainsCurrent" INTEGER NOT NULL DEFAULT 0,
    "entryAmount" INTEGER NOT NULL DEFAULT 20,
    "claimedAmount" INTEGER,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CardGameSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CardGameSession_userId_status_idx" ON "CardGameSession"("userId", "status");

-- CreateIndex
CREATE INDEX "CardGameSession_status_expiresAt_idx" ON "CardGameSession"("status", "expiresAt");

-- AddForeignKey
ALTER TABLE "CardGameSession" ADD CONSTRAINT "CardGameSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
