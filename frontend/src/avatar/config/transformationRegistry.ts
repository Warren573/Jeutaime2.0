/**
 * transformationRegistry.ts — Transformations avatar pilotées par assets
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour ajouter une transformation :
 *  1. Déposer les SVG dans assets/avatar/transformations/
 *  2. Déclarer les assetIds dans avatarRegistry.ts
 *  3. Ajouter une entrée ici
 *  → Aucun autre code à modifier.
 *
 * mode :
 *   'overlay'    → couche visuelle par-dessus l'avatar (chapeau, voile…)
 *   'replace'    → remplace visuellement l'avatar (futur)
 *   'muteAvatar' → recouvrement global teinté (statue, grenouille…)
 *
 * zLayer :
 *   'behind' → avant AvatarRenderer (rare pour les transformations)
 *   'front'  → après AvatarRenderer (standard)
 */

import type {
  AnchorPointName,
  OverlayAnimationKey,
  TimedEffectDuration,
  TransformationType,
} from '../types/avatarTypes';

export type TransformationMode = 'overlay' | 'replace' | 'muteAvatar';

export type TransformationDefinition = {
  label:        string;
  assetIds:     string[];
  targetAnchor: AnchorPointName;
  animationKey: OverlayAnimationKey;
  mode:         TransformationMode;
  zLayer:       'behind' | 'front';
  duration:     TimedEffectDuration;
  position: {
    sizeRatio:         number;
    topOffsetPercent:  number;
    leftOffsetPercent: number;
  };
};

export const transformationRegistry: Record<TransformationType, TransformationDefinition> = {

  pirate: {
    label:        'Pirate',
    assetIds:     ['transfo_pirate_hat_01'],
    targetAnchor: 'headTop',
    animationKey: 'popOnHead',
    mode:         'overlay',
    zLayer:       'front',
    duration:     { unit: 'hours', value: 3 },
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

  ghost: {
    label:        'Fantôme',
    assetIds:     ['transfo_ghost_overlay_01'],
    targetAnchor: 'faceCenter',
    animationKey: 'fadeOverlay',
    mode:         'overlay',
    zLayer:       'front',
    duration:     { unit: 'hours', value: 6 },
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

  statue: {
    label:        'Statue',
    assetIds:     ['transfo_statue_overlay_01'],
    targetAnchor: 'faceCenter',
    animationKey: 'stoneFade',
    mode:         'muteAvatar',
    zLayer:       'front',
    duration:     { unit: 'hours', value: 2 },
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

  frog: {
    label:        'Grenouille',
    assetIds:     ['transfo_frog_overlay_01'],
    targetAnchor: 'faceCenter',
    animationKey: 'poofTransform',
    mode:         'muteAvatar',
    zLayer:       'front',
    duration:     { unit: 'hours', value: 4 },
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

};
