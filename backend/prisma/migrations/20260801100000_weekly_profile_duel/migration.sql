-- Profil de la semaine: passage à un système de duel (2 profils anonymes,
-- plusieurs votes/jour bornés par une limite quotidienne). Aucun vote réel
-- n'existait encore sur l'ancienne table (feature tout juste lancée) :
-- on peut la remplacer sans migration de données.

ALTER TABLE "WeeklyProfileVote" DROP CONSTRAINT IF EXISTS "WeeklyProfileVote_voterId_fkey";
ALTER TABLE "WeeklyProfileVote" DROP CONSTRAINT IF EXISTS "WeeklyProfileVote_candidateId_fkey";
DROP TABLE IF EXISTS "WeeklyProfileVote";

CREATE TABLE "WeeklyProfileVote" (
  "id" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "candidateAId" TEXT NOT NULL,
  "candidateBId" TEXT NOT NULL,
  "chosenId" TEXT NOT NULL,
  "weekKey" TEXT NOT NULL,
  "dayKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyProfileVote_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WeeklyProfileVote_voterId_dayKey_idx" ON "WeeklyProfileVote"("voterId", "dayKey");
CREATE INDEX "WeeklyProfileVote_voterId_idx" ON "WeeklyProfileVote"("voterId");
CREATE INDEX "WeeklyProfileVote_weekKey_chosenId_idx" ON "WeeklyProfileVote"("weekKey", "chosenId");

ALTER TABLE "WeeklyProfileVote" ADD CONSTRAINT "WeeklyProfileVote_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
