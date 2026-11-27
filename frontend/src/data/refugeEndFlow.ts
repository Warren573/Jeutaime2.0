/**
 * Fin d'aventure du Refuge : QUELLE vue afficher — logique PURE, dérivée de l'état serveur.
 *
 * Dévoilement AUTOMATIQUE à l'issue des 168 h : plus de consentement, donc plus de proposition ni d'attente.
 * Séquence : bilan (une seule fois, automatiquement) → « Une nouvelle histoire commence » (REVEALED) ou fin simple
 * (COMPLETED : blocage, compte indisponible ; ancien flux en attente). Le bilan n'est ensuite revu que volontairement.
 */
export type EndView = 'loading' | 'report' | 'revealed' | 'ended';

export interface EndViewInput {
  status: string;
  hasReport: boolean;
  /** Le bilan a-t-il déjà été vu sur cet appareil ? null : lecture en cours. */
  reportSeen: boolean | null;
  /** « Revoir le bilan » demandé volontairement. */
  reviewRequested: boolean;
}

export function deriveEndView(i: EndViewInput): EndView {
  if (i.reviewRequested && i.hasReport) return 'report';
  if (i.hasReport) {
    if (i.reportSeen === null) return 'loading';
    if (!i.reportSeen) return 'report';
  }
  return i.status === 'REVEALED' ? 'revealed' : 'ended';
}

/** Le bilan est-il la vue « par défaut » (à marquer comme vu quand on continue) ? */
export function reportIsAutomatic(view: EndView, reviewRequested: boolean): boolean {
  return view === 'report' && !reviewRequested;
}

/**
 * Sortie de l'écran : faut-il archiver l'aventure (libérer le Refuge de cette personne) ?
 * Oui seulement depuis l'écran d'arrivée (nouvelle histoire / fin simple) ; jamais depuis le bilan automatique (la personne
 * n'a pas encore vu la suite) ni pendant la lecture du drapeau.
 */
export function shouldArchiveOnLeave(view: EndView): boolean {
  return view === 'revealed' || view === 'ended';
}

/** Symbole de calendrier du bilan : mêmes glyphes que le calendrier du Refuge (♥ plein, ◐ partiel, ♡ vide). */
export function calendarGlyph(d: { status: string; symbol: string }): { glyph: '♥' | '◐' | '♡'; filled: boolean } {
  if (d.status === 'PERFECT' || d.symbol === '❤️') return { glyph: '♥', filled: true };
  if (d.status === 'PARTIAL') return { glyph: '◐', filled: true };
  return { glyph: '♡', filled: false };
}

export interface RevealMatchInfo {
  matchId: string;
  status: string;
  questionsValidated: boolean;
  discussionOpen: boolean;
}

/** Destination du jeu des 3 questions (même route que les notifications de match). null : pas de match exploitable. */
export function questionsRoute(m: RevealMatchInfo | null | undefined): string | null {
  if (!m || !m.matchId || m.status !== 'ACTIVE') return null;
  if (m.questionsValidated || m.discussionOpen) return null;
  return `/(tabs)/letters?questionsMatchId=${encodeURIComponent(m.matchId)}`;
}
