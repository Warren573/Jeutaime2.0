import { MatchStatus, LetterStatus, PremiumTier } from "@prisma/client";
import { prisma } from "../../config/prisma";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
  UnprocessableError,
} from "../../core/errors";
import { assertCanSendLetter } from "../../policies/letterAlternation";
import { LETTER_MAX_LENGTH, PROFILE_QUESTIONS_REQUIRED } from "../../config/constants";
import { buildMeta, toPrismaSkipTake } from "../../core/utils/pagination";
import { emitLetterSent } from "../../events";
import type { PaginationQuery } from "../../core/types";
import type { SendLetterDto } from "./letters.schemas";

// ============================================================
// Helpers
// ============================================================

async function assertMatchParticipant(
  match: { userAId: string; userBId: string },
  userId: string,
) {
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new ForbiddenError("Tu ne fais pas partie de ce match");
  }
}

async function assertNoBlock(a: string, b: string) {
  const block = await prisma.block.findFirst({
    where: { OR: [{ fromId: a, toId: b }, { fromId: b, toId: a }] },
  });
  if (block) throw new ForbiddenError("Action impossible — un blocage existe");
}

// ============================================================
// sendLetter
// ============================================================

export async function sendLetter(matchId: string, senderId: string, dto: SendLetterDto) {
  // Double-guard : Zod valide déjà, mais on vérifie côté service pour défense en profondeur
  if (dto.content.length > LETTER_MAX_LENGTH) {
    throw new BadRequestError(
      `La lettre ne peut pas dépasser ${LETTER_MAX_LENGTH} caractères`,
    );
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      userAId: true,
      userBId: true,
      initiatorId: true,
      status: true,
      questionsValidated: true,
      lastLetterBy: true,
      lastLetterAt: true,
      letterCountA: true,
      letterCountB: true,
    },
  });
  if (!match) throw new NotFoundError("Match");

  await assertMatchParticipant(match, senderId);

  // Vérifier que le match est actif
  if (match.status !== MatchStatus.ACTIVE) {
    throw new UnprocessableError(
      `Impossible d'envoyer une lettre — le match est en status "${match.status}"`,
    );
  }

  // Vérifier les questions de validation
  if (!match.questionsValidated) {
    throw new UnprocessableError(
      "Les deux profils doivent d'abord répondre à leurs 3 questions de validation",
    );
  }

  const receiverId = match.userAId === senderId ? match.userBId : match.userAId;

  // Vérifier les blocages
  await assertNoBlock(senderId, receiverId);

  // Vérifier l'alternation stricte
  assertCanSendLetter({
    lastLetterBy: match.lastLetterBy,
    senderId,
    initiatorId: match.initiatorId,
  });

  const isUserA = match.userAId === senderId;

  // Transaction atomique : créer la lettre + màj compteurs du match
  const { letter, updatedMatch } = await prisma.$transaction(async (tx) => {
    const letter = await tx.letter.create({
      data: {
        matchId,
        fromUserId: senderId,
        toUserId: receiverId,
        content: dto.content,
        isGhostRelance: false,
      },
    });

    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        lastLetterBy: senderId,
        lastLetterAt: new Date(),
        // Incrémenter le bon compteur
        ...(isUserA
          ? { letterCountA: { increment: 1 } }
          : { letterCountB: { increment: 1 } }),
        // Reset du ghost si présent
        ghostDetectedAt: null,
      },
      select: {
        letterCountA: true,
        letterCountB: true,
        lastLetterBy: true,
        lastLetterAt: true,
      },
    });

    return { letter, updatedMatch };
  });

  // Event fire-and-forget (hors transaction)
  emitLetterSent({
    matchId,
    fromUserId: senderId,
    toUserId: receiverId,
    matchLetterCountA: updatedMatch.letterCountA,
    matchLetterCountB: updatedMatch.letterCountB,
    isGhostRelance: false,
  });

  return letter;
}

// ============================================================
// listLetters
// ============================================================

export async function listLetters(
  matchId: string,
  userId: string,
  pagination: PaginationQuery,
) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, userAId: true, userBId: true },
  });
  if (!match) throw new NotFoundError("Match");

  await assertMatchParticipant(match, userId);

  const where = { matchId };

  const [total, letters] = await Promise.all([
    prisma.letter.count({ where }),
    prisma.letter.findMany({
      where,
      select: {
        id: true,
        matchId: true,
        fromUserId: true,
        toUserId: true,
        content: true,
        status: true,
        isGhostRelance: true,
        sentAt: true,
        readAt: true,
      },
      orderBy: { sentAt: "asc" },
      ...toPrismaSkipTake(pagination),
    }),
  ]);

  return {
    data: letters,
    meta: buildMeta(total, pagination),
  };
}

// ============================================================
// markLetterRead
// ============================================================

export async function markLetterRead(letterId: string, userId: string) {
  const letter = await prisma.letter.findUnique({
    where: { id: letterId },
    select: { id: true, toUserId: true, status: true, readAt: true },
  });
  if (!letter) throw new NotFoundError("Lettre");

  if (letter.toUserId !== userId) {
    throw new ForbiddenError("Seul le destinataire peut marquer une lettre comme lue");
  }

  if (letter.status === LetterStatus.READ) {
    // Idempotent : retourner sans erreur
    return letter;
  }

  return prisma.letter.update({
    where: { id: letterId },
    data: {
      status: LetterStatus.READ,
      readAt: new Date(),
    },
    select: {
      id: true,
      matchId: true,
      fromUserId: true,
      toUserId: true,
      status: true,
      isGhostRelance: true,
      sentAt: true,
      readAt: true,
    },
  });
}

// ============================================================
// getUnreadCount — utile pour le badge boîte aux lettres
// ============================================================

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.letter.count({
    where: {
      toUserId: userId,
      status: LetterStatus.SENT,
    },
  });
}
