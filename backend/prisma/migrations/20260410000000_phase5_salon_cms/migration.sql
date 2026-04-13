-- Phase 5 — CMS visuel + gestion dynamique des Salons
-- Ajout des champs d'habillage visuel et de gestion admin au modèle Salon.
-- Valeurs par défaut choisies pour garantir la compatibilité avec les salons existants :
--   - backgroundType default "gradient" (tous les salons seedés utilisent un gradient)
--   - isActive default true (les salons existants restent visibles)
--   - order default 0 (l'admin réordonnera ensuite)
--   - updatedAt default CURRENT_TIMESTAMP pour les rows existants

-- AlterTable
ALTER TABLE "Salon" ADD COLUMN     "backgroundConfig" JSONB,
ADD COLUMN     "backgroundImage" TEXT,
ADD COLUMN     "backgroundType" TEXT NOT NULL DEFAULT 'gradient',
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "primaryColor" TEXT,
ADD COLUMN     "secondaryColor" TEXT,
ADD COLUMN     "textColor" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Salon_isActive_order_idx" ON "Salon"("isActive", "order");
