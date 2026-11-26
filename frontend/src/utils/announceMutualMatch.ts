import { buildMatchAnnouncement } from '../data/appEvents';
import { enqueueLocalEvent } from '../hooks/useAppEvents';

const announcedMatches = new Set<string>();

/** Annonce « C'est un match ! » dans la fenêtre commune JeuTaime (même contenu, mêmes boutons que l'ancienne alerte native). */
export function announceMutualMatch(matchId: string, openQuestions: () => void) {
  if (announcedMatches.has(matchId)) return;
  announcedMatches.add(matchId);
  enqueueLocalEvent(buildMatchAnnouncement(matchId, openQuestions));
}
