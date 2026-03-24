/**
 * magicRegistry.ts — Effets magiques
 * Pour ajouter un effet : ajoute le fichier asset + une entrée ici.
 */

import { AnchorPointName, OverlayAnimationKey } from '../types/avatarTypes';

export type MagicDefinition = {
  label:          string;
  overlayAssetId: string;
  overlaySlot:    'magic';
  targetAnchor:   AnchorPointName;
  animationKey:   OverlayAnimationKey;
};

export const magicRegistry: Record<string, MagicDefinition> = {
  halo: {
    label:          'Halo',
    overlayAssetId: 'magic_halo_01',
    overlaySlot:    'magic',
    targetAnchor:   'auraCenter',
    animationKey:   'pulseGlow',
  },
  rain: {
    label:          'Pluie',
    overlayAssetId: 'magic_rain_01',
    overlaySlot:    'magic',
    targetAnchor:   'rainTop',
    animationKey:   'rainFall',
  },
  ghost: {
    label:          'Fantôme',
    overlayAssetId: 'magic_ghost_01',
    overlaySlot:    'magic',
    targetAnchor:   'faceCenter',
    animationKey:   'ghostFloat',
  },
};
