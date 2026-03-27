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
  emoji:        string;  // affiché dans les modales / UI de sélection
  cost:         number;  // coût en pièces du salon
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
  /**
   * Coexistence : liste des MagicType compatibles en simultané.
   * Si un effet actif n'est pas dans cette liste, il ne peut coexister.
   * (Information destinée au consommateur — logique dans SalonAvatarCard.)
   */
  coexistsWith: MagicType[];
  /**
   * Priorité visuelle (plus haut = s'affiche par-dessus en cas de conflit).
   * Les effets "behind" ont priorité basse, les effets "front" haute.
   */
  priority: number;
};

export const magicRegistry: Record<MagicType, MagicDefinition> = {

  halo: {
    label:        'Halo lumineux',
    emoji:        '✨',
    cost:         60,
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
    // Halo (derrière) ne perturbe aucun effet frontal
    coexistsWith: ['rain', 'ghost'],
    priority:     1,
  },

  rain: {
    label:        'Pluie',
    emoji:        '🌧️',
    cost:         50,
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
    // Rain + ghost (front) = conflit visuel → incompatibles entre eux
    coexistsWith: ['halo'],
    priority:     2,
  },

  ghost: {
    label:        'Aura fantôme',
    emoji:        '👁️',
    cost:         80,
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
    // Ghost magic + rain (front) = conflit visuel → incompatibles entre eux
    coexistsWith: ['halo'],
    priority:     2,
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
