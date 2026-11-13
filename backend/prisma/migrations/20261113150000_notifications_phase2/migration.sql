-- Notifications, phase 2 : nouveaux types d'événements et clé d'idempotence.
-- Migration ADDITIVE : valeurs d'énumération + une colonne facultative + un index unique
-- (les lignes existantes ont dedupeKey NULL et ne sont jamais en conflit).

ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DUEL_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DUEL_RESULT';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DUEL_DECLINED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'DUEL_EXPIRED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOTTLE_REPLY';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOTTLE_REVEAL_REQUEST';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOTTLE_REVEAL_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'BOTTLE_REVEAL_REFUSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'QUESTIONS_TURN';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_ADOPTED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_REVEAL_PHASE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REFUGE_REVEALED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'REPORT_PROCESSED';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ACCOUNT_RESTORED';

ALTER TABLE "Notification" ADD COLUMN IF NOT EXISTS "dedupeKey" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");
