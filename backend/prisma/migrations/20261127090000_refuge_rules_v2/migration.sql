-- Refuge : règles v2 (récompenses d'assiduité, points de classement, règlement final).
-- Migration ADDITIVE : colonnes avec valeur par défaut et nouvelles valeurs d'énumération.
-- Aucune ligne existante n'est modifiée : toute session existante reste en version 1 (anciennes règles, aucune rétroactivité).

ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_DAILY_ASSIDUITY';
ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'REFUGE_FINAL_BONUS';

ALTER TABLE "RefugeSession"
  ADD COLUMN "rulesVersion" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "adoptantConsultMask" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "finalizedAt" TIMESTAMP(3),
  ADD COLUMN "adopteFinalBonus" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "adoptantFinalBonus" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "RefugeDayResult"
  ADD COLUMN "adopteAssiduous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adoptantAssiduous" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "adopteScoreDelta" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "adoptantScoreDelta" INTEGER NOT NULL DEFAULT 0;
