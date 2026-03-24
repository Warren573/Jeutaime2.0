/**
 * avatarTypes.ts — Types centraux du moteur d'avatar modulaire
 * ─────────────────────────────────────────────────────────────────────────────
 * Principe : un avatar est un ASSEMBLAGE de couches visuelles + points d'ancrage.
 * Chaque couche est un fichier SVG ou PNG remplaçable sans recoder.
 */

// ─── Couches visuelles ────────────────────────────────────────────────────────

export type AvatarLayerSlot =
  | 'head'
  | 'eyes'
  | 'brows'
  | 'nose'
  | 'mouth'
  | 'beard'
  | 'hairBack'
  | 'hairFront'
  | 'accessory';

export type AvatarOverlaySlot =
  | 'magic'
  | 'transformation'
  | 'reaction';

// ─── Points d'ancrage ─────────────────────────────────────────────────────────
// Exprimés en % de la taille de l'avatar (0–100)

export type AnchorPointName =
  | 'faceCenter'
  | 'mouth'
  | 'headTop'
  | 'torso'
  | 'leftHand'
  | 'rightHand'
  | 'auraCenter'
  | 'rainTop';

export type AnchorPoint = {
  x: number; // % 0–100
  y: number; // % 0–100
};

export type AvatarAnchors = Record<AnchorPointName, AnchorPoint>;

// ─── Référence d'asset ────────────────────────────────────────────────────────

export type AvatarAssetRef = {
  id: string;
  /** 'svg' = source est une chaîne XML SVG (inline)
   *  'png' = source est un require() (number) ou { uri: string }
   */
  type: 'svg' | 'png';
  source: string | number | { uri: string };
};

// ─── Définition complète d'un avatar ─────────────────────────────────────────

export type AvatarLayers = {
  head:       string;
  eyes:       string;
  brows:      string;
  nose:       string;
  mouth:      string;
  beard:      string;
  hairBack:   string;
  hairFront:  string;
  accessory?: string;
};

export type AvatarDefinition = {
  id:      string;
  label:   string;
  layers:  AvatarLayers;
  anchors: AvatarAnchors;
};

// ─── Offrandes ────────────────────────────────────────────────────────────────

/** V1 : coffee, beer, rose, letter. Prêt pour les extensions futures. */
export type OfferType =
  | 'coffee' | 'tea' | 'hotChocolate'         // boissons chaudes
  | 'beer' | 'cocktail' | 'wine' | 'champagne' // alcools
  | 'rose' | 'flower' | 'heart' | 'letter';    // symboliques

export type OfferFamily = 'hotDrink' | 'alcohol' | 'symbolic';

export type OfferAnimationKey =
  | 'drinkHot'
  | 'drinkAlcohol'
  | 'receiveRose'
  | 'openLetter';

export type OfferTrajectoryKey =
  | 'arcToMouth'
  | 'softFloatToTorso'
  | 'glideToTorso';

export type OfferReactionKey =
  | 'wellbeingSmile'
  | 'slurp'
  | 'romanticReceive'
  | 'readLetter';

/** Événement offrande autonome (status pour la file d'attente) */
export type OfferEvent = {
  id:         string;
  category:   'offer';
  type:       OfferType;
  fromUserId: string;
  toUserId:   string;
  createdAt:  number;
  status?:    'queued' | 'running' | 'done';
};

// ─── Réactions ────────────────────────────────────────────────────────────────

export type ReactionType =
  | 'wellbeingSmile'
  | 'slurp'
  | 'romanticReceive'
  | 'readLetter';

// ─── Magie ────────────────────────────────────────────────────────────────────

export type MagicType = 'halo' | 'rain' | 'ghost';

// ─── Transformations ─────────────────────────────────────────────────────────

export type TransformationType = 'pirate' | 'ghost' | 'statue' | 'frog';

// ─── Durée d'effet ────────────────────────────────────────────────────────────

export type TimedEffectDuration = {
  unit:  'seconds' | 'minutes' | 'hours' | 'days';
  value: number;
};

// ─── Événements avatar ────────────────────────────────────────────────────────

export type AvatarEvent =
  | {
      id:         string;
      category:   'offer';
      type:       OfferType;
      fromUserId: string;
      toUserId:   string;
      createdAt:  number;
    }
  | {
      id:         string;
      category:   'magic';
      type:       MagicType;
      fromUserId: string;
      toUserId:   string;
      createdAt:  number;
      duration?:  TimedEffectDuration;
    }
  | {
      id:         string;
      category:   'transformation';
      type:       TransformationType;
      fromUserId: string;
      toUserId:   string;
      createdAt:  number;
      duration?:  TimedEffectDuration;
    };

// ─── Animations de projectile ─────────────────────────────────────────────────

export type ProjectileAnimationKey =
  | 'arcToTarget'
  | 'softFloat'
  | 'glideToTarget'
  | 'popOnHead';

// ─── Animations d'overlay ─────────────────────────────────────────────────────

export type OverlayAnimationKey =
  | 'pulseGlow'
  | 'rainFall'
  | 'ghostFloat'
  | 'popOnHead'
  | 'fadeOverlay'
  | 'stoneFade'
  | 'poofTransform';
