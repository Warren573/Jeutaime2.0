CREATE TABLE "CommunityJournalPost" (
  "id" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "createdBy" TEXT,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CommunityJournalPost_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CommunityJournalPost_publishedAt_idx"
ON "CommunityJournalPost"("publishedAt");

CREATE INDEX "CommunityJournalPost_createdBy_publishedAt_idx"
ON "CommunityJournalPost"("createdBy","publishedAt");
