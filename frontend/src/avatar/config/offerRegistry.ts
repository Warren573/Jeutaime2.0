/**
 * offerRegistry.ts — Moteur d'offrandes : source unique de vérité
 * ─────────────────────────────────────────────────────────────────────────────
 * Pour ajouter une offrande :
 *  1. Ajouter son type dans OfferType (avatarTypes.ts)
 *  2. Ajouter son entrée ici
 *  3. Déposer son asset dans assets/avatar/offer/
 *  → Aucun autre code à toucher.
 *
 * Familles :
 *  hotDrink  → arcToMouth + drinkHot    → wellbeingSmile
 *  alcohol   → arcToMouth + drinkAlcohol → slurp
 *  symbolic  → floatToTorso/glide        → romanticReceive / readLetter
 */

import type {
  AnchorPointName,
  OfferFamily,
  OfferAnimationKey,
  OfferTrajectoryKey,
  OfferReactionKey,
  OfferType,
} from '../types/avatarTypes';

export type OfferDefinition = {
  label:        string;
  family:       OfferFamily;
  emoji:        string;          // placeholder tant que l'asset n'est pas dispo
  assetId:      string;          // clé dans avatarRegistry (futur PNG/SVG)
  targetAnchor: AnchorPointName;
  trajectory:   OfferTrajectoryKey;
  animationKey: OfferAnimationKey;
  reactionKey:  OfferReactionKey;
  durationMs:   number;          // durée totale (projectile + réaction)
};

export const offerRegistry: Record<OfferType, OfferDefinition> = {

  // ── Boissons chaudes ──────────────────────────────────────────────────────
  coffee: {
    label:        'Café',
    family:       'hotDrink',
    emoji:        '☕',
    assetId:      'offer_coffee_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkHot',
    reactionKey:  'wellbeingSmile',
    durationMs:   1800,
  },
  tea: {
    label:        'Thé',
    family:       'hotDrink',
    emoji:        '🍵',
    assetId:      'offer_tea_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkHot',
    reactionKey:  'wellbeingSmile',
    durationMs:   1800,
  },
  hotChocolate: {
    label:        'Chocolat chaud',
    family:       'hotDrink',
    emoji:        '🫖',
    assetId:      'offer_hot_chocolate_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkHot',
    reactionKey:  'wellbeingSmile',
    durationMs:   1900,
  },

  // ── Alcools ───────────────────────────────────────────────────────────────
  beer: {
    label:        'Bière',
    family:       'alcohol',
    emoji:        '🍺',
    assetId:      'offer_beer_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkAlcohol',
    reactionKey:  'slurp',
    durationMs:   2100,
  },
  cocktail: {
    label:        'Cocktail',
    family:       'alcohol',
    emoji:        '🍹',
    assetId:      'offer_cocktail_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkAlcohol',
    reactionKey:  'slurp',
    durationMs:   2100,
  },
  wine: {
    label:        'Vin',
    family:       'alcohol',
    emoji:        '🍷',
    assetId:      'offer_wine_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkAlcohol',
    reactionKey:  'slurp',
    durationMs:   2000,
  },
  champagne: {
    label:        'Champagne',
    family:       'alcohol',
    emoji:        '🥂',
    assetId:      'offer_champagne_01',
    targetAnchor: 'mouth',
    trajectory:   'arcToMouth',
    animationKey: 'drinkAlcohol',
    reactionKey:  'slurp',
    durationMs:   2200,
  },

  // ── Symboliques ───────────────────────────────────────────────────────────
  rose: {
    label:        'Rose',
    family:       'symbolic',
    emoji:        '🌹',
    assetId:      'offer_rose_01',
    targetAnchor: 'torso',
    trajectory:   'softFloatToTorso',
    animationKey: 'receiveRose',
    reactionKey:  'romanticReceive',
    durationMs:   2200,
  },
  flower: {
    label:        'Fleur',
    family:       'symbolic',
    emoji:        '🌸',
    assetId:      'offer_flower_01',
    targetAnchor: 'torso',
    trajectory:   'softFloatToTorso',
    animationKey: 'receiveRose',
    reactionKey:  'romanticReceive',
    durationMs:   2200,
  },
  heart: {
    label:        'Cœur',
    family:       'symbolic',
    emoji:        '💖',
    assetId:      'offer_heart_01',
    targetAnchor: 'faceCenter',
    trajectory:   'softFloatToTorso',
    animationKey: 'receiveRose',
    reactionKey:  'romanticReceive',
    durationMs:   2000,
  },
  letter: {
    label:        'Lettre',
    family:       'symbolic',
    emoji:        '💌',
    assetId:      'offer_letter_01',
    targetAnchor: 'torso',
    trajectory:   'glideToTorso',
    animationKey: 'openLetter',
    reactionKey:  'readLetter',
    durationMs:   2600,
  },
};

/** Offres disponibles en V1 */
export const V1_OFFERS: OfferType[] = ['coffee', 'beer', 'rose', 'letter'];
