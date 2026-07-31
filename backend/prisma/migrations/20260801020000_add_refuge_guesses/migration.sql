-- CreateTable
CREATE TABLE "RefugeGuess" (
    "id" TEXT NOT NULL,
    "refugeSessionId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "guessedAction1" "RefugeAction" NOT NULL,
    "guessedAction2" "RefugeAction" NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefugeGuess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefugeGuess_refugeSessionId_dayNumber_key" ON "RefugeGuess"("refugeSessionId", "dayNumber");

-- CreateIndex
CREATE INDEX "RefugeGuess_refugeSessionId_dayNumber_idx" ON "RefugeGuess"("refugeSessionId", "dayNumber");

-- AddForeignKey
ALTER TABLE "RefugeGuess" ADD CONSTRAINT "RefugeGuess_refugeSessionId_fkey" FOREIGN KEY ("refugeSessionId") REFERENCES "RefugeSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
