/**
 * AvatarEyesLayer — yeux dessinés, composés, expressifs
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque œil est une composition de :
 *  1. Sclérotique (blanc de l'œil) — forme amande
 *  2. Iris coloré (cercle + gradient subtil)
 *  3. Pupille
 *  4. Reflet de lumière (punctum)
 *  5. Ligne de paupière supérieure (plus marquée)
 *  6. Ligne de paupière inférieure (très subtile)
 *  7. Coin interne (caroncule) — rose discret
 *  8. Creux orbitaire — ombre légère
 *
 * Positions de référence :
 *  Œil gauche  : centré à (93, 146)
 *  Œil droit   : centré à (147, 146)  ← miroir de x=120
 */

import React from 'react';
import {
  G, Path, Circle, Ellipse, Defs, RadialGradient, Stop, ClipPath,
} from 'react-native-svg';
import { EyeColor, EyeStyle, SkinColors } from '../../../types/avatar';
import { EYE_COLOR_PALETTE } from '../../../data/avatarCatalog';

interface Props {
  eyeStyle:  EyeStyle;
  eyeColor:  EyeColor;
  skin:      SkinColors;
}

// ─── Définition SVG d'un œil — positions relatives à son centre ───────────────
// Toutes les valeurs sont des offsets depuis (cx, cy).
// On utilise cx=93 pour gauche, cx=147 pour droite (miroir via scaleX(-1)).

interface EyeShape {
  // chemin de la sclérotique (blanc)
  sclera:    string;
  // paupière sup (trait fin)
  lidTop:    string;
  // paupière inf (ultra-subtil)
  lidBottom: string;
  // clip du blanc (même que sclera pour contraindre iris)
  clip:      string;
  // centre de l'iris (offset depuis le coin interne)
  irisDx:   number;  // delta X depuis inner corner
  irisDy:   number;  // delta Y depuis inner corner
}

// Les paths sont écrits pour l'œil GAUCHE, centré à (0,0)
// On translate ensuite vers (93, 146) et (147, 146)

const EYE_SHAPES: Record<EyeStyle, {
  sclera: string; lidTop: string; lidBottom: string; irisCx: number; irisCy: number;
}> = {

  // ── Amande douce — tilt canthus externe léger, paupières équilibrées
  almondSoft: {
    sclera:    'M -16 2 C -12 -9, 4 -14, 18 -3 C 14 7, -4 10, -16 2 Z',
    lidTop:    'M -16 2 C -12 -9, 4 -14, 18 -3',
    lidBottom: 'M -16 2 C -8 9, 8 10, 18 -3',
    irisCx: 1,  irisCy: -2,
  },

  // ── Amande vive — tilt plus prononcé, œil plus allongé
  almondSharp: {
    sclera:    'M -17 3 C -14 -11, 5 -16, 20 -5 C 16 6, -5 10, -17 3 Z',
    lidTop:    'M -17 3 C -14 -11, 5 -16, 20 -5',
    lidBottom: 'M -17 3 C -8 10, 9 11, 20 -5',
    irisCx: 2,  irisCy: -3,
  },

  // ── Détendus — angle horizontal, paupière sup légèrement tombante
  relaxed: {
    sclera:    'M -15 1 C -11 -8, 3 -11, 16 -1 C 12 8, -4 10, -15 1 Z',
    lidTop:    'M -15 1 C -11 -8, 3 -11, 16 -1',
    lidBottom: 'M -15 1 C -7 8, 7 9, 16 -1',
    irisCx: 0,  irisCy: -1,
  },

  // ── Intenses — grand ouvert, tilt plus fort, œil plus haut
  intense: {
    sclera:    'M -17 4 C -13 -13, 6 -18, 21 -6 C 17 8, -5 12, -17 4 Z',
    lidTop:    'M -17 4 C -13 -13, 6 -18, 21 -6',
    lidBottom: 'M -17 4 C -8 11, 10 12, 21 -6',
    irisCx: 2,  irisCy: -4,
  },

  // ── Fatigués — paupière sup basse, angle légèrement tombant
  sleepy: {
    sclera:    'M -14 1 C -10 -6, 3 -8, 15 0 C 11 7, -4 8, -14 1 Z',
    lidTop:    'M -14 1 C -10 -6, 3 -8, 15 0',
    lidBottom: 'M -14 1 C -6 6, 6 7, 15 0',
    irisCx: 0,  irisCy: 0,
  },
};

// ─── Iris radius par style ────────────────────────────────────────────────────
const IRIS_RADIUS: Record<EyeStyle, number> = {
  almondSoft:  7.5,
  almondSharp: 7.5,
  relaxed:     6.5,
  intense:     8.5,
  sleepy:      6,
};

// ─── Un œil complet, positionné à (cx, cy) ───────────────────────────────────

function SingleEye({
  cx, cy, eyeStyle, eyeColor, skin, flipX = false,
}: {
  cx: number; cy: number;
  eyeStyle:  EyeStyle;
  eyeColor:  EyeColor;
  skin:      SkinColors;
  flipX?:    boolean;
}) {
  const shape    = EYE_SHAPES[eyeStyle];
  const colors   = EYE_COLOR_PALETTE[eyeColor];
  const irisR    = IRIS_RADIUS[eyeStyle];
  const pupilR   = irisR * 0.58;
  const irisId   = `iris_${cx}_${cy}`;
  const clipId   = `eyeClip_${cx}_${cy}`;
  const scaleStr = flipX ? `translate(${cx},${cy}) scale(-1,1)` : `translate(${cx},${cy})`;

  return (
    <G transform={scaleStr}>
      <Defs>
        {/* Gradient radial de l'iris — donne de la profondeur */}
        <RadialGradient id={irisId} cx="40%" cy="35%" r="60%">
          <Stop offset="0"   stopColor={colors.inner} stopOpacity="1" />
          <Stop offset="0.6" stopColor={colors.iris}  stopOpacity="1" />
          <Stop offset="1"   stopColor={colors.outer} stopOpacity="1" />
        </RadialGradient>
        {/* Clip pour masquer l'iris hors du blanc */}
        <ClipPath id={clipId}>
          <Path d={shape.sclera} />
        </ClipPath>
      </Defs>

      {/* Creux orbitaire — très léger fond ombré */}
      <Ellipse cx={shape.irisCx} cy={shape.irisCy - 1} rx={20} ry={14}
        fill={skin.shadow} opacity={0.08} />

      {/* Sclérotique (blanc de l'œil) */}
      <Path d={shape.sclera} fill="#F8F5F2" />

      {/* Iris — clippé dans le blanc */}
      <Circle
        cx={shape.irisCx} cy={shape.irisCy}
        r={irisR}
        fill={`url(#${irisId})`}
        clipPath={`url(#${clipId})`}
      />

      {/* Pupille */}
      <Circle
        cx={shape.irisCx} cy={shape.irisCy}
        r={pupilR}
        fill="#0E0808"
        clipPath={`url(#${clipId})`}
      />

      {/* Reflet principal (punctum lumineux) */}
      <Ellipse
        cx={shape.irisCx - irisR * 0.35} cy={shape.irisCy - irisR * 0.5}
        rx={irisR * 0.25} ry={irisR * 0.18}
        fill="white"
        opacity={0.92}
        clipPath={`url(#${clipId})`}
      />
      {/* Second reflet — plus petit */}
      <Circle
        cx={shape.irisCx + irisR * 0.3} cy={shape.irisCy + irisR * 0.1}
        r={irisR * 0.1}
        fill="white"
        opacity={0.5}
        clipPath={`url(#${clipId})`}
      />

      {/* Ligne de paupière supérieure — trait fin et expressif */}
      <Path
        d={shape.lidTop}
        fill="none"
        stroke="#1A0E12"
        strokeWidth={1.4}
        strokeLinecap="round"
      />
      {/* Légère extension aux coins (cils stylisés) */}
      <Path
        d={`M ${shape.irisCx + 17} ${shape.irisCy - 3} L ${shape.irisCx + 21} ${shape.irisCy - 6}`}
        fill="none"
        stroke="#1A0E12"
        strokeWidth={1}
        strokeLinecap="round"
        opacity={0.7}
      />

      {/* Ligne de paupière inférieure — ultra-subtile */}
      <Path
        d={shape.lidBottom}
        fill="none"
        stroke="#2A1A20"
        strokeWidth={0.5}
        strokeLinecap="round"
        opacity={0.35}
      />

      {/* Coin interne (caroncule) — petite touche rosée */}
      <Ellipse
        cx={-15} cy={1} rx={3} ry={2}
        fill={skin.lips}
        opacity={0.4}
      />
    </G>
  );
}

// ─── Composant public ─────────────────────────────────────────────────────────

export function AvatarEyesLayer({ eyeStyle, eyeColor, skin }: Props) {
  return (
    <G>
      {/* Œil gauche */}
      <SingleEye
        cx={93} cy={146}
        eyeStyle={eyeStyle}
        eyeColor={eyeColor}
        skin={skin}
      />
      {/* Œil droit — miroir horizontal (flipX) */}
      <SingleEye
        cx={147} cy={146}
        eyeStyle={eyeStyle}
        eyeColor={eyeColor}
        skin={skin}
        flipX
      />
    </G>
  );
}
