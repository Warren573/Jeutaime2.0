ALTER TABLE "SupportTicket"
  ADD COLUMN "adminReply" TEXT,
  ADD COLUMN "repliedAt" TIMESTAMP(3),
  ADD COLUMN "repliedBy" TEXT;
