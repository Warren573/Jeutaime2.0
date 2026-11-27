/**
 * Journal DIAGNOSTIC des décisions d'affichage des notifications reçues (mémoire seule, 20 entrées, vidé au redémarrage).
 * Aucune donnée personnelle : type de notification, état de l'application, écran courant (chemin sans paramètres) et
 * décisions booléennes. Sert à PROUVER, sur l'iPhone, pourquoi une bannière système est apparue application ouverte.
 */
export interface ForegroundDecisionEntry {
  /** Heure locale ISO. */
  at: string;
  /** Source : « handler » (bannière iOS décidée) ou « annonce » (fenêtre interne de match). */
  source: 'handler' | 'annonce';
  /** État de l'application au moment de la réception (react-native AppState : active / inactive / background). */
  appState: string;
  /** Type de notification (data.type) ou « inconnu ». */
  type: string;
  /** Chemin de l'écran affiché (sans paramètres). */
  path: string;
  banner: boolean;
  list: boolean;
  /** Pour « annonce » : fenêtre interne affichée ? ; pour « handler » : null. */
  announced: boolean | null;
  /** Raison lisible. */
  reason: string;
}

const MAX = 20;
const entries: ForegroundDecisionEntry[] = [];

export function recordForegroundDecision(e: ForegroundDecisionEntry): void {
  entries.unshift(e);
  if (entries.length > MAX) entries.length = MAX;
}

export function getForegroundDecisions(): readonly ForegroundDecisionEntry[] {
  return entries;
}

export function clearForegroundDecisions(): void {
  entries.length = 0;
}

/** Type de notification extrait des données (jamais d'identifiant). */
export function notificationTypeOf(data: unknown): string {
  const t = data && typeof data === 'object' ? (data as Record<string, unknown>)['type'] : undefined;
  return typeof t === 'string' && /^[A-Z_a-z0-9.-]{1,48}$/.test(t) ? t : 'inconnu';
}

/** Explication d'une présentation système, en clair. */
export function describePresentation(appState: string, banner: boolean): string {
  if (appState === 'active') return banner ? 'application active MAIS bannière demandée' : 'application active : aucune bannière système';
  return banner ? `application « ${appState} » : présentation système (attendu hors premier plan)` : `application « ${appState} » : écran concerné déjà affiché`;
}
