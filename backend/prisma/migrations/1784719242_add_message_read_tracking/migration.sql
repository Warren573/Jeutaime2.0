-- Add message read tracking to MessageInABottle
ALTER TABLE "MessageInABottle" ADD COLUMN "lastReadBySenderId" TIMESTAMP(3);
ALTER TABLE "MessageInABottle" ADD COLUMN "lastReadByAcceptorId" TIMESTAMP(3);

-- Create index for efficient queries
CREATE INDEX "MessageInABottle_status_acceptedById_idx" ON "MessageInABottle"("status", "acceptedById");
