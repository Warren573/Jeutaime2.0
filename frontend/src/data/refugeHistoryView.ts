/**
 * Historique des adoptions — présentation (logique PURE). Aucune donnée n'est modifiée : tout vient de l'historique serveur.
 * Les catégories sont recalculées depuis le résultat RÉEL de chaque journée (le compteur serveur « cœurs » mélange 2/2 et 1/2).
 */
export interface HistoryDay { dayNumber: number; status: string; symbol: string }

export interface ResultCategory {
  key: string;
  /** Statut représentatif : l'icône est celle déjà utilisée pour la journée (emoji actuel, demi-cœur pour 1/2). */
  status: string;
  symbol: string;
  label: string;
  count: number;
}

const CATEGORY_DEFS: { key: string; statuses: string[]; status: string; symbol: string; label: string }[] = [
  { key: 'perfect', statuses: ['PERFECT'], status: 'PERFECT', symbol: '❤️', label: 'Sur la même longueur d’onde (2/2)' },
  { key: 'partial', statuses: ['PARTIAL'], status: 'PARTIAL', symbol: '♡', label: 'Presque sur la même longueur d’onde (1/2)' },
  { key: 'failed', statuses: ['FAILED'], status: 'FAILED', symbol: '❌', label: 'Pas sur la même longueur d’onde (0/2)' },
  { key: 'incomplete', statuses: ['INCOMPLETE_ADOPTE_MISSING', 'INCOMPLETE_ADOPTANT_MISSING'], status: 'INCOMPLETE_ADOPTANT_MISSING', symbol: '⚠️', label: 'Journée incomplète (l’autre personne n’a pas joué)' },
  { key: 'notPlayed', statuses: ['NOT_PLAYED'], status: 'NOT_PLAYED', symbol: '—', label: 'Journée non jouée' },
  { key: 'open', statuses: ['OPEN'], status: 'OPEN', symbol: '🤍', label: 'Journée sans résultat' },
];

/** Catégories présentes (nombre de jours > 0), dans un ordre stable ; la somme des comptes vaut le nombre de journées. */
export function resultCategories(days: readonly HistoryDay[]): ResultCategory[] {
  return CATEGORY_DEFS.map((d) => ({
    key: d.key,
    status: d.status,
    symbol: d.symbol,
    label: d.label,
    count: days.filter((x) => d.statuses.includes(x.status)).length,
  })).filter((c) => c.count > 0);
}

export const daysLabel = (n: number) => `${n} ${n > 1 ? 'jours' : 'jour'}`;

/** Rôle de la personne : compagnon, ou parrain / marraine selon SON genre (formulation double si inconnu). */
export function roleLabel(role: 'adopte' | 'adoptant', gender?: string | null): string {
  if (role === 'adopte') return 'Compagnon';
  if (gender === 'HOMME' || gender === 'M') return 'Parrain';
  if (gender === 'FEMME' || gender === 'F') return 'Marraine';
  return 'Parrain / marraine';
}

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dayMonth = (d: Date) => `${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;

/** « Du 12 novembre au 19 novembre 2026 » ; années affichées des deux côtés si elles diffèrent ; repli lisible si une date manque. */
export function formatAdventureDates(startedAt: string | null, endedAt: string | null): string {
  const s = startedAt ? new Date(startedAt) : null;
  const e = endedAt ? new Date(endedAt) : null;
  const sOk = !!s && !Number.isNaN(s.getTime());
  const eOk = !!e && !Number.isNaN(e.getTime());
  if (sOk && eOk) {
    return s!.getFullYear() === e!.getFullYear()
      ? `Du ${dayMonth(s!)} au ${dayMonth(e!)} ${e!.getFullYear()}`
      : `Du ${dayMonth(s!)} ${s!.getFullYear()} au ${dayMonth(e!)} ${e!.getFullYear()}`;
  }
  if (sOk) return `Depuis le ${dayMonth(s!)} ${s!.getFullYear()}`;
  if (eOk) return `Terminée le ${dayMonth(e!)} ${e!.getFullYear()}`;
  return 'Dates indisponibles';
}

/** Total de pièces de l'aventure : « +170 pièces », « −5 pièces », « 0 pièce » (signe moins typographique). */
export function coinsLabel(total: number): string {
  const abs = Math.abs(total);
  const unit = abs > 1 ? 'pièces' : 'pièce';
  return `${total > 0 ? '+' : total < 0 ? '−' : ''}${abs} ${unit}`;
}

export const SMILE_LABELS = {
  NONE: 'Aucun Sourire envoyé',
  SENT: '😊 Sourire envoyé',
  RECEIVED: '😊 Sourire reçu',
  MUTUAL: '💚 Sourire mutuel',
} as const;

export const NEXT_STEP_LABELS = {
  NONE: null,
  QUESTIONS_STARTED: '🎯 Jeu des 3 questions démarré',
  DISCUSSION_OPEN: '💌 Discussion ouverte',
} as const;

/** Mise en avant (inchangée) : profil dévoilé sans Sourire mutuel, affiché en premier. Tri stable. */
export function sortHistory<T extends { revealed: boolean; smileState: string }>(entries: readonly T[]): T[] {
  const prio = (e: T) => (e.revealed && e.smileState !== 'MUTUAL' ? 0 : 1);
  return entries.map((e, i) => ({ e, i })).sort((a, b) => prio(a.e) - prio(b.e) || a.i - b.i).map((x) => x.e);
}
