-- Ensure PSY exists in SalonKind enum (idempotent)
-- This is a failsafe if the previous migration's DO block failed
DO $$
BEGIN
  ALTER TYPE "SalonKind" ADD VALUE 'PSY';
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;
