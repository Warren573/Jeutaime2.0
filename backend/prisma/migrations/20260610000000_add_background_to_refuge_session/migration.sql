-- AddColumn background to RefugeSession table
ALTER TABLE "RefugeSession" ADD COLUMN "background" "RefugeBackground" NOT NULL DEFAULT 'FORET';
