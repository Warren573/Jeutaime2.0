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
import { pickPushData } from "./pushRouting";

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
  return "Vos sourires sont réciproques ! Place au jeu des 3 questions";
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

// ============================================================
// Duels : texte personnalisé avec le pseudo de l'ADVERSAIRE
// ============================================================
export type DuelOutcome = "WIN" | "LOSE" | "DRAW";

/**
 * Contexte de mise en forme d'un texte de notification. Seules ces valeurs structurées sont acceptées
 * (jamais un texte libre fourni par l'appelant) ; elles sont assainies ici, puis insérées dans un gabarit fixe.
 */
export interface NotificationTextContext {
  /** Pseudo de l'AUTRE participant du duel (jamais celui du destinataire). */
  opponentPseudo?: string | null;
  /** Issue d'un duel du point de vue du DESTINATAIRE (types DUEL_RESULT uniquement). */
  duelOutcome?: DuelOutcome | null;
  /** Genre du parrain / de la marraine (HOMME, FEMME, autre) : choisit « parrain » ou « marraine » (Refuge, vers le compagnon). */
  sponsorGender?: string | null;
  /** Score du jour du Refuge : 0, 1 ou 2 (REFUGE_DAY_RESULT). Ne dit jamais QUELLES actions étaient les bonnes. */
  refugeScore?: number | null;
  /** Variation de pièces EFFECTIVEMENT appliquée, signée (REFUGE_DAY_RESULT, REFUGE_COINS). */
  coinsDelta?: number | null;
  /** Petite attention envoyée (REFUGE_ATTENTION) : GRATTER_TETE, CARESSE ou BONJOUR. */
  attentionKind?: string | null;
}

/** Fin de phrase de chaque petite attention (« … est passé te gratter la tête »). */
const ATTENTION_GESTURES: Record<string, string> = {
  GRATTER_TETE: "te gratter la tête",
  CARESSE: "te faire une caresse",
  BONJOUR: "te dire bonjour",
};

const PSEUDO_MAX_LENGTH = 30;

/**
 * Pseudo prêt à être inséré dans un texte : sans caractère de contrôle, de formatage ni de sens d'écriture
 * (U+202E…), espaces normalisés, 30 caractères au plus. `null` si rien d'utilisable (repli sur le texte générique).
 */
export function sanitizePseudoForText(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const cleaned = raw
    .normalize("NFC")
    .replace(/[\p{C}\p{Zl}\p{Zp}\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const cut = Array.from(cleaned).slice(0, PSEUDO_MAX_LENGTH).join("").trim();
  return cut.length > 0 ? cut : null;
}

/** Texte d'un duel avec pseudo, ou `null` pour retomber sur le texte générique. */
function buildDuelMessage(type: NotificationType, ctx?: NotificationTextContext): string | null {
  const pseudo = sanitizePseudoForText(ctx?.opponentPseudo);
  if (!pseudo) return null;
  switch (type) {
    case NotificationType.DUEL_RECEIVED:
      return `${pseudo} t'a défié(e) en duel !`;
    case NotificationType.DUEL_RESULT:
      if (ctx?.duelOutcome === "WIN") return `Tu as remporté ton duel contre ${pseudo} !`;
      if (ctx?.duelOutcome === "LOSE") return `${pseudo} a remporté votre duel !`;
      if (ctx?.duelOutcome === "DRAW") return `Match nul contre ${pseudo} !`;
      return null;
    case NotificationType.DUEL_DECLINED:
      return `${pseudo} a décliné ton défi.`;
    case NotificationType.DUEL_EXPIRED:
      return `Ton défi contre ${pseudo} a expiré.`;
    default:
      return null;
  }
}

// ============================================================
// Refuge : textes quotidiens et de fin de partie
// Jamais le nom d'une action, jamais ce que le compagnon a choisi ni ce que le parrain / la marraine a deviné.
// ============================================================

/** « parrain » / « marraine » selon le genre ; formulation double si le genre n'est pas binaire ou inconnu. */
export function sponsorTitle(gender: unknown): { possessive: string; noun: string } {
  if (gender === "HOMME") return { possessive: "Ton", noun: "parrain" };
  if (gender === "FEMME") return { possessive: "Ta", noun: "marraine" };
  return { possessive: "Ton", noun: "parrain ou ta marraine" };
}

function pieces(n: number): string {
  return n === 1 ? "1 pièce" : `${n} pièces`;
}

function validCoins(raw: unknown): number | null {
  return typeof raw === "number" && Number.isInteger(raw) && raw !== 0 && Math.abs(raw) <= 100000 ? raw : null;
}

/** Texte contextuel du Refuge, ou `null` pour retomber sur le texte générique du type. */
function buildRefugeMessage(type: NotificationType, ctx?: NotificationTextContext): string | null {
  switch (type) {
    case NotificationType.REFUGE_RESULT_READY: {
      const t = sponsorTitle(ctx?.sponsorGender);
      return `${t.possessive} ${t.noun} a validé ses actions : découvre le résultat du jour.`;
    }
    case NotificationType.REFUGE_DAY_RESULT: {
      const score = ctx?.refugeScore;
      if (score !== 0 && score !== 1 && score !== 2) return null;
      const base = score === 2 ? "Résultat du jour : 2/2, bravo !" : `Résultat du jour : ${score}/2.`;
      const coins = validCoins(ctx?.coinsDelta);
      return coins && coins > 0 ? `${base} +${pieces(coins)}.` : base;
    }
    case NotificationType.REFUGE_ATTENTION: {
      const gesture = ATTENTION_GESTURES[String(ctx?.attentionKind ?? "")];
      if (!gesture) return null;
      // Aucun pseudo : seulement le rôle (anonymat). « passé » / « passée » selon le genre ; formulation double sinon.
      if (ctx?.sponsorGender === "HOMME") return `Ton parrain est passé ${gesture}.`;
      if (ctx?.sponsorGender === "FEMME") return `Ta marraine est passée ${gesture}.`;
      return `Ton parrain ou ta marraine est passé(e) ${gesture}.`;
    }
    case NotificationType.REFUGE_COINS: {
      const coins = validCoins(ctx?.coinsDelta);
      if (!coins) return null;
      return coins > 0
        ? `Refuge : +${pieces(coins)} ajoutée${coins > 1 ? "s" : ""} à ton solde.`
        : `Refuge : ${pieces(-coins)} retirée${coins < -1 ? "s" : ""} de ton solde.`;
    }
    default:
      return null;
  }
}

/**
 * Dispatcher centralisé : prend un type et retourne le message FR.
 * Utilisé par le service (create) et par les handlers d'events.
 * `ctx` n'a d'effet que pour les 4 types de duel ; tous les autres types l'ignorent.
 */
export function buildNotificationMessage(type: NotificationType, ctx?: NotificationTextContext): string {
  const personalized = buildDuelMessage(type, ctx) ?? buildRefugeMessage(type, ctx);
  if (personalized) return personalized;
  switch (type) {
    case NotificationType.LETTER_RECEIVED:
      return buildLetterReceivedMessage();
    case NotificationType.MATCH_CREATED:
      return buildMatchCreatedMessage();
    case NotificationType.QUESTIONS_PASSED:
      return "Le jeu des 3 questions est réussi ! Vous pouvez échanger des lettres";
    case NotificationType.QUESTIONS_FAILED:
      return "Le jeu des 3 questions est terminé : la correspondance n'a pas été retenue";
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
    case NotificationType.ADMIN_MESSAGE:
      return "Tu as reçu un message de l’administration JeuTaime";
    case NotificationType.PRIVATE_SALON_INVITE:
      return "Tu as été invité dans un salon privé";
    case NotificationType.SECURITY_ALERT:
      return "Une action de sécurité a eu lieu sur ton compte";
    // ── Phase 2 : textes génériques (repli des duels sans pseudo), jamais de contenu ni de montant ─────
    case NotificationType.DUEL_RECEIVED:
      return "Tu as été défié(e) en duel";
    case NotificationType.DUEL_RESULT:
      return "Le résultat de ton duel est disponible";
    case NotificationType.DUEL_DECLINED:
      return "Ton duel a été décliné";
    case NotificationType.DUEL_EXPIRED:
      return "Ton duel a expiré";
    case NotificationType.BOTTLE_REPLY:
      return "Tu as un nouveau message dans ta bouteille à la mer";
    case NotificationType.BOTTLE_REVEAL_REQUEST:
      return "Ton correspondant mystère souhaite se dévoiler";
    case NotificationType.BOTTLE_REVEAL_ACCEPTED:
      return "Dévoilement accepté : une correspondance est ouverte";
    case NotificationType.BOTTLE_REVEAL_REFUSED:
      return "Ta demande de dévoilement n'a pas été acceptée";
    case NotificationType.QUESTIONS_TURN:
      return "C'est à toi de répondre aux 3 questions";
    case NotificationType.REFUGE_ADOPTED:
      return "Tu as été adopté ! Ton aventure de sept jours commence.";
    case NotificationType.REFUGE_CHOICE_READY:
      return "Ton compagnon attend tes deux actions du jour.";
    case NotificationType.REFUGE_RESULT_READY:
      return "Ton parrain ou ta marraine a validé ses actions : découvre le résultat du jour.";
    case NotificationType.REFUGE_DAY_RESULT:
      return "Le résultat du jour est disponible.";
    case NotificationType.REFUGE_NEW_DAY:
      return "Une nouvelle journée commence : tu peux choisir tes deux actions.";
    case NotificationType.REFUGE_COINS:
      return "Ton solde de pièces a changé après ton refuge.";
    case NotificationType.REFUGE_REVEAL_REFUSED:
      return "Votre refuge se termine sans dévoilement. D'autres rencontres vous attendent.";
    case NotificationType.REFUGE_EXPIRED:
      return "Votre refuge est terminé : le temps imparti est écoulé.";
    case NotificationType.REFUGE_ATTENTION:
      return "Ton parrain ou ta marraine est passé(e) te rendre visite.";
    case NotificationType.REFUGE_REVEAL_PHASE:
      return "Ton refuge arrive à son terme : choisis de te dévoiler ou non";
    case NotificationType.REFUGE_REVEALED:
      return "Vos profils sont dévoilés";
    case NotificationType.REPORT_PROCESSED:
      return "Ton signalement a été examiné";
    case NotificationType.ACCOUNT_RESTORED:
      return "Ton compte est de nouveau actif";
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
  "adminMessageId",
  "privateSalonSessionId",
  // Phase 2 : identifiants de routage uniquement (jamais affichés, jamais de contenu).
  "duelId",
  "bottleId",
  "refugeSessionId",
  "reportId",
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

// ============================================================
// Push payload builders
// title/body courts pour FCM/APNS via Expo.
// data = IDs de routage — jamais de montants.
// ============================================================

export interface PushPayload {
  title: string;
  body: string;
  data: Record<string, string>;
}

export function buildPushPayload(
  type: NotificationType,
  meta?: NotificationMeta | null,
  ctx?: NotificationTextContext,
): PushPayload {
  // Charge minimale : `type` + identifiants de navigation autorisés (policies/pushRouting.ts).
  // Jamais d'identifiant d'utilisateur, de nom de salon ni de sujet de message.
  const data = pickPushData(type, meta);

  switch (type) {
    case NotificationType.LETTER_RECEIVED:
      return { title: "💌 JeuTaime", body: "Tu as reçu une nouvelle lettre", data };
    case NotificationType.MATCH_CREATED:
      return { title: "💘 JeuTaime", body: "Vos sourires sont réciproques ! Place au jeu des 3 questions", data };
    case NotificationType.QUESTIONS_PASSED:
      return { title: "JeuTaime", body: "Les 3 questions sont réussies ! Les lettres sont débloquées", data };
    case NotificationType.QUESTIONS_FAILED:
      return { title: "JeuTaime", body: "Le jeu des 3 questions est terminé", data };
    case NotificationType.OFFERING_RECEIVED:
      return { title: "🎁 JeuTaime", body: "Quelqu'un vient de t'offrir quelque chose", data };
    case NotificationType.MAGIE_RECEIVED:
      return { title: "✨ JeuTaime", body: "Un sort vient d'être lancé sur toi", data };
    case NotificationType.ADMIN_MESSAGE:
      return { title: "JeuTaime · Administration", body: "Tu as reçu un message de l’administration", data };
    case NotificationType.PRIVATE_SALON_INVITE:
      return { title: "JeuTaime · Invitation", body: "Tu as été invité dans un salon privé", data };
    case NotificationType.REFUGE_ATTENTION:
      return { title: "Ne m’oublie pas !", body: buildNotificationMessage(type, ctx), data };
    case NotificationType.BOTTLE_REPLY:
    case NotificationType.BOTTLE_REVEAL_REQUEST:
    case NotificationType.BOTTLE_REVEAL_ACCEPTED:
    case NotificationType.BOTTLE_REVEAL_REFUSED:
      return { title: "Bouteille à la mer", body: buildNotificationMessage(type), data };
    default:
      // Duels : le corps est le MÊME texte que l'historique (pseudo de l'adversaire) ; `data` ne contient
      // jamais de pseudo. Les autres types ignorent `ctx`.
      return { title: "JeuTaime", body: buildNotificationMessage(type, ctx), data };
  }
}
