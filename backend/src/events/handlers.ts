/**
 * Handlers d'événements JeuTaime
 * Ce fichier est importé une seule fois au démarrage (server.ts)
 * Les handlers sont asynchrones mais ne propagent PAS leurs erreurs
 * vers l'appelant — ils loggent et continuent.
 *
 * Convention :
 *   - Les handlers métier (XP, stats) font des writes DB.
 *   - Les handlers "debug" se contentent de logger proprement.
 *   - Aucun handler n'envoie de notification utilisateur (phase à venir).
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

// ============================================================
// offeringSent → debug log (aucun side-effect DB pour l'instant)
// ============================================================
emitter.on("offeringSent", (payload) => {
  logger.debug(
    {
      offeringSentId: payload.offeringSentId,
      offeringId: payload.offeringId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      salonId: payload.salonId,
      cost: payload.cost,
      expiresAt: payload.expiresAt,
    },
    "[event:offeringSent]",
  );
});

// ============================================================
// magieCast → debug log
// ============================================================
emitter.on("magieCast", (payload) => {
  logger.debug(
    {
      magieCastId: payload.magieCastId,
      magieId: payload.magieId,
      fromUserId: payload.fromUserId,
      toUserId: payload.toUserId,
      salonId: payload.salonId,
      expiresAt: payload.expiresAt,
      cost: payload.cost,
    },
    "[event:magieCast]",
  );
});

// ============================================================
// magieBroken → debug log
// ============================================================
emitter.on("magieBroken", (payload) => {
  logger.debug(
    {
      magieCastId: payload.magieCastId,
      magieId: payload.magieId,
      antiSpellId: payload.antiSpellId,
      brokenBy: payload.brokenBy,
      originalToUserId: payload.originalToUserId,
    },
    "[event:magieBroken]",
  );
});

// ============================================================
// premiumSubscribed → info log (traçable dans les logs d'ops)
// ============================================================
emitter.on("premiumSubscribed", (payload) => {
  logger.info(
    {
      userId: payload.userId,
      planId: payload.planId,
      paymentMethod: payload.paymentMethod,
      coinsSpent: payload.coinsSpent,
      newUntil: payload.newUntil,
      durationDays: payload.durationDays,
    },
    "[event:premiumSubscribed]",
  );
});

// ============================================================
// premiumCancelled → info log
// ============================================================
emitter.on("premiumCancelled", (payload) => {
  logger.info(
    { userId: payload.userId, previousUntil: payload.previousUntil },
    "[event:premiumCancelled]",
  );
});

// ============================================================
// reportCreated → info log (utile pour monitoring modération)
// ============================================================
emitter.on("reportCreated", (payload) => {
  logger.info(
    {
      reportId: payload.reportId,
      reporterId: payload.reporterId,
      targetId: payload.targetId,
      reason: payload.reason,
    },
    "[event:reportCreated]",
  );
});
