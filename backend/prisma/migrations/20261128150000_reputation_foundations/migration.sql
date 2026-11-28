-- CreateEnum
CREATE TYPE "MatchBreakKind" AS ENUM ('USER_BREAK', 'DECLINED', 'QUESTIONS_FAILED', 'SAFETY_BLOCK');

-- CreateEnum
CREATE TYPE "ReputationAxis" AS ENUM ('RELIABILITY', 'PARTICIPATION', 'POPULARITY');

-- CreateEnum
CREATE TYPE "ReputationDisputeStatus" AS ENUM ('OPEN', 'ACCEPTED', 'REJECTED', 'WITHDRAWN');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "breakKind" "MatchBreakKind",
ADD COLUMN     "brokenAt" TIMESTAMP(3),
ADD COLUMN     "brokenById" TEXT,
ADD COLUMN     "questionsValidatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "MessageInABottle" ADD COLUMN     "brokenAt" TIMESTAMP(3),
ADD COLUMN     "brokenById" TEXT;

-- CreateTable
CREATE TABLE "ReputationState" (
    "userId" TEXT NOT NULL,
    "reliability" INTEGER NOT NULL DEFAULT 0,
    "participation" INTEGER NOT NULL DEFAULT 0,
    "popularity" INTEGER NOT NULL DEFAULT 0,
    "epoch" INTEGER NOT NULL DEFAULT 0,
    "ruleVersion" INTEGER NOT NULL DEFAULT 1,
    "evaluatedCommitments" INTEGER NOT NULL DEFAULT 0,
    "lastActivityAt" TIMESTAMP(3),
    "lastResetAt" TIMESTAMP(3),
    "resetCount" INTEGER NOT NULL DEFAULT 0,
    "reliabilityReassessment" BOOLEAN NOT NULL DEFAULT false,
    "welcomeBackPendingAt" TIMESTAMP(3),
    "lastWelcomeDay" TEXT,
    "lastSummaryAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReputationState_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "ReputationEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "axis" "ReputationAxis" NOT NULL,
    "kind" TEXT NOT NULL,
    "delta" INTEGER NOT NULL,
    "ruleVersion" INTEGER NOT NULL,
    "epoch" INTEGER NOT NULL,
    "commitment" BOOLEAN NOT NULL DEFAULT false,
    "affectsState" BOOLEAN NOT NULL DEFAULT true,
    "contestable" BOOLEAN NOT NULL DEFAULT false,
    "visibleToUser" BOOLEAN NOT NULL DEFAULT true,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actorId" TEXT,
    "meta" JSONB,
    "dedupeKey" TEXT NOT NULL,
    "reversalOf" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReputationDispute" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "ReputationDisputeStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "reversalEventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReputationDispute_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacationPeriod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "VacationPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReputationEvent_dedupeKey_key" ON "ReputationEvent"("dedupeKey");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationEvent_reversalOf_key" ON "ReputationEvent"("reversalOf");

-- CreateIndex
CREATE INDEX "ReputationEvent_userId_occurredAt_idx" ON "ReputationEvent"("userId", "occurredAt");

-- CreateIndex
CREATE INDEX "ReputationEvent_userId_axis_kind_occurredAt_idx" ON "ReputationEvent"("userId", "axis", "kind", "occurredAt");

-- CreateIndex
CREATE INDEX "ReputationEvent_sourceType_sourceId_idx" ON "ReputationEvent"("sourceType", "sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReputationDispute_eventId_key" ON "ReputationDispute"("eventId");

-- CreateIndex
CREATE INDEX "ReputationDispute_status_createdAt_idx" ON "ReputationDispute"("status", "createdAt");

-- CreateIndex
CREATE INDEX "ReputationDispute_userId_createdAt_idx" ON "ReputationDispute"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "VacationPeriod_userId_startedAt_idx" ON "VacationPeriod"("userId", "startedAt");

-- AddForeignKey
ALTER TABLE "ReputationState" ADD CONSTRAINT "ReputationState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationEvent" ADD CONSTRAINT "ReputationEvent_reversalOf_fkey" FOREIGN KEY ("reversalOf") REFERENCES "ReputationEvent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationDispute" ADD CONSTRAINT "ReputationDispute_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "ReputationEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReputationDispute" ADD CONSTRAINT "ReputationDispute_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacationPeriod" ADD CONSTRAINT "VacationPeriod_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

