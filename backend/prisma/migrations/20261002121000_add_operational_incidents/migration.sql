CREATE TABLE "LoginEvent" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "userId" TEXT,
  "success" BOOLEAN NOT NULL,
  "reason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LoginEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "LoginEvent_createdAt_idx" ON "LoginEvent"("createdAt");
CREATE INDEX "LoginEvent_email_createdAt_idx" ON "LoginEvent"("email", "createdAt");
CREATE INDEX "LoginEvent_userId_createdAt_idx" ON "LoginEvent"("userId", "createdAt");

CREATE TABLE "SystemIncident" (
  "id" TEXT NOT NULL,
  "level" TEXT NOT NULL DEFAULT 'ERROR',
  "source" TEXT NOT NULL DEFAULT 'backend',
  "method" TEXT,
  "path" TEXT,
  "code" TEXT,
  "message" TEXT NOT NULL,
  "userId" TEXT,
  "statusCode" INTEGER,
  "resolved" BOOLEAN NOT NULL DEFAULT false,
  "resolution" TEXT,
  "resolvedAt" TIMESTAMP(3),
  "resolvedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SystemIncident_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SystemIncident_resolved_createdAt_idx" ON "SystemIncident"("resolved", "createdAt");
CREATE INDEX "SystemIncident_source_createdAt_idx" ON "SystemIncident"("source", "createdAt");
CREATE INDEX "SystemIncident_userId_createdAt_idx" ON "SystemIncident"("userId", "createdAt");
