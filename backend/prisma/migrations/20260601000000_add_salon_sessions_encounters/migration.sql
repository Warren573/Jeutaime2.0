-- CreateEnum
CREATE TYPE "SalonSessionStatus" AS ENUM ('ACTIVE', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SalonSessionParticipantStatus" AS ENUM ('ACTIVE', 'LEFT');

-- CreateTable
CREATE TABLE "SalonSession" (
    "id" TEXT NOT NULL,
    "salonKind" "SalonKind" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "SalonSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "ownerId" TEXT,

    CONSTRAINT "SalonSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonSessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "SalonSessionParticipantStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),

    CONSTRAINT "SalonSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalonEncounter" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "user1Id" TEXT NOT NULL,
    "user2Id" TEXT NOT NULL,
    "metAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SalonEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SalonSession_salonKind_status_expiresAt_idx" ON "SalonSession"("salonKind", "status", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalonSessionParticipant_sessionId_userId_key" ON "SalonSessionParticipant"("sessionId", "userId");

-- CreateIndex
CREATE INDEX "SalonSessionParticipant_userId_status_idx" ON "SalonSessionParticipant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "SalonEncounter_sessionId_user1Id_user2Id_key" ON "SalonEncounter"("sessionId", "user1Id", "user2Id");

-- CreateIndex
CREATE INDEX "SalonEncounter_sessionId_idx" ON "SalonEncounter"("sessionId");

-- AddForeignKey
ALTER TABLE "SalonSession" ADD CONSTRAINT "SalonSession_salonKind_fkey" FOREIGN KEY ("salonKind") REFERENCES "Salon"("kind") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSessionParticipant" ADD CONSTRAINT "SalonSessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonSessionParticipant" ADD CONSTRAINT "SalonSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "SalonSession"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_user1Id_fkey" FOREIGN KEY ("user1Id") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "SalonEncounter" ADD CONSTRAINT "SalonEncounter_user2Id_fkey" FOREIGN KEY ("user2Id") REFERENCES "User"("id") ON DELETE CASCADE;
