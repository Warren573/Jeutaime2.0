ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'ADMIN_MESSAGE';
ALTER TYPE "NotificationType" ADD VALUE IF NOT EXISTS 'PRIVATE_SALON_INVITE';

ALTER TABLE "SalonSession"
ADD COLUMN IF NOT EXISTS "privateName" TEXT;

CREATE TABLE IF NOT EXISTS "AdminMessage" (
  "id" TEXT NOT NULL,
  "adminId" TEXT,
  "userId" TEXT NOT NULL,
  "subject" TEXT,
  "message" TEXT NOT NULL,
  "isRead" BOOLEAN NOT NULL DEFAULT false,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdminMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminMessage_userId_isRead_createdAt_idx"
ON "AdminMessage"("userId","isRead","createdAt");

CREATE INDEX IF NOT EXISTS "AdminMessage_adminId_createdAt_idx"
ON "AdminMessage"("adminId","createdAt");

CREATE TABLE IF NOT EXISTS "PrivateSalonInvitation" (
  "id" TEXT NOT NULL,
  "sessionId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "invitedBy" TEXT,
  "accepted" BOOLEAN NOT NULL DEFAULT false,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PrivateSalonInvitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "PrivateSalonInvitation_sessionId_userId_key"
ON "PrivateSalonInvitation"("sessionId","userId");

CREATE INDEX IF NOT EXISTS "PrivateSalonInvitation_userId_accepted_createdAt_idx"
ON "PrivateSalonInvitation"("userId","accepted","createdAt");

CREATE INDEX IF NOT EXISTS "PrivateSalonInvitation_sessionId_createdAt_idx"
ON "PrivateSalonInvitation"("sessionId","createdAt");
