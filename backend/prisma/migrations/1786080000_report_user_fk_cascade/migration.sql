-- Allow staging test-account resets to remove users that have created or received reports.
-- Report rows have no value once either participant account is deleted.

ALTER TABLE "Report"
  DROP CONSTRAINT IF EXISTS "Report_reporterId_fkey";

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_reporterId_fkey"
  FOREIGN KEY ("reporterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Report"
  DROP CONSTRAINT IF EXISTS "Report_targetId_fkey";

ALTER TABLE "Report"
  ADD CONSTRAINT "Report_targetId_fkey"
  FOREIGN KEY ("targetId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
