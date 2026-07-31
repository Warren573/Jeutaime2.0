-- Résultats quotidiens persistés du Refuge + types de transactions Wallet
CREATE TYPE "RefugeDayStatus" AS ENUM ('FAILED', 'PARTIAL', 'PERFECT', 'INCOMPLETE_ADOPTE_MISSING', 'INCOMPLETE_ADOPTANT_MISSING', 'NOT_PLAYED');

ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_PARTIAL_REWARD';
ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_PERFECT_REWARD';
ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_PARTICIPATION_REWARD';
ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_INACTIVITY_PENALTY';

CREATE TABLE "RefugeDayResult" (
  "id" TEXT NOT NULL,
  "refugeSessionId" TEXT NOT NULL,
  "dayNumber" INTEGER NOT NULL,
  "status" "RefugeDayStatus" NOT NULL,
  "matchCount" INTEGER,
  "adopteCoinsDelta" INTEGER NOT NULL,
  "adoptantCoinsDelta" INTEGER NOT NULL,
  "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RefugeDayResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RefugeDayResult_refugeSessionId_dayNumber_key" ON "RefugeDayResult"("refugeSessionId", "dayNumber");
CREATE INDEX "RefugeDayResult_refugeSessionId_idx" ON "RefugeDayResult"("refugeSessionId");

ALTER TABLE "RefugeDayResult" ADD CONSTRAINT "RefugeDayResult_refugeSessionId_fkey"
  FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
