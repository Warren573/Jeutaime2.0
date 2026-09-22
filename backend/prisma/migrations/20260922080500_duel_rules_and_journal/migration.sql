-- Duel rules: common correspondent, 48h expiry, polite decline metadata.
ALTER TABLE "PrivateDuel"
ADD COLUMN "commonUserId" TEXT,
ADD COLUMN "expiresAt" TIMESTAMP(3),
ADD COLUMN "declinedAt" TIMESTAMP(3);

UPDATE "PrivateDuel"
SET "expiresAt" = "createdAt" + INTERVAL '48 hours'
WHERE "expiresAt" IS NULL;

ALTER TABLE "PrivateDuel"
ALTER COLUMN "expiresAt" SET NOT NULL;

ALTER TABLE "PrivateDuel"
ADD CONSTRAINT "PrivateDuel_commonUserId_fkey"
FOREIGN KEY ("commonUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "PrivateDuel_commonUserId_status_createdAt_idx"
ON "PrivateDuel"("commonUserId", "status", "createdAt");

CREATE INDEX "PrivateDuel_status_expiresAt_idx"
ON "PrivateDuel"("status", "expiresAt");

-- Structured private journal events. Wording stays in application code so it can evolve later.
CREATE TABLE "JournalEvent" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "meta" JSONB,
  "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "JournalEvent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "JournalEvent"
ADD CONSTRAINT "JournalEvent_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "JournalEvent_userId_occurredAt_idx"
ON "JournalEvent"("userId", "occurredAt");

CREATE INDEX "JournalEvent_kind_occurredAt_idx"
ON "JournalEvent"("kind", "occurredAt");


ALTER TABLE "PushToken"
ADD COLUMN "lastDailyEditionKey" TEXT;
