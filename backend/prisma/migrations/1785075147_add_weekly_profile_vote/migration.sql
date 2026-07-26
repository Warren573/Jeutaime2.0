-- Profil de la semaine : votes réels (remplace les données fictives du frontend)
ALTER TYPE "CoinTxnType" ADD VALUE IF NOT EXISTS 'WEEKLY_PROFILE_VOTE';

CREATE TABLE "WeeklyProfileVote" (
  "id" TEXT NOT NULL,
  "voterId" TEXT NOT NULL,
  "candidateId" TEXT NOT NULL,
  "weekKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WeeklyProfileVote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "WeeklyProfileVote_voterId_weekKey_key" ON "WeeklyProfileVote"("voterId", "weekKey");
CREATE INDEX "WeeklyProfileVote_weekKey_idx" ON "WeeklyProfileVote"("weekKey");
CREATE INDEX "WeeklyProfileVote_candidateId_idx" ON "WeeklyProfileVote"("candidateId");

ALTER TABLE "WeeklyProfileVote" ADD CONSTRAINT "WeeklyProfileVote_voterId_fkey"
  FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WeeklyProfileVote" ADD CONSTRAINT "WeeklyProfileVote_candidateId_fkey"
  FOREIGN KEY ("candidateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
