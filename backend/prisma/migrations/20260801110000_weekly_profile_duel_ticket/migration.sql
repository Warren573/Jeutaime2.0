-- Profil de la semaine : le duel devient un ticket serveur vérifiable
-- (WeeklyProfileDuel) au lieu d'un simple vote reconstruit depuis le
-- payload client. Aucun vote réel n'existe encore sur l'ancienne table
-- (feature tout juste lancée) : on peut la remplacer sans migration de
-- données.

ALTER TABLE "WeeklyProfileVote" DROP CONSTRAINT IF EXISTS "WeeklyProfileVote_voterId_fkey";
DROP TABLE IF EXISTS "WeeklyProfileVote";

CREATE TABLE "WeeklyProfileDuel" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "candidateAId" TEXT NOT NULL,
  "candidateBId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "chosenId" TEXT,
  "weekKey" TEXT,
  "dayKey" TEXT,
  CONSTRAINT "WeeklyProfileDuel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeeklyProfileDuel_userId_usedAt_idx" ON "WeeklyProfileDuel"("userId", "usedAt");
CREATE INDEX "WeeklyProfileDuel_userId_dayKey_idx" ON "WeeklyProfileDuel"("userId", "dayKey");
CREATE INDEX "WeeklyProfileDuel_weekKey_chosenId_idx" ON "WeeklyProfileDuel"("weekKey", "chosenId");
CREATE INDEX "WeeklyProfileDuel_candidateAId_idx" ON "WeeklyProfileDuel"("candidateAId");
CREATE INDEX "WeeklyProfileDuel_candidateBId_idx" ON "WeeklyProfileDuel"("candidateBId");

ALTER TABLE "WeeklyProfileDuel" ADD CONSTRAINT "WeeklyProfileDuel_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
