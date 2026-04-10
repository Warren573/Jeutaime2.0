import { addDays, differenceInDays } from "../core/utils/dateUtils";
import { GHOST_DAYS, GHOST_RELANCE_MAX_DAYS } from "../config/constants";
import { GhostRelanceError } from "../core/errors";

export interface GhostContext {
  lastLetterAt: Date | null;
  lastLetterBy: string | null;
  /** userId de celui qui souhaite faire une relance */
  relancingUserId: string;
  ghostRelanceUsedBy: string | null;
  now?: Date;
}

/**
 * Vérifie si le match est en état de ghosting.
 * Ghosting = dernière lettre envoyée il y a ≥ GHOST_DAYS jours
 * et ce n'est pas l'expéditeur qui attend (il attend la réponse).
 */
export function isGhosting(ctx: GhostContext): boolean {
  if (!ctx.lastLetterAt) return false;
  const now = ctx.now ?? new Date();
  return differenceInDays(now, ctx.lastLetterAt) >= GHOST_DAYS;
}

/**
 * Valide si la relance anti-ghosting est possible.
 * Conditions :
 * 1. Dernier expéditeur = l'autre (pas soi-même)
 * 2. Il y a au moins GHOST_DAYS jours sans réponse
 * 3. Pas dépassé GHOST_RELANCE_MAX_DAYS depuis le dernier échange
 * 4. L'utilisateur n'a pas déjà utilisé sa relance dans ce match
 *
 * Lance GhostRelanceError si non autorisé.
 */
export function assertCanRelance(ctx: GhostContext): void {
  if (!ctx.lastLetterAt) {
    throw new GhostRelanceError("Aucun échange en cours dans cette relation");
  }

  const now = ctx.now ?? new Date();
  const daysSinceLast = differenceInDays(now, ctx.lastLetterAt);

  if (ctx.lastLetterBy === ctx.relancingUserId) {
    throw new GhostRelanceError("Tu es le dernier à avoir écrit — impossible de relancer");
  }

  if (daysSinceLast < GHOST_DAYS) {
    throw new GhostRelanceError(
      `La relance n'est disponible qu'après ${GHOST_DAYS} jours sans réponse (${daysSinceLast} jour(s) écoulé(s))`,
    );
  }

  if (daysSinceLast > GHOST_RELANCE_MAX_DAYS) {
    throw new GhostRelanceError(
      `La fenêtre de relance est dépassée (${GHOST_RELANCE_MAX_DAYS} jours maximum)`,
    );
  }

  if (ctx.ghostRelanceUsedBy === ctx.relancingUserId) {
    throw new GhostRelanceError("Tu as déjà utilisé ta relance dans cette relation");
  }
}

export { addDays };
