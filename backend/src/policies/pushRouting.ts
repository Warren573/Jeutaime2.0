/**
 * Correspondance CENTRALE entre un type de notification push, sa catégorie de
 * préférence, sa destination dans l'application et les seules données autorisées
 * dans la charge utile.
 *
 * Source de vérité unique : l'envoi (push.service), la construction des charges
 * (policies/notifications) et les tests s'appuient sur ce tableau. L'exhaustivité
 * est vérifiée à la compilation : ajouter une valeur à `NotificationType` sans
 * l'ajouter ici est une erreur de typage.
 *
 * Confidentialité : une charge push ne contient QUE `type` et les identifiants
 * strictement nécessaires à la navigation ci-dessous. Jamais d'identifiant
 * d'utilisateur, de pseudo, de montant ni de contenu.
 */
import type { NotificationType } from "@prisma/client";

/** Interrupteurs de catégorie de `UserSettings` (le réglage général `notifPush` est traité à part). */
export type PushCategory =
  | "notifMeetings"
  | "notifLetters"
  | "notifSalons"
  | "notifActivities"
  | "notifNews";

/** Seuls identifiants de navigation autorisés dans une charge push. */
export type PushDataKey = "matchId" | "salonId";

/** Types de push qui n'ont pas d'équivalent dans l'énumération `NotificationType`. */
export type ExtraPushKind = "BOTTLE_REPLY" | "DAILY_EDITION";
export type PushKind = NotificationType | ExtraPushKind;

export interface PushTypeConfig {
  /** Interrupteur de catégorie à respecter ; null = seulement le réglage général. */
  category: PushCategory | null;
  /** Destination dans l'application (documentaire : la navigation est faite par l'application). */
  destination: string | null;
  /** Identifiants de routage autorisés dans `data`, en plus de `type`. */
  dataKeys: readonly PushDataKey[];
}

export const PUSH_TYPE_CONFIG: Record<PushKind, PushTypeConfig> = {
  LETTER_RECEIVED: { category: "notifLetters", destination: "/match-profile", dataKeys: ["matchId"] },
  MATCH_CREATED: { category: "notifMeetings", destination: "/match-profile", dataKeys: ["matchId"] },
  QUESTIONS_PASSED: { category: "notifMeetings", destination: "/match-profile", dataKeys: ["matchId"] },
  // Le match est rompu : aucune destination, l'identifiant reste dans la charge (compatibilité).
  QUESTIONS_FAILED: { category: "notifMeetings", destination: null, dataKeys: ["matchId"] },
  OFFERING_RECEIVED: { category: "notifActivities", destination: "/salon", dataKeys: ["salonId"] },
  MAGIE_RECEIVED: { category: "notifSalons", destination: "/salon", dataKeys: ["salonId"] },
  MAGIE_BROKEN: { category: "notifSalons", destination: null, dataKeys: [] },
  PRIVATE_SALON_INVITE: { category: "notifSalons", destination: "/private-salons", dataKeys: [] },
  ADMIN_MESSAGE: { category: null, destination: "/admin-messages", dataKeys: [] },
  PREMIUM_SUBSCRIBED: { category: null, destination: "/premium", dataKeys: [] },
  PREMIUM_CANCELLED: { category: null, destination: "/premium", dataKeys: [] },
  SECURITY_ALERT: { category: null, destination: "/security", dataKeys: [] },
  BOTTLE_REPLY: { category: "notifLetters", destination: "/bottles-main", dataKeys: [] },
  DAILY_EDITION: { category: "notifNews", destination: "/journal", dataKeys: [] },
};

function configFor(type: unknown): PushTypeConfig | null {
  return typeof type === "string" && Object.prototype.hasOwnProperty.call(PUSH_TYPE_CONFIG, type)
    ? PUSH_TYPE_CONFIG[type as PushKind]
    : null;
}

/** Catégorie de préférence d'un type de push ; null si le type est inconnu ou sans catégorie. */
export function pushCategoryFor(type: unknown): PushCategory | null {
  return configFor(type)?.category ?? null;
}

/** Destination documentaire d'un type de push ; null si inconnue. */
export function pushDestinationFor(type: unknown): string | null {
  return configFor(type)?.destination ?? null;
}

/**
 * Filtre `meta` pour ne garder que les identifiants de navigation autorisés
 * pour ce type. Les valeurs non textuelles ou vides sont ignorées.
 */
export function pickPushData(type: PushKind, meta?: Record<string, unknown> | null): Record<string, string> {
  const data: Record<string, string> = { type };
  for (const key of PUSH_TYPE_CONFIG[type].dataKeys) {
    const value = meta?.[key];
    if (typeof value === "string" && value.length > 0) data[key] = value;
  }
  return data;
}
