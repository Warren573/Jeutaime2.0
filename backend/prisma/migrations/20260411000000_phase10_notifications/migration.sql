-- Phase 10 — Notifications in-app
-- Nouvelle table Notification alimentée par les event handlers.
-- meta JSONB : uniquement IDs de routage + fromUserId/otherUserId.
-- Pas de purge automatique dans cette phase.

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
  'LETTER_RECEIVED',
  'MATCH_CREATED',
  'OFFERING_RECEIVED',
  'MAGIE_RECEIVED',
  'MAGIE_BROKEN',
  'PREMIUM_SUBSCRIBED',
  'PREMIUM_CANCELLED'
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "message" TEXT NOT NULL,
    "meta" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_isRead_createdAt_idx" ON "Notification"("userId", "isRead", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
