/**
 * Handlers d'événements JeuTaime
 * Ce fichier est importé une seule fois au démarrage (server.ts)
 * Les handlers sont asynchrones mais ne propagent PAS leurs erreurs
 * vers l'appelant — ils loggent et continuent.
 *
 * Convention :
 *   - Les handlers métier (XP, stats) font des writes DB.
 *   - Les handlers "notifications" créent une Notification in-app,
 *     fire-and-forget, jamais bloquants.
 *   - Les handlers "debug" se contentent de logger proprement.
 */
import { NotificationType } from "@prisma/client";
import { emitter } from "./index";
import { prisma } from "../config/prisma";
import { logger } from "../config/logger";
import { XP } from "../config/constants";
import { createNotification } from "../modules/notifications/notifications.service";

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

// letterSent → notification destinataire
emitter.on("letterSent", async (payload) => {
  try {
    await createNotification({
      userId: payload.toUserId,
      type: NotificationType.LETTER_RECEIVED,
      meta: {
        matchId: payload.matchId,
        fromUserId: payload.fromUserId,
      },
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:letterSent] Erreur création notification",
    );
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

// matchCreated → notifications pour les 2 users (chacun voit l'autre)
emitter.on("matchCreated", async (payload) => {
  try {
    await Promise.all([
      createNotification({
        userId: payload.userAId,
        type: NotificationType.MATCH_CREATED,
        meta: {
          matchId: payload.matchId,
          otherUserId: payload.userBId,
        },
      }),
      createNotification({
        userId: payload.userBId,
        type: NotificationType.MATCH_CREATED,
        meta: {
          matchId: payload.matchId,
          otherUserId: payload.userAId,
        },
      }),
    ]);
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:matchCreated] Erreur création notifications",
    );
  }
});

// ============================================================
// offeringSent → debug log + notification cible
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

emitter.on("offeringSent", async (payload) => {
  try {
    await createNotification({
      userId: payload.toUserId,
      type: NotificationType.OFFERING_RECEIVED,
      meta: {
        offeringSentId: payload.offeringSentId,
        offeringId: payload.offeringId,
        fromUserId: payload.fromUserId,
      },
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:offeringSent] Erreur création notification",
    );
  }
});

// ============================================================
// magieCast → debug log + notification cible
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

emitter.on("magieCast", async (payload) => {
  try {
    await createNotification({
      userId: payload.toUserId,
      type: NotificationType.MAGIE_RECEIVED,
      meta: {
        magieCastId: payload.magieCastId,
        magieId: payload.magieId,
        fromUserId: payload.fromUserId,
      },
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:magieCast] Erreur création notification",
    );
  }
});

// ============================================================
// magieBroken → debug log + notification à la personne libérée
// Règle : seul originalToUserId est notifié, pas le caster initial.
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

emitter.on("magieBroken", async (payload) => {
  try {
    await createNotification({
      userId: payload.originalToUserId,
      type: NotificationType.MAGIE_BROKEN,
      meta: {
        magieCastId: payload.magieCastId,
      },
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:magieBroken] Erreur création notification",
    );
  }
});

// ============================================================
// premiumSubscribed → info log (traçable dans les logs d'ops)
// + notification user lui-même (pas de montants en meta)
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

emitter.on("premiumSubscribed", async (payload) => {
  try {
    await createNotification({
      userId: payload.userId,
      type: NotificationType.PREMIUM_SUBSCRIBED,
      // Pas de meta : on ne veut NI coinsSpent NI newUntil persistés
      // dans la notif (règle phase 10).
      meta: null,
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:premiumSubscribed] Erreur création notification",
    );
  }
});

// ============================================================
// premiumCancelled → info log + notification user lui-même
// ============================================================
emitter.on("premiumCancelled", (payload) => {
  logger.info(
    { userId: payload.userId, previousUntil: payload.previousUntil },
    "[event:premiumCancelled]",
  );
});

emitter.on("premiumCancelled", async (payload) => {
  try {
    await createNotification({
      userId: payload.userId,
      type: NotificationType.PREMIUM_CANCELLED,
      meta: null,
    });
  } catch (err) {
    logger.error(
      { err, payload },
      "[event:premiumCancelled] Erreur création notification",
    );
  }
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
