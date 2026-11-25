import type { RefugeAnimalVisualState as Pose } from './refugeAnimalImages';

/**
 * Moteur d'animation du compagnon — PUR : aucune requête, aucun état global.
 *
 * L'image est calculée localement à partir des horodatages fournis par le
 * serveur (choiceAt, resolvedAt) : fermer / rouvrir l'application, changer
 * d'écran ou d'appareil redonne exactement la même image au même instant.
 * Aucun PNG n'est demandé au réseau : rien n'est déclenché à chaque changement.
 *
 * Chronologie après le résultat du jour (parrain / marraine ayant validé) :
 *   1. Réactions immédiates : 5 s par action choisie par le parrain / la marraine
 *      (4 s de réaction, puis 1 s de retour à « assis »).
 *   2. Cycle d'une heure en quatre périodes de 15 min, une image toutes les 5 s.
 *      2/2 → séquence heureuse ; 1/2 et 0/2 → MÊME séquence.
 *   3. Après une heure : « dort », jusqu'au prochain cycle quotidien.
 * Avant le résultat (compagnon ayant choisi, parrain / marraine pas encore) :
 *   alternance assis / joue, puis assis / boude à partir de 24 h d'attente.
 * Rien dans ces données ne révèle les actions secrètes.
 */

const SECOND = 1000;
const MINUTE = 60 * SECOND;
export const REFUGE_FRAME_MS = 5 * SECOND;
export const REFUGE_REACTION_SLOT_MS = 5 * SECOND;
const REACTION_POSE_MS = 4 * SECOND; // le reste du créneau : retour bref à « assis »
const BOWL_EMPTIES_AT_MS = 2 * SECOND; // gamelle pleine → vide, bonne réponse
const QUARTER = 15 * MINUTE;
export const REFUGE_CYCLE_MS = 60 * MINUTE;
export const REFUGE_WAITING_SWITCH_MS = 24 * 60 * MINUTE;

const HAPPY: readonly (readonly [Pose, Pose])[] = [
  ['content', 'joue'], ['joue', 'assis'], ['content', 'assis'], ['assis', 'dort'],
];
// 1/2 et 0/2 : exactement la même animation.
const OTHER: readonly (readonly [Pose, Pose])[] = [
  ['content', 'boude'], ['boude', 'assis'], ['content', 'assis'], ['assis', 'dort'],
];

export interface RefugeAnimationData {
  choiceAt?: string | null;
  resolvedAt?: string | null;
  matches?: number | null;
  reactions?: readonly { action: string; correct: boolean }[] | null;
  foodChoice?: string | null;
}

export type RefugePhase = 'idle' | 'waiting' | 'reaction' | 'cycle' | 'sleep';

export interface RefugeFrame {
  pose: Pose;
  phase: RefugePhase;
  /** Index de la réaction immédiate en cours (0 ou 1), sinon null. */
  reactionIndex: number | null;
  /** Gamelle visible pendant la réaction à Nourrir uniquement. */
  bowl: { food: string | null; level: 'full' | 'empty' } | null;
}

export interface RefugeAnimationInput {
  /** Heure courante CORRIGÉE du décalage d'horloge serveur (ms epoch). */
  now: number;
  animation?: RefugeAnimationData | null;
  /** Rattrapage local : début d'un rejeu des réactions manquées (ms epoch, même base que `now`). */
  replayAt?: number | null;
}

const IDLE: RefugeFrame = { pose: 'assis', phase: 'idle', reactionIndex: null, bowl: null };

function parse(iso: string | null | undefined): number {
  return iso ? Date.parse(iso) : NaN;
}

export function reactionsDurationMs(animation?: RefugeAnimationData | null): number {
  return (animation?.reactions?.length ?? 0) * REFUGE_REACTION_SLOT_MS;
}

function reactionFrame(animation: RefugeAnimationData, sinceMs: number): RefugeFrame {
  const reactions = animation.reactions ?? [];
  const index = Math.min(Math.floor(sinceMs / REFUGE_REACTION_SLOT_MS), reactions.length - 1);
  const reaction = reactions[index]!;
  const local = sinceMs - index * REFUGE_REACTION_SLOT_MS;
  if (local >= REACTION_POSE_MS) return { pose: 'assis', phase: 'reaction', reactionIndex: index, bowl: null };
  const feeds = reaction.action === 'NOURRIR';
  const pose: Pose = !reaction.correct
    ? 'boude'
    : reaction.action === 'JOUER' && local < BOWL_EMPTIES_AT_MS
      ? 'joue'
      : 'content';
  return {
    pose,
    phase: 'reaction',
    reactionIndex: index,
    // Bonne réponse : pleine puis vide (transition perceptible). Mauvaise : reste pleine.
    bowl: feeds
      ? { food: animation.foodChoice ?? null, level: reaction.correct && local >= BOWL_EMPTIES_AT_MS ? 'empty' : 'full' }
      : null,
  };
}

export function refugeAnimationFrame(input: RefugeAnimationInput): RefugeFrame {
  const animation = input.animation;
  if (!animation || !Number.isFinite(input.now)) return IDLE;

  const resolved = parse(animation.resolvedAt);
  if (Number.isFinite(resolved) && typeof animation.matches === 'number') {
    const reactionsMs = reactionsDurationMs(animation);
    const since = Math.max(0, input.now - resolved);

    if (reactionsMs > 0) {
      if (since < reactionsMs) return reactionFrame(animation, since); // en direct
      if (input.replayAt != null && Number.isFinite(input.replayAt)) {
        const replaySince = input.now - input.replayAt;
        if (replaySince >= 0 && replaySince < reactionsMs) return reactionFrame(animation, replaySince);
      }
    }

    const elapsed = since - reactionsMs;
    if (elapsed >= REFUGE_CYCLE_MS) return { pose: 'dort', phase: 'sleep', reactionIndex: null, bowl: null };
    const sequence = animation.matches === 2 ? HAPPY : OTHER;
    const quarter = Math.floor(elapsed / QUARTER);
    const pose = sequence[quarter]![Math.floor(elapsed / REFUGE_FRAME_MS) % 2]!;
    return { pose, phase: 'cycle', reactionIndex: null, bowl: null };
  }

  const choice = parse(animation.choiceAt);
  if (!Number.isFinite(choice)) return IDLE;
  const waited = Math.max(0, input.now - choice);
  const pose: Pose = Math.floor(waited / REFUGE_FRAME_MS) % 2 === 0
    ? 'assis'
    : waited >= REFUGE_WAITING_SWITCH_MS ? 'boude' : 'joue';
  return { pose, phase: 'waiting', reactionIndex: null, bowl: null };
}

export function refugeAnimation(input: RefugeAnimationInput): Pose {
  return refugeAnimationFrame(input).pose;
}

/**
 * Délai (ms) avant le prochain changement possible de l'image, ou null si
 * l'animation est figée (idle, sommeil). Sert à programmer UN seul minuteur
 * au prochain changement, au lieu d'un rafraîchissement permanent.
 */
export function refugeNextChangeMs(input: RefugeAnimationInput): number | null {
  const frame = refugeAnimationFrame(input);
  const animation = input.animation;
  if (!animation || frame.phase === 'idle' || frame.phase === 'sleep') return null;

  const resolved = parse(animation.resolvedAt);
  if (frame.phase === 'reaction') {
    const reactionsMs = reactionsDurationMs(animation);
    const since = Math.max(0, input.now - resolved);
    const base = since < reactionsMs ? since : input.now - (input.replayAt ?? input.now);
    const local = base % REFUGE_REACTION_SLOT_MS;
    const next = [BOWL_EMPTIES_AT_MS, REACTION_POSE_MS, REFUGE_REACTION_SLOT_MS].find((b) => b > local)!;
    return Math.max(50, next - local);
  }
  const anchor = frame.phase === 'cycle'
    ? resolved + reactionsDurationMs(animation)
    : parse(animation.choiceAt);
  const elapsed = Math.max(0, input.now - anchor);
  return Math.max(50, REFUGE_FRAME_MS - (elapsed % REFUGE_FRAME_MS));
}
