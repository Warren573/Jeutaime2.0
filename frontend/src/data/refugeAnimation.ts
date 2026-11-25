import type { RefugeAnimalVisualState as Pose } from './refugeAnimalImages';

const MINUTE = 60_000;
const QUARTER = 15 * MINUTE;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const HAPPY: readonly (readonly [Pose, Pose])[] = [
  ['content','joue'], ['joue','assis'], ['content','assis'], ['assis','dort'],
];
const OTHER: readonly (readonly [Pose, Pose])[] = [
  ['content','boude'], ['boude','assis'], ['content','assis'], ['assis','dort'],
];
export const REFUGE_FRAME_MS = 5000;
export const REFUGE_REACTION_MS = 10000;
export function refugeAnimation(input: {
  now: number;
  choiceAt?: string | null;
  resolvedAt?: string | null;
  matches?: number | null;
  reactions?: readonly { action: string; correct: boolean }[];
}): Pose {
  const resolved = input.resolvedAt ? Date.parse(input.resolvedAt) : NaN;
  if (Number.isFinite(resolved) && input.matches != null) {
    const since = Math.max(0, input.now - resolved);
    const reaction = since < REFUGE_REACTION_MS ? input.reactions?.[Math.floor(since / 5000)] : undefined;
    if (reaction) return since % 5000 >= 4000 ? 'assis' : !reaction.correct ? 'boude' : reaction.action === 'JOUER' && since % 5000 < 2500 ? 'joue' : 'content';
    const elapsed = Math.max(0, since - (input.reactions?.length ? REFUGE_REACTION_MS : 0));
    if (elapsed >= HOUR) return 'dort';
    const sequence = input.matches === 2 ? HAPPY : OTHER;
    return sequence[Math.floor(elapsed / QUARTER)][Math.floor(elapsed / REFUGE_FRAME_MS) % 2];
  }
  const choice = input.choiceAt ? Date.parse(input.choiceAt) : NaN;
  if (!Number.isFinite(choice)) return 'assis';
  const elapsed = Math.max(0, input.now - choice);
  return Math.floor(elapsed / REFUGE_FRAME_MS) % 2 === 0 ? 'assis' : elapsed >= DAY ? 'boude' : 'joue';
}
