// ─── Types du système d'avatars modulaires JeuTaime ──────────────────────────

export type FaceShape  = 'round' | 'oval' | 'square' | 'heart';
export type SkinTone   = 'fair' | 'light' | 'medium' | 'tan' | 'deep';

export type EyeStyle   = 'almondSoft' | 'almondSharp' | 'relaxed' | 'intense' | 'sleepy';
export type BrowStyle  = 'soft' | 'arched' | 'straight' | 'bold';
export type NoseStyle  = 'small' | 'medium' | 'long' | 'straight' | 'softRound';
export type MouthStyle = 'softSmile' | 'neutral' | 'smirk' | 'slightlyOpen';

export type HairStyle  = 'bald' | 'short' | 'sidePart' | 'textured' | 'curly' | 'long' | 'bun';
export type HairColor  = 'black' | 'darkBrown' | 'brown' | 'blonde' | 'auburn' | 'silver';

export type BeardStyle      = 'none' | 'stubble' | 'mustache' | 'goatee' | 'shortBeard';
export type AccessoryStyle  = 'none' | 'glasses' | 'roundGlasses' | 'earring';

// ─── Couleurs dérivées (calculées à partir du skinTone) ───────────────────────

export interface SkinColors {
  base:       string;  // teinte principale du visage
  mid:        string;  // ombre douce (joues, tempes)
  shadow:     string;  // ombre marquée (sous nez, mâchoire, creux yeux)
  highlight:  string;  // reflet (front, arête du nez)
  lips:       string;  // couleur des lèvres
  lipShadow:  string;  // ombre lèvre inférieure
}

// ─── Configuration complète d'un avatar ──────────────────────────────────────

export interface AvatarConfig {
  faceShape:       FaceShape;
  skinTone:        SkinTone;
  eyeStyle:        EyeStyle;
  eyeColor:        EyeColor;
  browStyle:       BrowStyle;
  noseStyle:       NoseStyle;
  mouthStyle:      MouthStyle;
  hairStyle:       HairStyle;
  hairColor:       HairColor;
  beardStyle:      BeardStyle;
  accessoryStyle:  AccessoryStyle;
}

export type EyeColor = 'hazel' | 'blue' | 'green' | 'brown' | 'dark' | 'gray';

// ─── Config par défaut ────────────────────────────────────────────────────────

export const DEFAULT_AVATAR: AvatarConfig = {
  faceShape:      'oval',
  skinTone:       'light',
  eyeStyle:       'almondSoft',
  eyeColor:       'hazel',
  browStyle:      'soft',
  noseStyle:      'medium',
  mouthStyle:     'softSmile',
  hairStyle:      'short',
  hairColor:      'darkBrown',
  beardStyle:     'none',
  accessoryStyle: 'none',
};
