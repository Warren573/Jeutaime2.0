/**
 * Refuge background options
 * Each background is purely aesthetic and doesn't affect gameplay
 */

export type RefugeBackgroundType =
  | 'default'
  | 'forêt'
  | 'plage'
  | 'neige'
  | 'automne'
  | 'montagne'
  | 'nuit_étoilée';

export interface RefugeBackground {
  id: RefugeBackgroundType;
  label: string;
  emoji: string;
  description: string;
  gradient: string[]; // Array of 2-3 colors for gradient
}

export const REFUGE_BACKGROUNDS: Record<RefugeBackgroundType, RefugeBackground> = {
  default: {
    id: 'default',
    label: 'Neutre',
    emoji: '🏠',
    description: 'Fond simple et calme',
    gradient: ['#F8F4ED', '#F0E5D8'],
  },
  forêt: {
    id: 'forêt',
    label: 'Forêt',
    emoji: '🌲',
    description: 'Ambiance boisée et naturelle',
    gradient: ['#A8B895', '#7A9B6E'], // Soft greens
  },
  plage: {
    id: 'plage',
    label: 'Plage',
    emoji: '🏖️',
    description: 'Sable et mer apaisants',
    gradient: ['#E8D5C4', '#B8A896'], // Sand tones, slightly desaturated
  },
  neige: {
    id: 'neige',
    label: 'Neige',
    emoji: '❄️',
    description: 'Paysage enneigé doux',
    gradient: ['#E8F0F8', '#D0DFE8'], // Cool whites, slightly desaturated
  },
  automne: {
    id: 'automne',
    label: 'Automne',
    emoji: '🍂',
    description: 'Teintes chaudes d\'automne',
    gradient: ['#C9A383', '#A5845C'], // Warm autumn tones, desaturated
  },
  montagne: {
    id: 'montagne',
    label: 'Montagne',
    emoji: '⛰️',
    description: 'Pics montagneux majestueux',
    gradient: ['#9B9B9B', '#6B6B6B'], // Cool grays, slightly desaturated
  },
  nuit_étoilée: {
    id: 'nuit_étoilée',
    label: 'Nuit Étoilée',
    emoji: '✨',
    description: 'Ciel nocturne paisible',
    gradient: ['#2C3E50', '#1A2332'], // Deep blue-grays
  },
};

export function getBackgroundGradientStyle(backgroundId: RefugeBackgroundType | string) {
  const bg = REFUGE_BACKGROUNDS[backgroundId as RefugeBackgroundType] || REFUGE_BACKGROUNDS.default;

  // For React Native, we'll use backgroundColor with opacity for soft effect
  // The first color is the primary background
  return {
    backgroundColor: bg.gradient[0],
  };
}

export function getBackgroundLabel(backgroundId: string): string {
  const bg = REFUGE_BACKGROUNDS[backgroundId as RefugeBackgroundType];
  return bg ? bg.label : 'Neutre';
}
