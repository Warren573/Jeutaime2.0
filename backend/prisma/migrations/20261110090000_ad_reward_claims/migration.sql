-- Publicités récompensées : registre des récompenses validées côté serveur.
-- Additif uniquement : aucune donnée existante n'est modifiée ni supprimée.

ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'AD_REWARD';

CREATE TABLE "AdRewardClaim" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "adUnit" TEXT,
    "dayKey" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdRewardClaim_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdRewardClaim_provider_transactionId_key" ON "AdRewardClaim"("provider", "transactionId");
CREATE INDEX "AdRewardClaim_userId_dayKey_idx" ON "AdRewardClaim"("userId", "dayKey");

ALTER TABLE "AdRewardClaim" ADD CONSTRAINT "AdRewardClaim_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
