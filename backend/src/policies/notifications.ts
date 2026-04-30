/**
 * Policy pure pour les notifications in-app.
 * Aucune dépendance Prisma — testable unitairement.
 *
 * Règles :
 *   - Les messages sont générés côté backend, en FR, à partir du type.
 *   - Le meta ne contient QUE des IDs de routage et (éventuellement)
 *     fromUserId / otherUserId. Jamais de montants ni de données
 *     sensibles.
 *   - assertNotificationOwnership protège toute mutation/lecture :
 *     un user ne peut toucher que ses propres notifications.
 */
import { NotificationType } from "@prisma/client";
import { ForbiddenError } from "../core/errors";

// ============================================================
// Ownership
// ============================================================

/**
 * Empêche un user d'accéder/modifier une notification qui ne lui
 * appartient pas. Utilisé dans les endpoints `mark read` / `delete`.
 *
 * @throws ForbiddenError 403 si l'ownership est violé
 */
export function assertNotificationOwnership(
  ownerId: string,
  requesterId: string,
): void {
  if (ownerId !== requesterId) {
    throw new ForbiddenError("Tu ne peux pas accéder à cette notification");
  }
}

// ============================================================
// Message builders
// Chaque builder retourne un texte court FR.
// Les IDs fournis sont utilisés UNIQUEMENT pour le routage meta,
// jamais interpolés dans le message (les pseudos sont côté client).
// ============================================================

export function buildLetterReceivedMessage(): string {
  return "Tu as reçu une nouvelle lettre";
}

export function buildMatchCreatedMessage(): string {
  return "Tu as un nouveau match";
}

export function buildOfferingReceivedMessage(): string {
  return "Quelqu'un vient de t'offrir quelque chose";
}

export function buildMagieReceivedMessage(): string {
  return "Un sort vient d'être lancé sur toi";
}

export function buildMagieBrokenMessage(): string {
  return "Le sort qui pesait sur toi a été brisé";
}

export function buildPremiumSubscribedMessage(): string {
  return "Ton abonnement Premium est actif";
}

export function buildPremiumCancelledMessage(): string {
  return "Ton abonnement Premium a été annulé";
}

/**
 * Dispatcher centralisé : prend un type et retourne le message FR.
 * Utilisé par le service (create) et par les handlers d'events.
 */
export function buildNotificationMessage(type: NotificationType): string {
  switch (type) {
    case NotificationType.LETTER_RECEIVED:
      return buildLetterReceivedMessage();
    case NotificationType.MATCH_CREATED:
      return buildMatchCreatedMessage();
    case NotificationType.OFFERING_RECEIVED:
      return buildOfferingReceivedMessage();
    case NotificationType.MAGIE_RECEIVED:
      return buildMagieReceivedMessage();
    case NotificationType.MAGIE_BROKEN:
      return buildMagieBrokenMessage();
    case NotificationType.PREMIUM_SUBSCRIBED:
      return buildPremiumSubscribedMessage();
    case NotificationType.PREMIUM_CANCELLED:
      return buildPremiumCancelledMessage();
  }
}

// ============================================================
// Meta sanitization
// Whitelist stricte des clés autorisées dans meta, pour se protéger
// contre toute fuite accidentelle d'info sensible (coins, details de
// report, adresse, etc.) passée par erreur par un handler.
// ============================================================

/** Clés autorisées dans meta — strictement des identifiants de routage. */
export const ALLOWED_META_KEYS = [
  "matchId",
  "fromUserId",
  "otherUserId",
  "offeringSentId",
  "offeringId",
  "magieCastId",
  "magieId",
  "salonId",
] as const;

export type AllowedMetaKey = (typeof ALLOWED_META_KEYS)[number];

export type NotificationMeta = Partial<Record<AllowedMetaKey, string>>;

/**
 * Filtre un objet meta pour ne garder que les clés whitelistées.
 * Les valeurs non-string sont ignorées (par sécurité : on ne veut
 * surtout pas persister un Number qui pourrait être un montant).
 */
export function sanitizeNotificationMeta(
  meta: Record<string, unknown> | null | undefined,
): NotificationMeta | null {
  if (!meta) return null;
  const out: NotificationMeta = {};
  for (const key of ALLOWED_META_KEYS) {
    const value = meta[key];
    if (typeof value === "string" && value.length > 0) {
      out[key] = value;
    }
  }
  return Object.keys(out).length > 0 ? out : null;
}
