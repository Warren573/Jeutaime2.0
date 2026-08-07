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
import { isTestMode } from "../core/testMode";

export interface CastLike {
  brokenAt: Date | null;
  expiresAt: Date;
}

export interface CatalogLike {
  enabled: boolean;
  durationSec: number;
}

export function isMagieActive(cast: CastLike, now: Date): boolean {
  if (cast.brokenAt !== null) return false;
  return cast.expiresAt.getTime() > now.getTime();
}

export function computeMagieExpiry(castAt: Date, durationSec: number): Date {
  if (!Number.isInteger(durationSec) || durationSec <= 0) {
    throw new BadRequestError("Durée de magie invalide");
  }
  return new Date(castAt.getTime() + durationSec * 1000);
}

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

export function assertCanBreakMagie(cast: CastLike, now: Date): void {
  if (cast.brokenAt !== null) {
    throw new BadRequestError("Cette magie est déjà brisée");
  }
  if (cast.expiresAt.getTime() <= now.getTime()) {
    throw new BadRequestError("Cette magie est déjà expirée");
  }
}

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

/**
 * Interdit de se lancer un sort à soi-même.
 * L'exception n'est permise qu'en mode test, lui-même impossible en production.
 */
export function assertNotSelfCast(
  actorId: string,
  targetId: string,
): void {
  if (actorId === targetId && !isTestMode()) {
    throw new BadRequestError(
      "Tu ne peux pas te lancer un sort à toi-même",
    );
  }
}
