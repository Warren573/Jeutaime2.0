-- CreateEnum
CREATE TYPE "BottleStatus" AS ENUM ('FLOATING', 'ACCEPTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BottleReceiptStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REFUSED', 'TAKEN');

-- CreateTable
CREATE TABLE "MessageInABottle" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "targetGender" TEXT NOT NULL,
    "ageMin" INTEGER NOT NULL,
    "ageMax" INTEGER NOT NULL,
    "status" "BottleStatus" NOT NULL DEFAULT 'FLOATING',
    "acceptedById" TEXT,
    "acceptedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageInABottle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleReceipt" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "status" "BottleReceiptStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actionAt" TIMESTAMP(3),

    CONSTRAINT "BottleReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnonymousMessage" (
    "id" TEXT NOT NULL,
    "bottleId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnonymousMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BottleSuspension" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BottleSuspension_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageInABottle_status_expiresAt_idx" ON "MessageInABottle"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "MessageInABottle_senderId_status_idx" ON "MessageInABottle"("senderId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "BottleReceipt_bottleId_recipientId_key" ON "BottleReceipt"("bottleId", "recipientId");

-- CreateIndex
CREATE INDEX "BottleReceipt_recipientId_status_idx" ON "BottleReceipt"("recipientId", "status");

-- CreateIndex
CREATE INDEX "AnonymousMessage_bottleId_createdAt_idx" ON "AnonymousMessage"("bottleId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "BottleSuspension_userId_key" ON "BottleSuspension"("userId");

-- CreateIndex
CREATE INDEX "BottleSuspension_userId_endsAt_idx" ON "BottleSuspension"("userId", "endsAt");

-- AddForeignKey
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageInABottle" ADD CONSTRAINT "MessageInABottle_acceptedById_fkey" FOREIGN KEY ("acceptedById") REFERENCES "User"("id") ON DELETE SET NULL;

-- AddForeignKey
ALTER TABLE "BottleReceipt" ADD CONSTRAINT "BottleReceipt_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleReceipt" ADD CONSTRAINT "BottleReceipt_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousMessage" ADD CONSTRAINT "AnonymousMessage_bottleId_fkey" FOREIGN KEY ("bottleId") REFERENCES "MessageInABottle"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "AnonymousMessage" ADD CONSTRAINT "AnonymousMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "BottleSuspension" ADD CONSTRAINT "BottleSuspension_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE;
