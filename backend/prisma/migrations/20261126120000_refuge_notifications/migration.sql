-- Refuge : notifications quotidiennes et de fin de partie.
-- Migration ADDITIVE : uniquement de nouvelles valeurs d'énumération (aucune table, colonne ni donnée modifiée).
-- Les lignes existantes ne sont pas touchées ; les anciens clients ignorent simplement ces types.

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_CHOICE_READY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_RESULT_READY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_DAY_RESULT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_NEW_DAY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_COINS';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_REVEAL_REFUSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_EXPIRED';
