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
export function refugeAnimation(input: {
  now: number;
  choiceAt?: string | null;
  resolvedAt?: string | null;
  matches?: number | null;
}): Pose {
  const resolved = input.resolvedAt ? Date.parse(input.resolvedAt) : NaN;
  if (Number.isFinite(resolved) && input.matches != null) {
    const elapsed = Math.max(0, input.now - resolved);
    if (elapsed >= HOUR) return 'dort';
    const sequence = input.matches === 2 ? HAPPY : OTHER;
    return sequence[Math.floor(elapsed / QUARTER)][Math.floor(elapsed / REFUGE_FRAME_MS) % 2];
  }
  const choice = input.choiceAt ? Date.parse(input.choiceAt) : NaN;
  if (!Number.isFinite(choice)) return 'assis';
  const elapsed = Math.max(0, input.now - choice);
  return Math.floor(elapsed / REFUGE_FRAME_MS) % 2 === 0 ? 'assis' : elapsed >= DAY ? 'boude' : 'joue';
}
