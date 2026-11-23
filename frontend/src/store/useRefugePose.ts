import { create } from 'zustand';
import type { RefugeAnimalVisualState } from '../data/refugeAnimalImages';

interface Pose {
  key: string;
  state: RefugeAnimalVisualState;
  resolved: boolean;
}

export const useRefugePose = create<{ pose: Pose | null }>(() => ({ pose: null }));

export function showRefugePose(key: string, state: RefugeAnimalVisualState, resolved = false) {
  const pose = { key, state, resolved };
  useRefugePose.setState({ pose });
  if (resolved && state !== 'dort') {
    setTimeout(() => {
      if (useRefugePose.getState().pose === pose) showRefugePose(key, 'dort', true);
    }, 3500);
  }
}
