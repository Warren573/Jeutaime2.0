-- État de désactivation volontaire, séparé des bannissements/modérations.
-- Une ligne = compte actuellement désactivé.
CREATE TABLE "AccountDeactivation" (
  "userId" TEXT NOT NULL,
  "previousShowInDiscovery" BOOLEAN NOT NULL DEFAULT true,
  "deactivatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "AccountDeactivation_pkey" PRIMARY KEY ("userId")
);

ALTER TABLE "AccountDeactivation"
  ADD CONSTRAINT "AccountDeactivation_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "AccountDeactivation_deactivatedAt_idx"
  ON "AccountDeactivation"("deactivatedAt");
