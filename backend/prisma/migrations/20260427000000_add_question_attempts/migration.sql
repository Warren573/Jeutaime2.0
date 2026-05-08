-- Migration: jeu des 3 questions
-- 1. Ajouter wrongAnswers sur ProfileQuestion (pour les options QCM)
-- 2. Créer MatchQuestionAttempt (suivi des réponses pendant le jeu)

ALTER TABLE "ProfileQuestion" ADD COLUMN "wrongAnswers" TEXT[] NOT NULL DEFAULT '{}';

CREATE TABLE "MatchQuestionAttempt" (
  "id"              TEXT        NOT NULL,
  "matchId"         TEXT        NOT NULL,
  "responderId"     TEXT        NOT NULL,
  "questionId"      TEXT        NOT NULL,
  "submittedAnswer" TEXT        NOT NULL,
  "isCorrect"       BOOLEAN     NOT NULL,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MatchQuestionAttempt_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MatchQuestionAttempt_matchId_responderId_questionId_key"
  ON "MatchQuestionAttempt"("matchId", "responderId", "questionId");

CREATE INDEX "MatchQuestionAttempt_matchId_idx"
  ON "MatchQuestionAttempt"("matchId");

ALTER TABLE "MatchQuestionAttempt"
  ADD CONSTRAINT "MatchQuestionAttempt_matchId_fkey"
  FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE;

ALTER TABLE "MatchQuestionAttempt"
  ADD CONSTRAINT "MatchQuestionAttempt_responderId_fkey"
  FOREIGN KEY ("responderId") REFERENCES "User"("id") ON DELETE CASCADE;
