/**
 * Logique pure pour les Magies / Rituels.
 *
 * Aucune dépendance Prisma : seule la forme minimale des entrées est
 * requise via des types locaux. Testable unitairement sans DB.
 *
 * Distinction fondamentale :
 *   - Sort (spell)      : durationSec > 0, breakConditionId défini.
 *                         Se lance via POST /api/magies/cast.
 *   - Anti-sort         : durationSec === 0, breakConditionId null.
 *                         Sert uniquement à casser un sort actif
 *                         (POST /api/magies/:id/break).
 */
import { BadRequestError } from "../core/errors";
import { BREAK_CONDITION_TO_ANTISPELL } from "../modules/magies/magies.constants";

// ============================================================
// Types minimaux — volontairement structural typing
// ============================================================

export interface CastLike {
  brokenAt: Date | null;
  expiresAt: Date;
}

export interface CatalogLike {
  enabled: boolean;
  durationSec: number;
}

// ============================================================
// isMagieActive
// ============================================================

/**
 * Une magie est ACTIVE si et seulement si :
 *   - elle n'a jamais été cassée (brokenAt === null)
 *   - ET son expiresAt est STRICTEMENT dans le futur (> now)
 *
 * La borne est stricte : une magie pile à `expiresAt === now` est
 * considérée comme expirée.
 */
export function isMagieActive(cast: CastLike, now: Date): boolean {
  if (cast.brokenAt !== null) return false;
  return cast.expiresAt.getTime() > now.getTime();
}

// ============================================================
// computeMagieExpiry
// ============================================================

/**
 * Calcule la date d'expiration d'une magie à partir de son instant de
 * cast et de sa durée en secondes.
 *
 * @throws BadRequestError si durationSec <= 0 (les sorts doivent
 *         avoir une durée > 0 — les anti-sorts ne sont jamais castés
 *         via ce chemin)
 */
export function computeMagieExpiry(castAt: Date, durationSec: number): Date {
  if (!Number.isInteger(durationSec) || durationSec <= 0) {
    throw new BadRequestError("Durée de magie invalide");
  }
  return new Date(castAt.getTime() + durationSec * 1000);
}

// ============================================================
// assertCastableSpell — vérifie qu'un catalog peut être casté comme sort
// ============================================================

export function assertCastableSpell(catalog: CatalogLike): void {
  if (!catalog.enabled) {
    throw new BadRequestError("Cette magie est désactivée");
  }
  if (catalog.durationSec <= 0) {
    throw new BadRequestError(
      "Ce sort n'est pas castable (anti-sort à utiliser via /break)",
    );
  }
}

// ============================================================
// assertValidAntiSpell — vérifie qu'un catalog est bien un anti-sort
// ============================================================

export function assertValidAntiSpell(catalog: CatalogLike): void {
  if (!catalog.enabled) {
    throw new BadRequestError("Cet anti-sort est désactivé");
  }
  if (catalog.durationSec !== 0) {
    throw new BadRequestError(
      "Cet id n'est pas un anti-sort (durée non nulle)",
    );
  }
}

// ============================================================
// assertCanBreakMagie — le cast ciblé doit être effectivement actif
// ============================================================

export function assertCanBreakMagie(cast: CastLike, now: Date): void {
  if (cast.brokenAt !== null) {
    throw new BadRequestError("Cette magie est déjà brisée");
  }
  if (cast.expiresAt.getTime() <= now.getTime()) {
    throw new BadRequestError("Cette magie est déjà expirée");
  }
}

// ============================================================
// assertAntiSpellBreaksCondition — l'anti-sort doit matcher la cond.
// ============================================================

/**
 * Vérifie qu'un anti-sort est bien celui attendu pour satisfaire le
 * `breakConditionId` d'un sort.
 *
 * @throws BadRequestError si la condition ne peut pas être matchée
 *         ou si l'anti-sort fourni n'est pas le bon
 */
export function assertAntiSpellBreaksCondition(
  spellBreakConditionId: string | null,
  antiSpellId: string,
): void {
  if (!spellBreakConditionId) {
    throw new BadRequestError(
      "Ce sort n'a pas de condition de rupture — il doit expirer",
    );
  }
  const expected = BREAK_CONDITION_TO_ANTISPELL[spellBreakConditionId];
  if (!expected) {
    throw new BadRequestError(
      `Condition de rupture inconnue : ${spellBreakConditionId}`,
    );
  }
  if (expected !== antiSpellId) {
    throw new BadRequestError(
      `Cet anti-sort ne casse pas ce sort (attendu : ${expected})`,
    );
  }
}

// ============================================================
// assertNotSelfCast — interdiction de se caster un sort à soi-même
// ============================================================

export function assertNotSelfCast(
  actorId: string,
  targetId: string,
): void {
  if (actorId === targetId) {
    throw new BadRequestError(
      "Tu ne peux pas te lancer un sort à toi-même",
    );
  }
}
