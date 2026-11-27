/**
 * Petites attentions du parrain / de la marraine — logique PURE (aucun réseau, aucun état global).
 *
 * Une seule attention par jour, facultative, uniquement avant la validation des actions du compagnon. Les trois boutons
 * disparaissent après l'envoi ou dès que le compagnon valide ; les quatre actions habituelles prennent alors leur place.
 * Aucun gain de pièces ni de points. La réaction visuelle (PNG « content ») est temporaire et ne touche pas au moteur
 * d'animation : elle se superpose à l'image courante pendant quelques secondes, une seule fois par attention et par appareil.
 */
export type AttentionKind = 'GRATTER_TETE' | 'CARESSE' | 'BONJOUR';

export const ATTENTIONS: ReadonlyArray<{ kind: AttentionKind; label: string }> = [
  { kind: 'GRATTER_TETE', label: 'Gratter la tête' },
  { kind: 'CARESSE', label: 'Faire une caresse' },
  { kind: 'BONJOUR', label: 'Dire bonjour' },
];

/** Durée de la réaction « content » (en millisecondes). */
export const ATTENTION_REACTION_MS = 6000;

export interface AttentionData {
  kind: AttentionKind;
  sentAt: string;
}

export function isAttentionKind(value: unknown): value is AttentionKind {
  return value === 'GRATTER_TETE' || value === 'CARESSE' || value === 'BONJOUR';
}

/** Identité d'une attention (session + horodatage serveur) : sert à ne jouer la réaction qu'une fois. */
export function attentionKey(sessionId: string | null | undefined, attention: { kind?: unknown; sentAt?: unknown } | null | undefined): string | null {
  if (!sessionId || !attention || !isAttentionKind(attention.kind)) return null;
  if (typeof attention.sentAt !== 'string' || !Number.isFinite(Date.parse(attention.sentAt))) return null;
  return `${sessionId}|${attention.sentAt}`;
}

/** Vrai la première fois seulement pour cette clé (mémorise la clé). */
export function claimAttentionReaction(seen: Set<string>, key: string | null): boolean {
  if (!key || seen.has(key)) return false;
  seen.add(key);
  while (seen.size > 20) {
    const oldest = seen.values().next().value;
    if (oldest === undefined) break;
    seen.delete(oldest);
  }
  return true;
}

/**
 * Zone sous la scène :
 *   - « attentions » : parrain / marraine, compagnon pas encore validé, attention possible → les trois boutons ;
 *   - « none »       : parrain / marraine, compagnon pas encore validé, attention déjà envoyée → rien ;
 *   - « actions »    : tout le reste → les quatre actions habituelles, comme avant.
 */
export function actionZone(input: {
  role: 'adopte' | 'adoptant' | null | undefined;
  adopteSubmittedToday: boolean;
  canSendAttention: boolean;
  ended: boolean;
}): 'attentions' | 'none' | 'actions' {
  if (input.role !== 'adoptant' || input.adopteSubmittedToday || input.ended) return 'actions';
  return input.canSendAttention ? 'attentions' : 'none';
}
