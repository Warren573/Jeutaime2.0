ALTER TABLE "Photo"
ADD COLUMN "moderationStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "moderationReason" TEXT,
ADD COLUMN "moderatedAt" TIMESTAMP(3),
ADD COLUMN "moderatedBy" TEXT;

ALTER TABLE "Report"
ADD COLUMN "contentType" TEXT,
ADD COLUMN "contentId" TEXT,
ADD COLUMN "contentSnapshot" JSONB;

ALTER TABLE "SalonMessage"
ADD COLUMN "isHidden" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "hiddenReason" TEXT,
ADD COLUMN "hiddenAt" TIMESTAMP(3),
ADD COLUMN "hiddenBy" TEXT;

CREATE INDEX "Photo_moderationStatus_createdAt_idx"
ON "Photo"("moderationStatus", "createdAt");

CREATE INDEX "Report_contentType_contentId_idx"
ON "Report"("contentType", "contentId");

CREATE INDEX "SalonMessage_isHidden_createdAt_idx"
ON "SalonMessage"("isHidden", "createdAt");
