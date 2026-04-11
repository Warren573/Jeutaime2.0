/**
 * Policy pure pour les actions de modération.
 * Aucune dépendance Prisma — testable unitairement.
 *
 * Couvre :
 *   - assertCanBanUser : matrice des permissions sur ban/unban
 *   - assertReportTransition : machine d'états des status de Report
 */
import { Role, ReportStatus } from "@prisma/client";
import { BadRequestError, ForbiddenError } from "../core/errors";

// ============================================================
// Bannissement
// ============================================================

/**
 * Vérifie qu'un acteur peut bannir/débannir une cible.
 *
 * Règles :
 *   - Personne ne peut bannir un ADMIN (protection ultime).
 *   - Un MODERATOR ne peut pas bannir un autre MODERATOR.
 *   - Seul un ADMIN peut bannir un MODERATOR.
 *   - On ne peut pas s'auto-bannir.
 *
 * Note : la décision finale "qui a accès à la route" reste à requireRole.
 * Cette fonction est une couche métier additionnelle, indépendante du
 * routage, et donc testable hors HTTP.
 *
 * @throws ForbiddenError 403 si interdit
 */
export function assertCanBanUser(
  actor: { id: string; role: Role },
  target: { id: string; role: Role },
): void {
  if (actor.id === target.id) {
    throw new ForbiddenError("Tu ne peux pas te bannir toi-même");
  }
  if (target.role === Role.ADMIN) {
    throw new ForbiddenError("Un administrateur ne peut pas être banni");
  }
  if (target.role === Role.MODERATOR && actor.role !== Role.ADMIN) {
    throw new ForbiddenError(
      "Seul un administrateur peut bannir un modérateur",
    );
  }
}

// ============================================================
// Transitions de status d'un Report
// ============================================================

/**
 * Machine d'états des reports :
 *
 *   OPEN ──┬──► REVIEWING ──┬──► ACTIONED   (terminal)
 *          │                └──► DISMISSED  (terminal)
 *          ├──► ACTIONED  (terminal, raccourci)
 *          └──► DISMISSED (terminal, raccourci)
 *
 *   ACTIONED, DISMISSED → finaux : aucune transition possible.
 *   On interdit aussi explicitement le no-op (current === next).
 *
 * @throws BadRequestError 400 si transition invalide
 */
export function assertReportTransition(
  current: ReportStatus,
  next: ReportStatus,
): void {
  if (current === next) {
    throw new BadRequestError(
      `Le report est déjà au statut ${current}`,
    );
  }

  const allowed: Record<ReportStatus, ReportStatus[]> = {
    [ReportStatus.OPEN]: [
      ReportStatus.REVIEWING,
      ReportStatus.ACTIONED,
      ReportStatus.DISMISSED,
    ],
    [ReportStatus.REVIEWING]: [
      ReportStatus.ACTIONED,
      ReportStatus.DISMISSED,
    ],
    [ReportStatus.ACTIONED]: [],
    [ReportStatus.DISMISSED]: [],
  };

  if (!allowed[current].includes(next)) {
    throw new BadRequestError(
      `Transition de report invalide : ${current} → ${next}`,
    );
  }
}
