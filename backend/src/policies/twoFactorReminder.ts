/**
 * Rappels de sécurité avant l'expiration du délai de 14 jours (OWNER et ADMIN).
 *
 * Trois rappels au plus : à 7 jours, 3 jours et 1 jour de l'échéance. Si le
 * serveur n'a pas pu en envoyer un à temps, seul le plus urgent encore dû est
 * envoyé : jamais plusieurs rappels d'un coup, jamais un rappel moins urgent
 * après un plus urgent.
 */
export const REMINDER_THRESHOLDS_DAYS = [7, 3, 1] as const;

/**
 * @param daysLeft jours restants avant l'échéance (arrondis au supérieur, ≥ 1)
 * @param alreadySent seuils déjà envoyés pour ce cycle d'obligation
 * @returns le seuil à envoyer maintenant, ou null
 */
export function reminderToSend(daysLeft: number, alreadySent: readonly number[]): number | null {
  const due = REMINDER_THRESHOLDS_DAYS.filter((t) => daysLeft <= t);
  if (due.length === 0) return null;
  const threshold = Math.min(...due);
  return alreadySent.some((sent) => sent <= threshold) ? null : threshold;
}

export function reminderMessage(daysLeft: number): string {
  const unit = daysLeft > 1 ? "jours" : "jour";
  return `La double authentification devient obligatoire pour ton rôle dans ${daysLeft} ${unit}. Configure-la dans Réglages → Sécurité et appareils, sinon l'administration sera bloquée.`;
}
