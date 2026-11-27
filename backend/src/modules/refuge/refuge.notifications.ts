import { NotificationType } from "@prisma/client";
import { notifyEvent } from "../notifications/notify.service";

/**
 * Notifications du Refuge — UN seul endroit décrit qui est prévenu, quand, avec quelle clé anti-doublon.
 *
 * Toutes passent par `notifyEvent` : notification INTERNE (historique du centre de notifications, toujours créée)
 * + PUSH (envoyé seulement si l'utilisateur l'autorise et a un appareil enregistré) ; l'application ouverte affiche
 * la notification interne et décide côté client d'une éventuelle bannière. Une ligne par (destinataire, clé) : rejouer
 * un événement (double envoi, nouvelle tentative, redémarrage) ne crée jamais de doublon.
 *
 * Confidentialité : aucun texte ne nomme une action, ni ce que le compagnon a choisi, ni ce que le parrain / la marraine a
 * deviné. Le compagnon n'apprend JAMAIS le score avant d'ouvrir le Refuge (animation de découverte).
 *
 * Ces fonctions ne lèvent jamais (notifyEvent ne lève pas) : elles ne doivent jamais faire échouer l'action métier.
 * Les appelants les lancent avec `void`, après la validation de l'écriture.
 */

const meta = (refugeSessionId: string) => ({ refugeSessionId });

/** Adoption → le COMPAGNON (jamais l'auteur de l'adoption). L'incarnation ne notifie personne. */
export function notifyAdopted(a: { refugeSessionId: string; companionId: string; sponsorId: string }) {
  return notifyEvent({
    recipientId: a.companionId,
    actorId: a.sponsorId,
    type: NotificationType.REFUGE_ADOPTED,
    meta: meta(a.refugeSessionId),
    dedupeKey: `refuge-adopted:${a.refugeSessionId}`,
  });
}

/** Le compagnon a validé ses deux actions du jour → le PARRAIN / la MARRAINE (rien sur les actions). */
export function notifyChoiceReady(a: { refugeSessionId: string; dayNumber: number; companionId: string; sponsorId: string }) {
  return notifyEvent({
    recipientId: a.sponsorId,
    actorId: a.companionId,
    type: NotificationType.REFUGE_CHOICE_READY,
    meta: meta(a.refugeSessionId),
    dedupeKey: `refuge-choice-ready:${a.refugeSessionId}:${a.dayNumber}`,
  });
}

/**
 * Le parrain / la marraine a validé sa réponse (jours 1 à 7).
 *   - le COMPAGNON est invité à découvrir le résultat (sans le score : pas de révélation prématurée) ;
 *   - le PARRAIN / la MARRAINE reçoit le score du jour (0/2, 1/2, 2/2) et ses pièces dans UNE seule notification.
 * La fin de l'aventure (dévoilement) n'est JAMAIS annoncée ici : elle l'est à l'expiration des 168 h (notifyRevealPhase).
 */
export function notifyGuessSubmitted(a: {
  refugeSessionId: string;
  dayNumber: number;
  companionId: string;
  sponsorId: string;
  sponsorGender: string | null;
  score: number;
  sponsorCoins: number;
}) {
  return Promise.all([
    // L'auteur reçoit SON résultat : pas d'actorId (la garde « jamais l'auteur » ne s'applique pas) ; blocage vérifié via counterpartId.
    notifyEvent({
      recipientId: a.sponsorId,
      counterpartId: a.companionId,
      type: NotificationType.REFUGE_DAY_RESULT,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-day-result:${a.refugeSessionId}:${a.dayNumber}`,
      textContext: { refugeScore: a.score, coinsDelta: a.sponsorCoins > 0 ? a.sponsorCoins : null },
    }),
    notifyEvent({
      recipientId: a.companionId,
      actorId: a.sponsorId,
      type: NotificationType.REFUGE_RESULT_READY,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-result-ready:${a.refugeSessionId}:${a.dayNumber}`,
      textContext: { sponsorGender: a.sponsorGender },
    }),
  ]);
}

/** Les sept jours (168 h) sont écoulés : le dévoilement est proposé aux DEUX participants, une seule fois par session. */
export function notifyRevealPhase(a: { refugeSessionId: string; companionId: string; sponsorId: string }) {
  return Promise.all([
    notifyEvent({
      recipientId: a.companionId,
      counterpartId: a.sponsorId,
      type: NotificationType.REFUGE_REVEAL_PHASE,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-reveal-phase:${a.refugeSessionId}`,
    }),
    notifyEvent({
      recipientId: a.sponsorId,
      counterpartId: a.companionId,
      type: NotificationType.REFUGE_REVEAL_PHASE,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-reveal-phase:${a.refugeSessionId}`,
    }),
  ]);
}

/** Nouvelle journée → le COMPAGNON peut choisir ses deux actions (émise par la tâche planifiée). */
export function notifyNewDay(a: { refugeSessionId: string; dayNumber: number; companionId: string; sponsorId: string }) {
  return notifyEvent({
    recipientId: a.companionId,
    counterpartId: a.sponsorId,
    type: NotificationType.REFUGE_NEW_DAY,
    meta: meta(a.refugeSessionId),
    dedupeKey: `refuge-new-day:${a.refugeSessionId}:${a.dayNumber}`,
  });
}

/**
 * Pièces EFFECTIVEMENT appliquées lors du règlement de journées incomplètes : au plus UNE notification par
 * participant et par règlement (plusieurs jours réglés ensemble = un seul message, total net). Rien si 0.
 * La clé dépend des jours réglés : chaque jour n'est réglé qu'une fois (unicité session + jour), donc jamais de doublon.
 */
export function notifyCoinsSettled(a: {
  refugeSessionId: string;
  days: readonly number[];
  companionId: string;
  sponsorId: string;
  companionApplied: number;
  sponsorApplied: number;
}) {
  const key = `refuge-coins:${a.refugeSessionId}:${[...a.days].sort((x, y) => x - y).join("-")}`;
  const one = (recipientId: string, counterpartId: string, applied: number) =>
    applied === 0
      ? Promise.resolve(null)
      : notifyEvent({
          recipientId,
          counterpartId,
          type: NotificationType.REFUGE_COINS,
          meta: meta(a.refugeSessionId),
          dedupeKey: key,
          textContext: { coinsDelta: applied },
        });
  return Promise.all([
    one(a.companionId, a.sponsorId, a.companionApplied),
    one(a.sponsorId, a.companionId, a.sponsorApplied),
  ]);
}

/** Dévoilement mutuel → les DEUX participants (celui qui vient d'accepter n'est pas l'« auteur » exclu : il reçoit aussi). */
export function notifyRevealed(a: { refugeSessionId: string; acceptedLastBy: string; otherId: string }) {
  return Promise.all([
    notifyEvent({
      recipientId: a.otherId,
      actorId: a.acceptedLastBy,
      type: NotificationType.REFUGE_REVEALED,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-revealed:${a.refugeSessionId}`,
    }),
    notifyEvent({
      recipientId: a.acceptedLastBy,
      counterpartId: a.otherId,
      type: NotificationType.REFUGE_REVEALED,
      meta: meta(a.refugeSessionId),
      dedupeKey: `refuge-revealed:${a.refugeSessionId}`,
    }),
  ]);
}

/** Refus du dévoilement → l'AUTRE participant uniquement. */
export function notifyRevealRefused(a: { refugeSessionId: string; refusedBy: string; otherId: string }) {
  return notifyEvent({
    recipientId: a.otherId,
    actorId: a.refusedBy,
    type: NotificationType.REFUGE_REVEAL_REFUSED,
    meta: meta(a.refugeSessionId),
    dedupeKey: `refuge-reveal-refused:${a.refugeSessionId}`,
  });
}

/** Expiration (session close faute d'avoir été menée jusqu'au bout) → les DEUX participants, une seule fois. */
export function notifyExpired(a: { refugeSessionId: string; companionId: string; sponsorId: string }) {
  const base = { type: NotificationType.REFUGE_EXPIRED, meta: meta(a.refugeSessionId), dedupeKey: `refuge-expired:${a.refugeSessionId}` };
  return Promise.all([
    notifyEvent({ ...base, recipientId: a.companionId, counterpartId: a.sponsorId }),
    notifyEvent({ ...base, recipientId: a.sponsorId, counterpartId: a.companionId }),
  ]);
}
