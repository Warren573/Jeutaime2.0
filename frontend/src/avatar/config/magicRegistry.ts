/**
 * magicRegistry.ts — Effets magiques pilotés par assets
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour ajouter un effet :
 *  1. Déposer les SVG dans assets/avatar/magic/
 *  2. Déclarer les assetIds dans avatarRegistry.ts
 *  3. Ajouter une entrée ici
 *  → Aucun autre code à modifier.
 *
 * assetIds   : plusieurs assets superposés (ex. rain = nuage + gouttes)
 * duration   : durée d'activation configurable
 * position   : positionnement relatif à l'avatar (% et ratio de taille)
 * zLayer     : 'behind' → avant AvatarRenderer, 'front' → après
 */

import type { AnchorPointName, MagicType, OverlayAnimationKey, TimedEffectDuration } from '../types/avatarTypes';

export type MagicDefinition = {
  label:        string;
  assetIds:     string[];
  targetAnchor: AnchorPointName;
  animationKey: OverlayAnimationKey;
  duration:     TimedEffectDuration;
  zLayer:       'behind' | 'front';
  position: {
    sizeRatio:         number;
    topOffsetPercent:  number;
    leftOffsetPercent: number;
  };
};

export const magicRegistry: Record<MagicType, MagicDefinition> = {

  halo: {
    label:        'Halo lumineux',
    assetIds:     ['magic_halo_soft_01'],
    targetAnchor: 'auraCenter',
    animationKey: 'pulseGlow',
    duration:     { unit: 'hours', value: 2 },
    zLayer:       'behind',
    position: {
      sizeRatio:         1.05,
      topOffsetPercent:  -2,
      leftOffsetPercent: 0,
    },
  },

  rain: {
    label:        'Pluie',
    assetIds:     ['magic_rain_cloud_01', 'magic_rain_drops_01'],
    targetAnchor: 'rainTop',
    animationKey: 'rainFall',
    duration:     { unit: 'hours', value: 1 },
    zLayer:       'front',
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

  ghost: {
    label:        'Fantôme',
    assetIds:     ['magic_ghost_glow_01'],
    targetAnchor: 'faceCenter',
    animationKey: 'ghostFloat',
    duration:     { unit: 'days', value: 1 },
    zLayer:       'front',
    position: {
      sizeRatio:         1.0,
      topOffsetPercent:  0,
      leftOffsetPercent: 0,
    },
  },

};

/** Convertit une TimedEffectDuration en millisecondes */
export function durationToMs(duration: TimedEffectDuration): number {
  const map: Record<TimedEffectDuration['unit'], number> = {
    seconds: 1_000,
    minutes: 60 * 1_000,
    hours:   60 * 60 * 1_000,
    days:    24 * 60 * 60 * 1_000,
  };
  return duration.value * map[duration.unit];
}
