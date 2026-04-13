/**
 * Logique pure pour les Offerings (cadeaux).
 *
 * Aucune dépendance Prisma : types structurels uniquement. Testable
 * unitairement sans DB.
 *
 * Règles clés :
 *   - Un offering a optionnellement une durationMs (cadeau symbolique).
 *     Si durationMs est null/undefined, l'offering ne s'expire jamais
 *     (il reste visible à vie dans la liste des cadeaux reçus).
 *   - Un offering peut être restreint à un salon précis via
 *     `salonOnly: SalonKind` — il est alors uniquement envoyable
 *     depuis ce type de salon.
 */
import { SalonKind } from "@prisma/client";
import { BadRequestError, NotFoundError } from "../core/errors";

// ============================================================
// Types minimaux — structural typing
// ============================================================

export interface OfferingCatalogLike {
  enabled: boolean;
  durationMs: number | null;
  salonOnly: SalonKind | null;
}

export interface OfferingSentLike {
  expiresAt: Date | null;
}

export interface SalonLike {
  isActive: boolean;
  kind: SalonKind;
}

// ============================================================
// assertOfferingUsable
// ============================================================

/**
 * Un offering est envoyable si son entrée catalog est `enabled`.
 * Si désactivé, on le traite comme inexistant côté produit.
 *
 * @throws NotFoundError si désactivé (on ne révèle pas la distinction
 *         "existe mais off" → les offerings désactivés n'apparaissent
 *         même pas dans le catalog public)
 */
export function assertOfferingUsable(
  catalog: Pick<OfferingCatalogLike, "enabled">,
): void {
  if (!catalog.enabled) {
    throw new NotFoundError("Offering");
  }
}

// ============================================================
// assertSalonOnlyRespected
// ============================================================

/**
 * Vérifie la cohérence entre `catalog.salonOnly` et le salon fourni
 * par le client.
 *
 * Règles :
 *   - Si `salonOnly === null` : le cadeau peut être envoyé sans
 *     contrainte de salon. `providedSalon` peut être null OU un salon
 *     valide (envoi depuis un salon quelconque → permis).
 *   - Si `salonOnly !== null` : le client DOIT fournir un salon, et
 *     ce salon doit avoir `kind === catalog.salonOnly`.
 *
 * @throws BadRequestError si incohérence
 */
export function assertSalonOnlyRespected(
  catalogSalonOnly: SalonKind | null,
  providedSalon: SalonLike | null,
): void {
  if (catalogSalonOnly === null) {
    // Aucune contrainte — tout est bon.
    return;
  }
  if (!providedSalon) {
    throw new BadRequestError(
      `Ce cadeau ne peut être envoyé que depuis un salon ${catalogSalonOnly}`,
    );
  }
  if (providedSalon.kind !== catalogSalonOnly) {
    throw new BadRequestError(
      `Ce cadeau ne peut être envoyé que depuis un salon ${catalogSalonOnly} (reçu : ${providedSalon.kind})`,
    );
  }
}

// ============================================================
// computeOfferingExpiry
// ============================================================

/**
 * Calcule la date d'expiration d'un offering.
 *
 * - `durationMs === null` → pas d'expiration (retourne null)
 * - `durationMs > 0` (entier) → sentAt + durationMs
 * - Tout autre cas → BadRequestError
 *
 * Note : on accepte des millisecondes (alignement sur le schéma
 * Prisma `OfferingCatalog.durationMs`), contrairement aux magies qui
 * raisonnent en secondes.
 */
export function computeOfferingExpiry(
  sentAt: Date,
  durationMs: number | null,
): Date | null {
  if (durationMs === null) return null;
  if (!Number.isInteger(durationMs) || durationMs <= 0) {
    throw new BadRequestError("Durée d'offering invalide");
  }
  return new Date(sentAt.getTime() + durationMs);
}

// ============================================================
// isOfferingActive
// ============================================================

/**
 * Un offering est ACTIF si :
 *   - expiresAt est null (cadeau permanent), OU
 *   - expiresAt est STRICTEMENT dans le futur (> now)
 *
 * La borne est stricte : un offering pile à `expiresAt === now` est
 * considéré comme expiré.
 */
export function isOfferingActive(
  offering: OfferingSentLike,
  now: Date,
): boolean {
  if (offering.expiresAt === null) return true;
  return offering.expiresAt.getTime() > now.getTime();
}

// ============================================================
// assertNotSelfOffering
// ============================================================

/**
 * Interdit d'envoyer un cadeau à soi-même (abus anti-farm).
 *
 * @throws BadRequestError si actor === target
 */
export function assertNotSelfOffering(
  fromUserId: string,
  toUserId: string,
): void {
  if (fromUserId === toUserId) {
    throw new BadRequestError(
      "Tu ne peux pas t'envoyer un cadeau à toi-même",
    );
  }
}
