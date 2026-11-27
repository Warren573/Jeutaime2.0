/**
 * Titre dynamique de la case Refuge de l'accueil — logique PURE, dérivée de la session active renvoyée par le serveur.
 *
 *   aucune adoption active                    → « Refuge »
 *   en attente d'être adopté (compagnon)      → « Refuge » (le message d'attente existant est conservé)
 *   parrain / marraine                        → « Ton compagnon »
 *   compagnon adopté par un homme / une femme → « Ton parrain » / « Ta marraine » (formulation double si genre inconnu)
 *   après archivage de l'aventure             → plus de session active → « Refuge »
 */
export const DEFAULT_REFUGE_TITLE = 'Refuge';

export interface CardSession {
  adopteId?: string | null;
  adoptantId?: string | null;
  status?: string | null;
  sponsorRole?: 'parrain' | 'marraine' | null;
}

export function refugeCardTitle(session: CardSession | null | undefined, userId: string | null | undefined): string {
  if (!session || !userId) return DEFAULT_REFUGE_TITLE;
  if (session.status === 'CREATION' || session.status === 'WAITING_FOR_ADOPTANT') return DEFAULT_REFUGE_TITLE;
  if (session.adoptantId && session.adoptantId === userId) return 'Ton compagnon';
  if (session.adopteId && session.adopteId === userId && session.adoptantId) {
    if (session.sponsorRole === 'parrain') return 'Ton parrain';
    if (session.sponsorRole === 'marraine') return 'Ta marraine';
    return 'Ton parrain ou ta marraine';
  }
  return DEFAULT_REFUGE_TITLE;
}
