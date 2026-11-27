-- Refuge : archivage PAR PARTICIPANT à la sortie de l'écran de fin (dévoilement automatique à l'issue des 168 h).
-- Colonnes nullables ADDITIVES. Aucune récompense, aucun match, aucune adoption n'est modifié ou réinitialisé.

ALTER TABLE "RefugeSession" ADD COLUMN "adopteArchivedAt" TIMESTAMP(3);
ALTER TABLE "RefugeSession" ADD COLUMN "adoptantArchivedAt" TIMESTAMP(3);

-- Aventures DÉJÀ terminées sans dévoilement (refus, abandon) : considérées comme archivées pour les deux participants, afin
-- qu'elles ne réapparaissent pas. Les sessions en cours, en attente de décision (ancien flux) ou déjà dévoilées ne sont PAS
-- touchées : elles restent consultables jusqu'à la sortie de l'écran de fin par chaque participant.
UPDATE "RefugeSession"
SET "adopteArchivedAt" = NOW(), "adoptantArchivedAt" = NOW()
WHERE "status" IN ('COMPLETED', 'ABANDONED');
