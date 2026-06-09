-- Add drink and eat state tracking to SalonSessionParticipant
ALTER TABLE "SalonSessionParticipant" ADD COLUMN "drinkLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalonSessionParticipant" ADD COLUMN "drinkLastActionAt" TIMESTAMP(3);
ALTER TABLE "SalonSessionParticipant" ADD COLUMN "eatLevel" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalonSessionParticipant" ADD COLUMN "eatLastActionAt" TIMESTAMP(3);
