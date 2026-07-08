-- CreateEnum RefugeBackground
CREATE TYPE "RefugeBackground" AS ENUM ('FORET', 'PLAGE', 'NEIGE', 'AUTOMNE', 'MONTAGNE', 'NUIT_ETOILEE');

-- AddColumn background to RefugeSession table
ALTER TABLE "RefugeSession" ADD COLUMN "background" "RefugeBackground" NOT NULL DEFAULT 'FORET';
