import { MatchStatus } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { isPremiumActive } from "../../policies/premium";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  MatchLimitError,
} from "../../core/errors";
import { differenceInDays } from "../../core/utils/dateUtils";
import { buildMeta, toPrismaSkipTake } from "../../core/utils/pagination";
import type { PaginationQuery } from "../../core/types";
import { canOpenNewMatch, getMatchLimit } from "../../policies/contactLimits";
import { canSendLetter } from "../../policies/letterAlternation";
import { assertCanRelance, isGhosting } from "../../policies/antiGhosting";
import { getPhotoUnlockProgress } from "../../policies/photoUnlock";
import { GHOST_RELANCE_MAX_DAYS, GHOST_DAYS } from "../../config/constants";
import { emitMatchCreated } from "../../events";
import type { CreateMatchDto, GhostRelanceDto } from "./matches.schemas";

// ============================================================
// Types de retour
// ============================================================

export interface CanSendResult {
  canSend: boolean;
  reason:
    | "MATCH_NOT_ACTIVE"
    | "QUESTIONS_NOT_VALIDATED"
    | "AWAITING_REPLY"
    | "GHOST_WINDOW_CLOSED"
    | "BLOCKED"
    | null;
}

// ============================================================
// Helpers internes
// ============================================================

/** Tri lexicographique pour garantir l'unicité non orientée */
function sortUserIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function assertParticipant(match: { userAId: string; userBId: string }, userId: string) {
  if (match.userAId !== userId && match.userBId !== userId) {
    throw new ForbiddenError("Tu ne fais pas partie de ce match");
  }
}

async function countActiveMatches(userId: string): Promise<number> {
  return prisma.match.count({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
    },
  });
}


async function getUserPremiumStatus(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { premiumTier: true, premiumUntil: true },
  });
  if (!user) return false;
  return isPremiumActive(user);
}

/** Vérifie si un blocage existe dans l'un ou l'autre sens */
async function assertNoBlock(userIdA: string, userIdB: string) {
  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { fromId: userIdA, toId: userIdB },
        { fromId: userIdB, toId: userIdA },
      ],
    },
  });
  if (block) throw new ForbiddenError("Action impossible — un blocage existe entre ces utilisateurs");
}

/**
 * Calcule si l'utilisateur peut envoyer la prochaine lettre dans ce match.
 */
function computeCanSend(
  match: {
    status: MatchStatus;
    questionsValidated: boolean;
    lastLetterBy: string | null;
    lastLetterAt: Date | null;
    initiatorId: string;
  },
  userId: string,
): CanSendResult {
  if (match.status !== MatchStatus.ACTIVE) {
    return { canSend: false, reason: "MATCH_NOT_ACTIVE" };
  }

  if (!match.questionsValidated) {
    return { canSend: false, reason: "QUESTIONS_NOT_VALIDATED" };
  }

  // Fenêtre de ghosting fermée : l'autre n'a pas répondu depuis > 7 jours
  if (match.lastLetterAt && match.lastLetterBy !== userId) {
    const daysSince = differenceInDays(new Date(), match.lastLetterAt);
    if (daysSince > GHOST_RELANCE_MAX_DAYS) {
      return { canSend: false, reason: "GHOST_WINDOW_CLOSED" };
    }
  }

  // Alternation
  const ok = canSendLetter({
    lastLetterBy: match.lastLetterBy,
    senderId: userId,
    initiatorId: match.initiatorId,
  });
  if (!ok) {
    return { canSend: false, reason: "AWAITING_REPLY" };
  }

  return { canSend: true, reason: null };
}

/** Calcule si la relance est possible (sans lancer d'erreur) */
function computeCanRelance(
  match: {
    status: MatchStatus;
    lastLetterAt: Date | null;
    lastLetterBy: string | null;
    ghostRelanceUsedBy: string | null;
  },
  userId: string,
): boolean {
  if (match.status !== MatchStatus.ACTIVE) return false;
  if (!match.lastLetterAt) return false;
  if (match.lastLetterBy === userId) return false; // c'est toi qui as ghosté
  if (match.ghostRelanceUsedBy === userId) return false; // déjà utilisée

  const daysSince = differenceInDays(new Date(), match.lastLetterAt);
  return daysSince >= GHOST_DAYS && daysSince <= GHOST_RELANCE_MAX_DAYS;
}

/** Forme de sélection du match pour la réponse enrichie */
const matchSelect = {
  id: true,
  userAId: true,
  userBId: true,
  initiatorId: true,
  status: true,
  letterCountA: true,
  letterCountB: true,
  lastLetterBy: true,
  lastLetterAt: true,
  questionsValidated: true,
  ghostRelanceUsedBy: true,
  ghostDetectedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ============================================================
// Enrichir un match avec les données calculées
// ============================================================

async function enrichMatch(
  match: Awaited<ReturnType<typeof prisma.match.findUniqueOrThrow>>,
  viewerId: string,
) {
  const isViewerA = match.userAId === viewerId;
  const otherUserId = isViewerA ? match.userBId : match.userAId;
  const myLetterCount = isViewerA ? match.letterCountA : match.letterCountB;
  const otherLetterCount = isViewerA ? match.letterCountB : match.letterCountA;

  const viewerIsPremium = await getUserPremiumStatus(viewerId);

  const [otherProfile, canSendResult] = await Promise.all([
    prisma.profile.findUnique({
      where: { userId: otherUserId },
      select: {
        pseudo: true,
        gender: true,
        city: true,
        birthDate: true,
        bio: true,
        physicalDesc: true,
        avatarConfig: true,
        points: true,
        badges: true,
      },
    }),
    Promise.resolve(computeCanSend(match, viewerId)),
  ]);

  const photoUnlock = getPhotoUnlockProgress({
    myLetterCount,
    otherLetterCount,
    viewerIsPremium,
  });

  return {
    ...match,
    otherUserId,
    otherProfile,
    currentUserSide: isViewerA ? "A" : "B",
    canSend: canSendResult.canSend,
    canSendReason: canSendResult.reason,
    isGhosting: isGhosting({
      lastLetterAt: match.lastLetterAt,
      lastLetterBy: match.lastLetterBy,
      relancingUserId: viewerId,
      ghostRelanceUsedBy: match.ghostRelanceUsedBy,
    }),
    canRelance: computeCanRelance(match, viewerId),
    photoUnlock,
  };
}

// ============================================================
// createMatch
// ============================================================

export async function createMatch(initiatorId: string, dto: CreateMatchDto) {
  const { targetUserId } = dto;

  if (initiatorId === targetUserId) {
    throw new BadRequestError("Tu ne peux pas te matcher toi-même");
  }

  // Vérifier que la cible existe
  const targetExists = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, isBanned: true },
  });
  if (!targetExists) throw new NotFoundError("Utilisateur cible");
  if (targetExists.isBanned) throw new ForbiddenError("Cet utilisateur n'est pas disponible");

  // Vérifier les blocages
  await assertNoBlock(initiatorId, targetUserId);

  // Unicité non orientée : userAId < userBId
  const [userAId, userBId] = sortUserIds(initiatorId, targetUserId);

  // Vérifier si un match existe déjà
  const existing = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true, status: true },
  });
  if (existing) {
    throw new ConflictError(`Un match existe déjà entre vous (status: ${existing.status})`);
  }

  // Vérifier les limites de contacts pour l'initiateur
  const [initiatorIsPremium, initiatorActiveCount] = await Promise.all([
    getUserPremiumStatus(initiatorId),
    countActiveMatches(initiatorId),
  ]);
  if (!canOpenNewMatch(initiatorActiveCount, initiatorIsPremium)) {
    throw new MatchLimitError(getMatchLimit(initiatorIsPremium));
  }

  // Transaction : créer le match
  const match = await prisma.$transaction(async (tx) => {
    return tx.match.create({
      data: {
        userAId,
        userBId,
        initiatorId,
        status: MatchStatus.PENDING,
      },
      select: matchSelect,
    });
  });

  // Event (fire-and-forget — hors transaction)
  emitMatchCreated({ matchId: match.id, userAId, userBId, initiatorId });

  return match;
}

// ============================================================
// acceptMatch
// ============================================================

export async function acceptMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: matchSelect,
  });
  if (!match) throw new NotFoundError("Match");

  await assertParticipant(match, userId);

  if (match.status !== MatchStatus.PENDING) {
    throw new BadRequestError("Ce match n'est plus en attente d'acceptation");
  }
  if (match.initiatorId === userId) {
    throw new ForbiddenError("Tu ne peux pas accepter ta propre demande de match");
  }

  // Match activé — questionsValidated reste false jusqu'à ce que les deux joueurs
  // aient répondu aux questions via POST /matches/:id/questions/answers
  const updated = await prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.ACTIVE },
    select: matchSelect,
  });

  return enrichMatch(updated as never, userId);
}

// ============================================================
// declineMatch
// ============================================================

export async function declineMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, userAId: true, userBId: true, status: true, initiatorId: true },
  });
  if (!match) throw new NotFoundError("Match");

  await assertParticipant(match, userId);

  if (match.status !== MatchStatus.PENDING) {
    throw new BadRequestError("Ce match ne peut plus être refusé (n'est plus en attente)");
  }
  if (match.initiatorId === userId) {
    throw new ForbiddenError("Utilise DELETE /matches/:id pour annuler ta propre demande");
  }

  return prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.BROKEN },
    select: matchSelect,
  });
}

// ============================================================
// breakMatch — annuler ou rompre (initiateur OU accepteur)
// ============================================================

export async function breakMatch(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, userAId: true, userBId: true, status: true },
  });
  if (!match) throw new NotFoundError("Match");

  await assertParticipant(match, userId);

  if (
    match.status === MatchStatus.BROKEN ||
    match.status === MatchStatus.BLOCKED
  ) {
    throw new BadRequestError("Ce match est déjà rompu ou bloqué");
  }

  return prisma.match.update({
    where: { id: matchId },
    data: { status: MatchStatus.BROKEN },
    select: matchSelect,
  });
}

// ============================================================
// listMatches
// ============================================================

export async function listMatches(
  userId: string,
  pagination: PaginationQuery,
  statusFilter?: MatchStatus,
) {
  const where = {
    OR: [{ userAId: userId }, { userBId: userId }],
    ...(statusFilter ? { status: statusFilter } : {}),
  };

  const [total, matches] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      select: matchSelect,
      orderBy: [{ lastLetterAt: "desc" }, { createdAt: "desc" }],
      ...toPrismaSkipTake(pagination),
    }),
  ]);

  // Enrichir tous les matchs en parallèle
  const enriched = await Promise.all(
    matches.map((m) => enrichMatch(m as never, userId)),
  );

  return {
    data: enriched,
    meta: buildMeta(total, pagination),
  };
}

// ============================================================
// getMatchDetail
// ============================================================

export async function getMatchDetail(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: matchSelect,
  });
  if (!match) throw new NotFoundError("Match");

  await assertParticipant(match, userId);

  return enrichMatch(match as never, userId);
}

// ============================================================
// ghostRelance
// ============================================================

export async function ghostRelance(matchId: string, userId: string, dto: GhostRelanceDto) {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: matchSelect,
  });
  if (!match) throw new NotFoundError("Match");

  await assertParticipant(match, userId);

  if (match.status !== MatchStatus.ACTIVE) {
    throw new BadRequestError("La relance n'est disponible que sur un match actif");
  }

  // Vérifier les blocages (sécurité)
  const otherUserId = match.userAId === userId ? match.userBId : match.userAId;
  await assertNoBlock(userId, otherUserId);

  // Valider la policy anti-ghosting
  assertCanRelance({
    lastLetterAt: match.lastLetterAt,
    lastLetterBy: match.lastLetterBy,
    relancingUserId: userId,
    ghostRelanceUsedBy: match.ghostRelanceUsedBy,
  });

  const content =
    dto.message?.trim() ||
    "💌 Je t'envoie une petite relance... tu es toujours là ?";

  // Transaction : créer la lettre de relance + màj match
  const { letter, updatedMatch } = await prisma.$transaction(async (tx) => {
    const letter = await tx.letter.create({
      data: {
        matchId,
        fromUserId: userId,
        toUserId: otherUserId,
        content,
        isGhostRelance: true,
      },
    });

    const updatedMatch = await tx.match.update({
      where: { id: matchId },
      data: {
        ghostRelanceUsedBy: userId,
        lastLetterBy: userId,
        lastLetterAt: new Date(),
        ghostDetectedAt: null, // Reset de la détection de ghost
        // La relance ne compte PAS dans letterCountA/B
      },
      select: matchSelect,
    });

    return { letter, updatedMatch };
  });

  // Event (fire-and-forget, isGhostRelance = true → pas de XP)
  const { emitLetterSent } = await import("../../events");
  emitLetterSent({
    matchId,
    fromUserId: userId,
    toUserId: otherUserId,
    matchLetterCountA: updatedMatch.letterCountA,
    matchLetterCountB: updatedMatch.letterCountB,
    isGhostRelance: true,
  });

  return {
    letter,
    match: await enrichMatch(updatedMatch as never, userId),
  };
}
