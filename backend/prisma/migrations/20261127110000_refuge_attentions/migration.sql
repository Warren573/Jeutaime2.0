-- Refuge : petites attentions du parrain / de la marraine (une par jour, avant la validation du compagnon).
-- Migration ADDITIVE : nouvelle énumération, colonnes nullables, nouvelle valeur de NotificationType.
-- Aucune ligne existante n'est modifiée.

CREATE TYPE "RefugeAttentionKind" AS ENUM ('GRATTER_TETE', 'CARESSE', 'BONJOUR');

ALTER TABLE "RefugeSession"
  ADD COLUMN "attentionDay" INTEGER,
  ADD COLUMN "attentionKind" "RefugeAttentionKind",
  ADD COLUMN "attentionAt" TIMESTAMP(3);

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_ATTENTION';
