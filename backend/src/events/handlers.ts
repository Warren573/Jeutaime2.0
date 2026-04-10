/**
 * Handlers d'événements JeuTaime
 * Ce fichier est importé une seule fois au démarrage (server.ts)
 * Les handlers sont asynchrones mais ne propagent PAS leurs erreurs
 * vers l'appelant — ils loggent et continuent.
 */
import { emitter } from "./index";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { XP } from "../config/constants";

// ============================================================
// letterSent → awarding XP + check badges
// ============================================================
emitter.on("letterSent", async (payload) => {
  try {
    const { fromUserId, toUserId, isGhostRelance } = payload;

    // Pas de points pour les relances fantômes
    if (isGhostRelance) return;

    await prisma.$transaction([
      // XP expéditeur
      prisma.profile.update({
        where: { userId: fromUserId },
        data: { points: { increment: XP.SEND_LETTER } },
      }),
      // XP destinataire
      prisma.profile.update({
        where: { userId: toUserId },
        data: { points: { increment: XP.RECEIVE_LETTER } },
      }),
    ]);

    logger.debug({ fromUserId, toUserId }, "XP attribué pour lettre envoyée");
  } catch (err) {
    logger.error({ err, payload }, "[event:letterSent] Erreur attribution XP");
  }
});

// ============================================================
// matchCreated → XP pour les deux participants
// ============================================================
emitter.on("matchCreated", async (payload) => {
  try {
    const { userAId, userBId } = payload;

    // updateMany ne supporte pas les opérations atomiques increment sur tableaux
    // donc deux updates en parallèle
    await Promise.all([
      prisma.profile.update({
        where: { userId: userAId },
        data: { points: { increment: XP.GET_MATCH } },
      }),
      prisma.profile.update({
        where: { userId: userBId },
        data: { points: { increment: XP.GET_MATCH } },
      }),
    ]);

    logger.debug({ userAId, userBId }, "XP attribué pour nouveau match");
  } catch (err) {
    logger.error({ err, payload }, "[event:matchCreated] Erreur attribution XP");
  }
});
