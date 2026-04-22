-- V1 profile enrichment fields
-- Adds optional fields for the enriched profile model: height, vibe, quote,
-- identityTags, qualities, defaults, idealDay, skills.
-- All nullable/defaulting to empty arrays so existing rows are unaffected.

-- AlterTable
ALTER TABLE "Profile" ADD COLUMN     "defaults" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "height" INTEGER;
ALTER TABLE "Profile" ADD COLUMN     "idealDay" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "identityTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "qualities" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Profile" ADD COLUMN     "quote" TEXT;
ALTER TABLE "Profile" ADD COLUMN     "skills" JSONB;
ALTER TABLE "Profile" ADD COLUMN     "vibe" TEXT;
