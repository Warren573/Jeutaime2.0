import { MatchStatus, ReactionType } from "@prisma/client";
import { prisma } from "../../config/prisma";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../core/errors";
import { isPremiumActive } from "../../policies/premium";
import { canOpenNewMatch, getMatchLimit } from "../../policies/contactLimits";
import { emitMatchCreated } from "../../events";
import type { SendReactionDto } from "./reactions.schemas";

function sortIds(a: string, b: string): [string, string] {
  return a < b ? [a, b] : [b, a];
}

async function countActiveMatches(userId: string): Promise<number> {
  return prisma.match.count({
    where: {
      OR: [{ userAId: userId }, { userBId: userId }],
      status: { in: [MatchStatus.ACTIVE, MatchStatus.PENDING] },
    },
  });
}

/**
 * Enregistre une réaction (sourire ou grimace) de fromId vers toId.
 * Si sourire mutuel détecté → crée automatiquement un match PENDING.
 */
export async function sendReaction(fromId: string, dto: SendReactionDto) {
  const { toId, type } = dto;

  if (fromId === toId) {
    throw new BadRequestError("Tu ne peux pas réagir à ton propre profil");
  }

  const target = await prisma.user.findUnique({
    where: { id: toId },
    select: { id: true, isBanned: true },
  });
  if (!target) throw new NotFoundError("Utilisateur");
  if (target.isBanned) throw new ForbiddenError("Cet utilisateur n'est pas disponible");

  const block = await prisma.block.findFirst({
    where: {
      OR: [
        { fromId, toId },
        { fromId: toId, toId: fromId },
      ],
    },
  });
  if (block) throw new ForbiddenError("Action impossible — un blocage existe entre ces utilisateurs");

  // Upsert : permet de changer son avis (sourire → grimace ou inverse)
  const reaction = await prisma.reaction.upsert({
    where: { fromId_toId: { fromId, toId } },
    create: { fromId, toId, type: type as ReactionType },
    update: { type: type as ReactionType },
  });

  if (type !== "SMILE") {
    return {
      id: reaction.id,
      fromId,
      toId,
      type,
      createdAt: reaction.createdAt.toISOString(),
      matchCreated: false,
    };
  }

  // Vérifier sourire mutuel
  const mutualSmile = await prisma.reaction.findFirst({
    where: { fromId: toId, toId: fromId, type: ReactionType.SMILE },
  });

  if (!mutualSmile) {
    return {
      id: reaction.id,
      fromId,
      toId,
      type,
      createdAt: reaction.createdAt.toISOString(),
      matchCreated: false,
    };
  }

  // Sourire mutuel — vérifier si un match existe déjà
  const [userAId, userBId] = sortIds(fromId, toId);
  const existing = await prisma.match.findUnique({
    where: { userAId_userBId: { userAId, userBId } },
    select: { id: true },
  });

  if (existing) {
    return {
      id: reaction.id,
      fromId,
      toId,
      type,
      createdAt: reaction.createdAt.toISOString(),
      matchCreated: false,
      matchId: existing.id,
    };
  }

  // Vérifier la limite de matchs de l'initiateur
  const [fromUser, activeCount] = await Promise.all([
    prisma.user.findUnique({
      where: { id: fromId },
      select: { premiumTier: true, premiumUntil: true },
    }),
    countActiveMatches(fromId),
  ]);
  const isPremium = fromUser ? isPremiumActive(fromUser) : false;
  if (!canOpenNewMatch(activeCount, isPremium)) {
    throw new BadRequestError(`Limite de matches atteinte (${getMatchLimit(isPremium)}). Passe en premium pour en avoir plus.`);
  }

  // Créer le match — auto-activé car les deux ont souri volontairement
  const match = await prisma.$transaction(async (tx) => {
    return tx.match.create({
      data: {
        userAId,
        userBId,
        initiatorId: fromId,
        status: MatchStatus.ACTIVE,
      },
      select: { id: true },
    });
  });

  emitMatchCreated({ matchId: match.id, userAId, userBId, initiatorId: fromId });

  return {
    id: reaction.id,
    fromId,
    toId,
    type,
    createdAt: reaction.createdAt.toISOString(),
    matchCreated: true,
    matchId: match.id,
  };
}
