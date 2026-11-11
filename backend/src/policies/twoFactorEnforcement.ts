/**
 * Double authentification obligatoire pour OWNER et ADMIN (logique pure).
 *
 * Règles validées :
 * - OWNER et ADMIN antérieurs à l'obligation : 14 jours à compter de l'activation.
 * - Nouvel ADMIN (promu après la mise en place) : configuration exigée avant
 *   tout accès aux fonctions d'administration.
 * - Passé le délai : seules les fonctions d'administration sont bloquées.
 * - USER et MODERATOR : jamais obligatoire.
 *
 * « L'activation effective » est la date TWO_FACTOR_ENFORCEMENT_START. Tant
 * qu'elle n'est pas définie, rien n'est bloqué.
 */
export const TWO_FACTOR_GRACE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TwoFactorState =
  | "not_required" // USER, MODERATOR
  | "protected" // la double authentification est active
  | "not_active" // obligatoire pour ce rôle, mais l'obligation n'a pas encore commencé
  | "grace" // période de transition en cours
  | "blocked"; // délai dépassé : fonctions d'administration bloquées

export interface TwoFactorEnforcementInput {
  role: string;
  twoFactorEnabledAt: Date | null;
  /** Date de promotion au rôle ADMIN ; null pour les comptes existants avant l'obligation. */
  privilegedRoleSince: Date | null;
  enforcementStart: Date | undefined;
  now?: Date;
}

export interface TwoFactorEnforcement {
  state: TwoFactorState;
  /** Vrai pour OWNER et ADMIN. */
  roleRequiresTwoFactor: boolean;
  /** Vrai dès que l'obligation est entrée en vigueur pour ce rôle (désactivation interdite). */
  mandatory: boolean;
  deadline: Date | null;
  daysLeft: number | null;
}

export function isPrivilegedRole(role: string): boolean {
  return role === "OWNER" || role === "ADMIN";
}

export function evaluateTwoFactor(input: TwoFactorEnforcementInput): TwoFactorEnforcement {
  const now = input.now ?? new Date();
  const roleRequiresTwoFactor = isPrivilegedRole(input.role);
  const start = input.enforcementStart;
  const enforcementActive = Boolean(start) && now.getTime() >= (start as Date).getTime();

  if (!roleRequiresTwoFactor) {
    return { state: "not_required", roleRequiresTwoFactor, mandatory: false, deadline: null, daysLeft: null };
  }

  const mandatory = enforcementActive;
  const deadline = start
    ? input.privilegedRoleSince
      ? new Date(Math.max(input.privilegedRoleSince.getTime(), start.getTime()))
      : new Date(start.getTime() + TWO_FACTOR_GRACE_DAYS * DAY_MS)
    : null;

  if (input.twoFactorEnabledAt) {
    return { state: "protected", roleRequiresTwoFactor, mandatory, deadline, daysLeft: null };
  }
  if (!enforcementActive || !deadline) {
    return { state: "not_active", roleRequiresTwoFactor, mandatory, deadline, daysLeft: null };
  }
  if (now.getTime() < deadline.getTime()) {
    return {
      state: "grace",
      roleRequiresTwoFactor,
      mandatory,
      deadline,
      daysLeft: Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / DAY_MS)),
    };
  }
  return { state: "blocked", roleRequiresTwoFactor, mandatory, deadline, daysLeft: 0 };
}
