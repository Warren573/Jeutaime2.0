-- Duels privés Pierre / Papier / Ciseaux entre deux utilisateurs.
-- Les choix restent NULL jusqu'à la soumission de chaque joueur et ne sont
-- révélés par l'API qu'une fois le duel résolu.

CREATE TYPE "PrivateDuelChoice" AS ENUM ('ROCK', 'PAPER', 'SCISSORS');
CREATE TYPE "PrivateDuelStatus" AS ENUM ('PENDING', 'RESOLVED', 'CANCELLED', 'EXPIRED');

CREATE TABLE "PrivateDuel" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "opponentId" TEXT NOT NULL,
    "challengerChoice" "PrivateDuelChoice",
    "opponentChoice" "PrivateDuelChoice",
    "status" "PrivateDuelStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "PrivateDuel_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PrivateDuel_challengerId_status_createdAt_idx"
ON "PrivateDuel"("challengerId", "status", "createdAt");

CREATE INDEX "PrivateDuel_opponentId_status_createdAt_idx"
ON "PrivateDuel"("opponentId", "status", "createdAt");

CREATE INDEX "PrivateDuel_status_createdAt_idx"
ON "PrivateDuel"("status", "createdAt");

ALTER TABLE "PrivateDuel"
ADD CONSTRAINT "PrivateDuel_challengerId_fkey"
FOREIGN KEY ("challengerId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivateDuel"
ADD CONSTRAINT "PrivateDuel_opponentId_fkey"
FOREIGN KEY ("opponentId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PrivateDuel"
ADD CONSTRAINT "PrivateDuel_winnerId_fkey"
FOREIGN KEY ("winnerId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
