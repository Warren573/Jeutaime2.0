/**
 * transformationRegistry.ts — Transformations avatar
 * Pour ajouter une transformation : ajoute le fichier asset + une entrée ici.
 */

import { AnchorPointName, OverlayAnimationKey } from '../types/avatarTypes';

export type TransformationDefinition = {
  label:          string;
  overlayAssetId: string;
  overlaySlot:    'transformation';
  targetAnchor:   AnchorPointName;
  animationKey:   OverlayAnimationKey;
};

export const transformationRegistry: Record<string, TransformationDefinition> = {
  pirate: {
    label:          'Pirate',
    overlayAssetId: 'transfo_pirate_hat_01',
    overlaySlot:    'transformation',
    targetAnchor:   'headTop',
    animationKey:   'popOnHead',
  },
  ghost: {
    label:          'Fantôme',
    overlayAssetId: 'transfo_ghost_overlay_01',
    overlaySlot:    'transformation',
    targetAnchor:   'faceCenter',
    animationKey:   'fadeOverlay',
  },
  statue: {
    label:          'Statue',
    overlayAssetId: 'transfo_statue_overlay_01',
    overlaySlot:    'transformation',
    targetAnchor:   'faceCenter',
    animationKey:   'stoneFade',
  },
  frog: {
    label:          'Grenouille',
    overlayAssetId: 'transfo_frog_overlay_01',
    overlaySlot:    'transformation',
    targetAnchor:   'faceCenter',
    animationKey:   'poofTransform',
  },
};
