-- AddColumn idempotencyKey to AnonymousMessage
ALTER TABLE "AnonymousMessage" ADD COLUMN "idempotencyKey" TEXT;

-- Create unique constraint on (senderId, idempotencyKey)
-- This prevents the same client from sending the same message twice
CREATE UNIQUE INDEX "AnonymousMessage_senderId_idempotencyKey_key" ON "AnonymousMessage"("senderId", "idempotencyKey") WHERE "idempotencyKey" IS NOT NULL;
