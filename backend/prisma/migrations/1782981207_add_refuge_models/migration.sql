-- CreateEnum
CREATE TYPE "RefugeAnimalType" AS ENUM ('HAMSTER', 'LAPIN', 'CHAT', 'CHIEN', 'RENARD', 'PINGOUIN', 'IGUANE', 'PANDA', 'LICORNE', 'DRAGON');

-- CreateEnum
CREATE TYPE "RefugeAnimalCategory" AS ENUM ('SIMPLE', 'RARE', 'EXOTIQUE');

-- CreateEnum
CREATE TYPE "RefugeAnimalSexe" AS ENUM ('MALE', 'FEMELLE', 'NEUTRE');

-- CreateEnum
CREATE TYPE "RefugeAcceptedSexe" AS ENUM ('HOMME', 'FEMME', 'HOMME_FEMME');

-- CreateEnum
CREATE TYPE "RefugeAction" AS ENUM ('NOURRIR', 'JOUER', 'CARESSER', 'LAVER');

-- CreateEnum
CREATE TYPE "RefugeSessionStatus" AS ENUM ('CREATION', 'WAITING_FOR_ADOPTANT', 'ACTIVE', 'COMPLETED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "RefugePreexistingLinkType" AS ENUM ('MATCH', 'LETTER', 'SALON', 'PRIVATE_MESSAGE');

-- CreateTable
CREATE TABLE "RefugeSession" (
    "id" TEXT NOT NULL,
    "adopteId" TEXT NOT NULL,
    "adoptantId" TEXT,
    "animalType" "RefugeAnimalType" NOT NULL,
    "animalCategory" "RefugeAnimalCategory" NOT NULL,
    "animalSexe" "RefugeAnimalSexe" NOT NULL,
    "acceptedSexe" "RefugeAcceptedSexe" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "status" "RefugeSessionStatus" NOT NULL DEFAULT 'CREATION',
    "lastAdopteActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastAdoptantActivityAt" TIMESTAMP(3),
    "inactivityAlertSentAt" TIMESTAMP(3),
    "finalAlertSentAt" TIMESTAMP(3),
    "preexistingLinkType" "RefugePreexistingLinkType",

    CONSTRAINT "RefugeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefugeDailyChoice" (
    "id" TEXT NOT NULL,
    "refugeSessionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "action1" "RefugeAction" NOT NULL,
    "action2" "RefugeAction" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeDailyChoice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefugeSession_adopteId_adoptantId_key" ON "RefugeSession"("adopteId", "adoptantId");

-- CreateIndex
CREATE INDEX "RefugeSession_status_endsAt_idx" ON "RefugeSession"("status", "endsAt");

-- CreateIndex
CREATE INDEX "RefugeSession_adopteId_idx" ON "RefugeSession"("adopteId");

-- CreateIndex
CREATE INDEX "RefugeSession_adoptantId_idx" ON "RefugeSession"("adoptantId");

-- CreateIndex
CREATE INDEX "RefugeSession_status_createdAt_idx" ON "RefugeSession"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RefugeDailyChoice_refugeSessionId_dayNumber_key" ON "RefugeDailyChoice"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE INDEX "RefugeDailyChoice_refugeSessionId_dayNumber_idx" ON "RefugeDailyChoice"("refugeSessionId", "dayNumber");

-- AddForeignKey
ALTER TABLE "RefugeSession" ADD CONSTRAINT "RefugeSession_adopteId_fkey" FOREIGN KEY ("adopteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeSession" ADD CONSTRAINT "RefugeSession_adoptantId_fkey" FOREIGN KEY ("adoptantId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefugeDailyChoice" ADD CONSTRAINT "RefugeDailyChoice_refugeSessionId_fkey" FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
