import { MatchStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../core/errors";
import { getQuestion } from "../../config/questions";
import { PROFILE_QUESTIONS_REQUIRED } from "../../config/constants";
import type { SubmitAnswersDto } from "./questions.schemas";

// ============================================================
// Helpers
// ============================================================

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

async function assertMatchParticipant(
  match: { userAId: string; userBId: string },
  userId: string,
) {
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new ForbiddenError("Tu ne fais pas partie de ce match");
  }
}

// ============================================================
// getMatchQuestions
// Retourne les questions de l'autre joueur avec les options mélangées.
// ============================================================

export async function getMatchQuestions(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      status: true,
      questionsValidated: true,
    },
  });
  if (!match) throw new NotFoundError("Match");
  await assertMatchParticipant(match, userId);

  if (match.status !== MatchStatus.ACTIVE) {
    throw new BadRequestError("Le jeu des questions n'est disponible que sur un match actif");
  }

  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

  const otherProfile = await prisma.profile.findUnique({
    where: { userId: otherUserId },
    select: { id: true },
  });
  if (!otherProfile) throw new NotFoundError("Profil de l'autre utilisateur");

  const otherQuestions = await prisma.profileQuestion.findMany({
    where: { profileId: otherProfile.id },
    select: { id: true, questionId: true, questionText: true, answer: true, wrongAnswers: true },
  });

  const myAttempts = await prisma.matchQuestionAttempt.findMany({
    where: { matchId, responderId: userId },
    select: { questionId: true, isCorrect: true },
  });

  const myStatus = myAttempts.length >= PROFILE_QUESTIONS_REQUIRED ? "submitted" : "pending";
  const myScore = myAttempts.filter((a) => a.isCorrect).length;

  const questions = otherQuestions.map((q) => {
    const catalogEntry = getQuestion(q.questionId);
    // Mélanger correct + mauvaises réponses ; si aucune wrongAnswer : retourner sans options
    const options =
      q.wrongAnswers.length >= 2
        ? shuffle([q.answer, ...q.wrongAnswers])
        : null;

    return {
      profileQuestionId: q.id,
      questionId: q.questionId,
      questionText: q.questionText ?? catalogEntry?.text ?? q.questionId,
      options,
    };
  });

  return {
    matchId,
    questionsValidated: match.questionsValidated,
    myStatus,
    myScore: myStatus === "submitted" ? myScore : null,
    questions,
  };
}

// ============================================================
// submitMatchAnswers
// Enregistre les réponses, calcule le score, auto-valide si les deux ont joué.
// ============================================================

export async function submitMatchAnswers(
  matchId: string,
  userId: string,
  dto: SubmitAnswersDto,
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      status: true,
      questionsValidated: true,
    },
  });
  if (!match) throw new NotFoundError("Match");
  await assertMatchParticipant(match, userId);

  if (match.status !== MatchStatus.ACTIVE) {
    throw new BadRequestError("Le jeu des questions n'est disponible que sur un match actif");
  }
  if (match.questionsValidated) {
    throw new BadRequestError("Les questions sont déjà validées pour ce match");
  }

  // Idempotence : un joueur ne peut soumettre qu'une fois
  const existing = await prisma.matchQuestionAttempt.findMany({
    where: { matchId, responderId: userId },
  });
  if (existing.length >= PROFILE_QUESTIONS_REQUIRED) {
    throw new ConflictError("Tu as déjà répondu aux questions de ce match");
  }

  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;

  const otherProfile = await prisma.profile.findUnique({
    where: { userId: otherUserId },
    select: { id: true },
  });
  if (!otherProfile) throw new NotFoundError("Profil de l'autre utilisateur");

  const realAnswers = await prisma.profileQuestion.findMany({
    where: { profileId: otherProfile.id },
    select: { id: true, answer: true },
  });

  if (realAnswers.length < PROFILE_QUESTIONS_REQUIRED) {
    throw new BadRequestError(
      `L'autre utilisateur n'a pas encore configuré ses ${PROFILE_QUESTIONS_REQUIRED} questions`,
    );
  }

  const realAnswerMap = new Map(
    realAnswers.map((q) => [q.id, q.answer.toLowerCase().trim()]),
  );

  // Vérifier que les profileQuestionId soumis sont valides
  for (const a of dto.answers) {
    if (!realAnswerMap.has(a.profileQuestionId)) {
      throw new BadRequestError(`Question inconnue : ${a.profileQuestionId}`);
    }
  }

  const attempts = dto.answers.map((a) => ({
    matchId,
    responderId: userId,
    questionId: a.profileQuestionId,
    submittedAnswer: a.answer,
    isCorrect: a.answer.toLowerCase().trim() === realAnswerMap.get(a.profileQuestionId),
  }));

  await prisma.matchQuestionAttempt.createMany({ data: attempts });

  const myScore = attempts.filter((a) => a.isCorrect).length;
  const myPassed = myScore >= 1;

  // Vérifier si l'autre a déjà soumis ses réponses
  const otherAttempts = await prisma.matchQuestionAttempt.findMany({
    where: { matchId, responderId: otherUserId },
    select: { isCorrect: true },
  });
  const otherSubmitted = otherAttempts.length >= PROFILE_QUESTIONS_REQUIRED;

  if (!otherSubmitted) {
    return {
      myScore,
      passed: myPassed,
      questionsValidated: false,
      waitingForOther: true,
      matchBroken: false,
    };
  }

  const otherScore = otherAttempts.filter((a) => a.isCorrect).length;
  const otherPassed = otherScore >= 1;

  if (myPassed && otherPassed) {
    await prisma.match.update({
      where: { id: matchId },
      data: { questionsValidated: true },
    });
    return {
      myScore,
      passed: myPassed,
      questionsValidated: true,
      waitingForOther: false,
      matchBroken: false,
    };
  }

  // Au moins un échec → match rompu
  await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.BROKEN },
  });

  return {
    myScore,
    passed: myPassed,
    questionsValidated: false,
    waitingForOther: false,
    matchBroken: true,
  };
}
