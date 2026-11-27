/**
 * Fin d'aventure du Refuge : QUELLE vue afficher — logique PURE, entièrement dérivée de l'état serveur.
 *
 * Cause de l'ancien défaut (RefugeEndScreen) : l'étape initiale était `report ? 'report' : 'reveal'`, donc l'écran
 * revenait toujours au bilan à chaque réouverture, même après la décision. Désormais la vue vient du serveur ;
 * le bilan n'est affiché automatiquement qu'UNE fois (avant la première décision) puis seulement à la demande.
 */
export type EndView = 'loading' | 'report' | 'proposal' | 'waiting' | 'revealed' | 'ended' | 'pending';

export interface EndViewInput {
  status: string;
  myDecision: 'ACCEPT' | 'REFUSE' | null;
  /** Dévoilement proposable (serveur + heure de fin). */
  offered: boolean;
  hasReport: boolean;
  /** Le bilan a-t-il déjà été vu sur cet appareil ? null : lecture en cours. */
  reportSeen: boolean | null;
  /** « Revoir le bilan » demandé volontairement. */
  reviewRequested: boolean;
}

export function deriveEndView(i: EndViewInput): EndView {
  if (i.reviewRequested && i.hasReport) return 'report';
  if (i.status === 'REVEALED') return 'revealed';
  if (i.status === 'COMPLETED') return 'ended';
  if (i.myDecision === 'REFUSE') return 'ended';
  if (i.myDecision === 'ACCEPT') return 'waiting';
  if (!i.offered) return i.hasReport ? 'report' : 'pending';
  if (i.hasReport) {
    if (i.reportSeen === null) return 'loading';
    if (!i.reportSeen) return 'report';
  }
  return 'proposal';
}

/** Le bilan est-il la vue « par défaut » (à marquer comme vu quand on continue) ? */
export function reportIsAutomatic(view: EndView, reviewRequested: boolean): boolean {
  return view === 'report' && !reviewRequested;
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
