-- Add sessionId column to SalonMessage to link messages to specific sessions
ALTER TABLE "SalonMessage" ADD COLUMN "sessionId" TEXT;

-- Add foreign key constraint
ALTER TABLE "SalonMessage" ADD CONSTRAINT "SalonMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE;

-- Create index for efficient queries by sessionId
CREATE INDEX "SalonMessage_sessionId_createdAt_idx" ON "SalonMessage"("sessionId", "createdAt");
