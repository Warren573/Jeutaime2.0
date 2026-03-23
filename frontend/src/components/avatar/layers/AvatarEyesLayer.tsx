/**
 * AvatarEyesLayer — yeux dessinés, composés, expressifs
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque œil compose :
 *  1. Sclérotique amande
 *  2. Iris coloré (gradient radial)
 *  3. Pupille
 *  4. Reflets (punctum + secondaire)
 *  5. Creux orbitaire
 *  6. Paupière supérieure (trait épais + ombre de cil)
 *  7. Fan de cils à l'angle externe
 *  8. Paupière inférieure (très subtile)
 *  9. Caroncule (coin interne)
 *
 * Positions :
 *  Œil gauche  : centré à (93, 146)
 *  Œil droit   : centré à (147, 146) — miroir x
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

// Paths écrits pour l'œil gauche, en coordonnées relatives à (0,0).
// Miroir via translate(cx,cy) scale(-1,1) pour l'œil droit.

const EYE_SHAPES: Record<EyeStyle, {
  sclera: string; lidTop: string; lidBottom: string; irisCx: number; irisCy: number;
}> = {

  // ── Amande douce
  almondSoft: {
    sclera:    'M -16 2 C -12 -9, 4 -14, 18 -3 C 14 7, -4 10, -16 2 Z',
    lidTop:    'M -16 2 C -12 -9, 4 -14, 18 -3',
    lidBottom: 'M -16 2 C -8 9, 8 10, 18 -3',
    irisCx: 1,  irisCy: -2,
  },

  // ── Amande vive
  almondSharp: {
    sclera:    'M -17 3 C -14 -11, 5 -16, 20 -5 C 16 6, -5 10, -17 3 Z',
    lidTop:    'M -17 3 C -14 -11, 5 -16, 20 -5',
    lidBottom: 'M -17 3 C -8 10, 9 11, 20 -5',
    irisCx: 2,  irisCy: -3,
  },

  // ── Détendus
  relaxed: {
    sclera:    'M -15 1 C -11 -8, 3 -11, 16 -1 C 12 8, -4 10, -15 1 Z',
    lidTop:    'M -15 1 C -11 -8, 3 -11, 16 -1',
    lidBottom: 'M -15 1 C -7 8, 7 9, 16 -1',
    irisCx: 0,  irisCy: -1,
  },

  // ── Intenses
  intense: {
    sclera:    'M -17 4 C -13 -13, 6 -18, 21 -6 C 17 8, -5 12, -17 4 Z',
    lidTop:    'M -17 4 C -13 -13, 6 -18, 21 -6',
    lidBottom: 'M -17 4 C -8 11, 10 12, 21 -6',
    irisCx: 2,  irisCy: -4,
  },

  // ── Fatigués
  sleepy: {
    sclera:    'M -14 1 C -10 -6, 3 -8, 15 0 C 11 7, -4 8, -14 1 Z',
    lidTop:    'M -14 1 C -10 -6, 3 -8, 15 0',
    lidBottom: 'M -14 1 C -6 6, 6 7, 15 0',
    irisCx: 0,  irisCy: 0,
  },
};

const IRIS_RADIUS: Record<EyeStyle, number> = {
  almondSoft:  7.5,
  almondSharp: 7.5,
  relaxed:     6.5,
  intense:     8.5,
  sleepy:      6,
};

// ─── Un œil complet ───────────────────────────────────────────────────────────

function SingleEye({
  cx, cy, eyeStyle, eyeColor, skin, flipX = false,
}: {
  cx: number; cy: number;
  eyeStyle:  EyeStyle;
  eyeColor:  EyeColor;
  skin:      SkinColors;
  flipX?:    boolean;
}) {
  const shape   = EYE_SHAPES[eyeStyle];
  const colors  = EYE_COLOR_PALETTE[eyeColor];
  const irisR   = IRIS_RADIUS[eyeStyle];
  const pupilR  = irisR * 0.56;
  const irisId  = `iris_${cx}_${cy}`;
  const clipId  = `eyeClip_${cx}_${cy}`;
  const trans   = flipX
    ? `translate(${cx},${cy}) scale(-1,1)`
    : `translate(${cx},${cy})`;

  // Angle externe (outer canthus) en coords locales
  // Pour l'œil gauche (no flip) : outer à droite → x positif grand
  // Pour l'œil droit  (flip)    : outer à gauche dans les coords locales → x négatif grand
  // La valeur 17 est calibrée pour almondSoft ; ±1–2 pour autres styles
  const outerSignX = 1;  // côté outer dans les coords locales (toujours +x)
  // Avec flipX, scale(-1,1) mirroite les x, donc outer reste à +x dans les coords locales
  // mais le fan de cils doit pointer dans la bonne direction SVG.
  // On choisit des coords locales telles que l'outer est toujours à x≈+17..+21.

  return (
    <G transform={trans}>
      <Defs>
        <RadialGradient id={irisId} cx="38%" cy="32%" r="62%">
          <Stop offset="0"   stopColor={colors.inner} stopOpacity="1" />
          <Stop offset="0.55" stopColor={colors.iris}  stopOpacity="1" />
          <Stop offset="1"   stopColor={colors.outer} stopOpacity="1" />
        </RadialGradient>
        <ClipPath id={clipId}>
          <Path d={shape.sclera} />
        </ClipPath>
      </Defs>

      {/* Creux orbitaire — ombre douce au-dessus de l'œil */}
      <Ellipse
        cx={shape.irisCx} cy={shape.irisCy - 3}
        rx={22} ry={15}
        fill={skin.shadow} opacity={0.13}
      />

      {/* Ombre de paupière supérieure (simule l'épaisseur de cil) */}
      <Path
        d={shape.lidTop}
        fill="none"
        stroke="#150C0F"
        strokeWidth={6}
        strokeLinecap="round"
        opacity={0.09}
      />

      {/* Sclérotique (blanc de l'œil) */}
      <Path d={shape.sclera} fill="#F8F5F0" />

      {/* Iris */}
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
        fill="#0C0808"
        clipPath={`url(#${clipId})`}
      />

      {/* Reflet principal — punctum lumineux */}
      <Ellipse
        cx={shape.irisCx - irisR * 0.32} cy={shape.irisCy - irisR * 0.48}
        rx={irisR * 0.3} ry={irisR * 0.21}
        fill="white"
        opacity={0.95}
        clipPath={`url(#${clipId})`}
      />
      {/* Second reflet — petit */}
      <Circle
        cx={shape.irisCx + irisR * 0.32} cy={shape.irisCy + irisR * 0.18}
        r={irisR * 0.12}
        fill="white"
        opacity={0.55}
        clipPath={`url(#${clipId})`}
      />

      {/* Paupière supérieure — trait principal épais */}
      <Path
        d={shape.lidTop}
        fill="none"
        stroke="#150C0F"
        strokeWidth={2.4}
        strokeLinecap="round"
      />

      {/* Fan de cils — angle externe (outer canthus) */}
      {/* Dans les coords locales, l'outer est à x≈+17..+21 pour les deux yeux.
          Avec flipX, scale(-1,1) mirroite → ce qui est à +x en local
          devient à -x en SVG (angle externe réel pour l'œil droit). */}
      <Path
        d={`M ${shape.irisCx + 17} ${shape.irisCy - 3} L ${shape.irisCx + 22} ${shape.irisCy - 9}`}
        fill="none" stroke="#150C0F" strokeWidth={1.4} strokeLinecap="round" opacity={0.88}
      />
      <Path
        d={`M ${shape.irisCx + 19} ${shape.irisCy - 0} L ${shape.irisCx + 24} ${shape.irisCy - 5}`}
        fill="none" stroke="#150C0F" strokeWidth={1.1} strokeLinecap="round" opacity={0.68}
      />
      <Path
        d={`M ${shape.irisCx + 15} ${shape.irisCy - 6} L ${shape.irisCx + 19} ${shape.irisCy - 11}`}
        fill="none" stroke="#150C0F" strokeWidth={0.9} strokeLinecap="round" opacity={0.5}
      />

      {/* Paupière inférieure — ultra-subtile */}
      <Path
        d={shape.lidBottom}
        fill="none"
        stroke="#2A1820"
        strokeWidth={0.55}
        strokeLinecap="round"
        opacity={0.28}
      />

      {/* Coin interne (caroncule) — rose discret */}
      <Ellipse
        cx={-14} cy={1} rx={3} ry={2}
        fill={skin.lips}
        opacity={0.42}
      />
    </G>
  );
}

// ─── Composant public ─────────────────────────────────────────────────────────

export function AvatarEyesLayer({ eyeStyle, eyeColor, skin }: Props) {
  return (
    <G>
      {/* Œil gauche */}
      <SingleEye cx={93}  cy={146} eyeStyle={eyeStyle} eyeColor={eyeColor} skin={skin} />
      {/* Œil droit — miroir horizontal */}
      <SingleEye cx={147} cy={146} eyeStyle={eyeStyle} eyeColor={eyeColor} skin={skin} flipX />
    </G>
  );
}
