-- Add matchId to MessageInABottle to link revealed bottles to private conversations
ALTER TABLE "MessageInABottle" ADD COLUMN "matchId" TEXT;

-- Add foreign key
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
