/**
 * Helpers purs pour la logique d'accès photos.
 * Aucune dépendance à Prisma : permet des tests unitaires rapides et
 * garantit que la logique d'autorisation reste isolée.
 */
import { isPhotoUnlocked } from "../../policies/photoUnlock";

export type PhotoVariant = "original" | "blurred";

export type PhotoAccessReason =
  | "OWNER"
  | "NO_BLOCK_BLURRED"
  | "UNLOCKED"
  | "BLOCKED"
  | "NO_MATCH_FOR_ORIGINAL"
  | "NOT_UNLOCKED";

export interface PhotoAccessContext {
  viewerId: string;
  ownerId: string;
  variant: PhotoVariant;
  viewerIsPremium: boolean;
  /** Vrai s'il existe un Block dans un sens ou l'autre */
  hasBlock: boolean;
  /** Match entre les deux users, null s'il n'existe pas */
  match: {
    userAId: string;
    letterCountA: number;
    letterCountB: number;
  } | null;
}

export interface PhotoAccessResult {
  allowed: boolean;
  reason: PhotoAccessReason;
}

/**
 * Résout l'autorisation d'accès à une photo donnée.
 *
 * Règles :
 * 1. Le propriétaire voit toujours ses propres photos (toute variante)
 * 2. Un blocage (dans un sens ou l'autre) refuse tout accès
 * 3. Variante "blurred" : accessible en l'absence de blocage
 * 4. Variante "original" : requiert un match ET isPhotoUnlocked()
 */
export function resolvePhotoAccess(ctx: PhotoAccessContext): PhotoAccessResult {
  const { viewerId, ownerId, variant, viewerIsPremium, hasBlock, match } = ctx;

  // 1. Owner : accès total
  if (viewerId === ownerId) {
    return { allowed: true, reason: "OWNER" };
  }

  // 2. Blocage : refus total (même blurred)
  if (hasBlock) {
    return { allowed: false, reason: "BLOCKED" };
  }

  // 3. Blurred : accessible tant qu'il n'y a pas de blocage
  if (variant === "blurred") {
    return { allowed: true, reason: "NO_BLOCK_BLURRED" };
  }

  // 4. Original : requiert un match existant
  if (!match) {
    return { allowed: false, reason: "NO_MATCH_FOR_ORIGINAL" };
  }

  const myLetterCount =
    match.userAId === viewerId ? match.letterCountA : match.letterCountB;
  const otherLetterCount =
    match.userAId === viewerId ? match.letterCountB : match.letterCountA;

  const unlocked = isPhotoUnlocked({
    myLetterCount,
    otherLetterCount,
    viewerIsPremium,
  });

  return unlocked
    ? { allowed: true, reason: "UNLOCKED" }
    : { allowed: false, reason: "NOT_UNLOCKED" };
}

// ============================================================
// Promotion primary après suppression
// ============================================================

export interface PhotoForOrdering {
  id: string;
  position: number;
  createdAt: Date;
}

/**
 * Sélectionne de manière déterministe la prochaine photo à promouvoir
 * en primary après la suppression de l'ancienne.
 *
 * Ordre de tri :
 *   1. position ASC
 *   2. createdAt ASC (égalité position)
 *   3. id ASC (égalité parfaite — les cuid sont lex-sortables)
 *
 * Le tri `id` en dernier recours garantit un résultat identique pour
 * n'importe quel ordre d'entrée (stabilité sur collisions).
 *
 * Retourne null si le tableau est vide.
 */
export function pickNextPrimary<T extends PhotoForOrdering>(
  photos: readonly T[],
): T | null {
  if (photos.length === 0) return null;
  const sorted = [...photos].sort((a, b) => {
    if (a.position !== b.position) return a.position - b.position;
    const aTime = a.createdAt.getTime();
    const bTime = b.createdAt.getTime();
    if (aTime !== bTime) return aTime - bTime;
    if (a.id < b.id) return -1;
    if (a.id > b.id) return 1;
    return 0;
  });
  return sorted[0] ?? null;
}
