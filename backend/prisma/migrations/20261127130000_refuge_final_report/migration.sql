-- Refuge : confirmation d'adoption dans l'historique du parrain / de la marraine et bilan final des sept jours.
-- Migration ADDITIVE : uniquement de nouvelles valeurs d'énumération (aucune table, colonne ni donnée modifiée).

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_ADOPTION_CONFIRMED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_FINAL_REPORT';
