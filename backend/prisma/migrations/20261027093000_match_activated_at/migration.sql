ALTER TABLE "Match" ADD COLUMN "activatedAt" TIMESTAMP(3);
-- Existing active matches have no reliable historical activation timestamp.
-- Keep NULL to avoid retroactive penalties.
