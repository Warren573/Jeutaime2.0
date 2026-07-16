-- Phase finale du Refuge : consentement mutuel au dévoilement des profils
ALTER TYPE "RefugeSessionStatus" ADD VALUE IF NOT EXISTS 'AWAITING_REVEAL_CONSENT';
ALTER TYPE "RefugeSessionStatus" ADD VALUE IF NOT EXISTS 'REVEALED';

CREATE TYPE "RefugeRevealDecision" AS ENUM ('ACCEPT', 'REFUSE');

ALTER TABLE "RefugeSession"
  ADD COLUMN "adopteRevealDecision" "RefugeRevealDecision",
  ADD COLUMN "adoptantRevealDecision" "RefugeRevealDecision",
  ADD COLUMN "revealedAt" TIMESTAMP(3);
