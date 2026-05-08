-- CreateEnum
CREATE TYPE "ReactionType" AS ENUM ('SMILE', 'GRIMACE');

-- CreateTable
CREATE TABLE "Reaction" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" "ReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Reaction_toId_idx" ON "Reaction"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "Reaction_fromId_toId_key" ON "Reaction"("fromId", "toId");

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reaction" ADD CONSTRAINT "Reaction_toId_fkey" FOREIGN KEY ("toId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
