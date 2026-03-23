/**
 * AvatarHairLayer — coiffures volumétriques
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu en deux passes :
 *  - HairBack  : cheveux "derrière" l'avatar (sous l'oreille, nuque)
 *  - HairFront : masse principale + reflets + mèches de devant
 *
 * Usage :
 *  <HairBack  ... />   ← rendu AVANT le visage
 *  <HairFront ... />   ← rendu APRÈS les traits du visage
 */

import React from 'react';
import { G, Path, Ellipse, Defs, LinearGradient, Stop } from 'react-native-svg';
import { HairStyle, SkinColors } from '../../../types/avatar';
import { HAIR_COLOR_PALETTE, type HairColor } from '../../../data/avatarCatalog';

interface Props {
  hairStyle: HairStyle;
  hairColor: HairColor;
  skin:      SkinColors;
}

// ─── Couche cheveux DOS ───────────────────────────────────────────────────────

export function AvatarHairBack({ hairStyle, hairColor }: Omit<Props, 'skin'>) {
  const c = HAIR_COLOR_PALETTE[hairColor];

  switch (hairStyle) {
    case 'bald': return null;

    case 'long':
      // Cheveux longs — tombent des deux côtés, s'arrêtent en bas du SVG
      return (
        <G>
          <Path
            d="M 55 110 C 46 130, 38 160, 36 200 C 34 235, 42 265, 52 285 L 62 285 C 54 262, 48 235, 52 200 C 56 165, 64 138, 70 120 Z"
            fill={c.shadow}
          />
          <Path
            d="M 185 110 C 194 130, 202 160, 204 200 C 206 235, 198 265, 188 285 L 178 285 C 186 262, 192 235, 188 200 C 184 165, 176 138, 170 120 Z"
            fill={c.shadow}
          />
        </G>
      );

    case 'bun':
      // Chignon — masse à l'arrière de la tête
      return (
        <G>
          <Path
            d="M 58 108 C 50 128, 44 158, 44 180 C 44 210, 52 240, 60 260 L 68 260 C 62 240, 56 210, 58 180 C 60 158, 66 130, 72 118 Z"
            fill={c.shadow}
          />
          <Path
            d="M 182 108 C 190 128, 196 158, 196 180 C 196 210, 188 240, 180 260 L 172 260 C 178 240, 184 210, 182 180 C 180 158, 174 130, 168 118 Z"
            fill={c.shadow}
          />
        </G>
      );

    default:
      return null;
  }
}

// ─── Couche cheveux FACE ──────────────────────────────────────────────────────

export function AvatarHairFront({ hairStyle, hairColor, skin }: Props) {
  if (hairStyle === 'bald') return null;

  const c = HAIR_COLOR_PALETTE[hairColor];
  const gradId = `hairGrad_${hairColor}`;

  return (
    <G>
      <Defs>
        <LinearGradient id={gradId} x1="0.3" y1="0" x2="0.7" y2="1">
          <Stop offset="0"   stopColor={c.highlight} stopOpacity="1" />
          <Stop offset="0.4" stopColor={c.base}      stopOpacity="1" />
          <Stop offset="1"   stopColor={c.shadow}    stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {hairStyle === 'short'    && <ShortHair    c={c} gradId={gradId} />}
      {hairStyle === 'sidePart' && <SidePartHair c={c} gradId={gradId} />}
      {hairStyle === 'textured' && <TexturedHair c={c} gradId={gradId} />}
      {hairStyle === 'curly'    && <CurlyHair    c={c} gradId={gradId} />}
      {hairStyle === 'long'     && <LongHairFront c={c} gradId={gradId} />}
      {hairStyle === 'bun'      && <BunHair      c={c} gradId={gradId} />}
    </G>
  );
}

// ─── Styles individuels ───────────────────────────────────────────────────────

type HairC = { base: string; shadow: string; highlight: string };

function ShortHair({ c, gradId }: { c: HairC; gradId: string }) {
  return (
    <G>
      {/* Masse principale */}
      <Path
        d="M 65 104 C 68 76, 90 58, 120 56 C 150 58, 172 76, 175 104
           C 170 96, 160 88, 148 84 C 138 80, 130 78, 120 78
           C 110 78, 102 80, 92 84 C 80 88, 70 96, 65 104 Z"
        fill={`url(#${gradId})`}
      />
      {/* Contour arrière — épaisseur visuelle */}
      <Path
        d="M 65 104 C 68 76, 90 58, 120 56 C 150 58, 172 76, 175 104"
        fill="none"
        stroke={c.shadow}
        strokeWidth={14}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Volume principal */}
      <Path
        d="M 67 106 C 69 76, 91 57, 120 55 C 149 57, 171 76, 173 106
           C 168 96, 156 84, 120 80 C 84 84, 72 96, 67 106 Z"
        fill={`url(#${gradId})`}
      />
      {/* Reflet crête */}
      <Ellipse cx={108} cy={68} rx={14} ry={7} fill={c.highlight} opacity={0.4} />
    </G>
  );
}

function SidePartHair({ c, gradId }: { c: HairC; gradId: string }) {
  return (
    <G>
      {/* Base */}
      <Path
        d="M 65 104 C 68 76, 90 58, 120 56 C 150 58, 172 76, 175 104
           C 170 94, 158 83, 138 78 C 120 74, 100 78, 84 86 C 74 92, 68 100, 65 104 Z"
        fill={`url(#${gradId})`}
      />
      <Path
        d="M 65 104 C 68 76, 90 58, 120 56 C 150 58, 172 76, 175 104"
        fill="none" stroke={c.shadow} strokeWidth={13} strokeLinecap="round"
      />
      <Path
        d="M 67 107 C 70 76, 92 56, 120 54 C 148 56, 170 76, 173 107
           C 166 92, 152 79, 128 75 C 108 72, 88 79, 74 94 Z"
        fill={`url(#${gradId})`}
      />
      {/* Raie gauche — mèche qui tombe sur le front */}
      <Path
        d="M 82 64 C 82 72, 78 84, 76 96 C 82 88, 86 80, 90 72 C 86 70, 84 66, 82 64 Z"
        fill={c.shadow}
      />
      <Path
        d="M 88 62 C 86 70, 84 80, 82 90"
        fill="none" stroke={c.highlight} strokeWidth={1.5} strokeLinecap="round" opacity={0.5}
      />
      {/* Reflet */}
      <Ellipse cx={115} cy={65} rx={18} ry={8} fill={c.highlight} opacity={0.35} />
    </G>
  );
}

function TexturedHair({ c, gradId }: { c: HairC; gradId: string }) {
  return (
    <G>
      {/* Base */}
      <Path
        d="M 65 105 C 68 76, 90 58, 120 56 C 150 58, 172 76, 175 105"
        fill="none" stroke={c.shadow} strokeWidth={16} strokeLinecap="round"
      />
      <Path
        d="M 67 108 C 70 76, 92 56, 120 54 C 148 56, 170 76, 173 108
           C 166 92, 150 78, 120 74 C 90 78, 74 92, 67 108 Z"
        fill={`url(#${gradId})`}
      />
      {/* Texture — petites mèches */}
      {[78, 92, 106, 120, 134, 148, 162].map((x, i) => (
        <Path
          key={i}
          d={`M ${x} ${62 + Math.sin(i * 1.1) * 4} C ${x - 4} ${56 + i * 2 % 8} ${x + 4} ${52 + i * 2 % 6} ${x + 2} ${60 + Math.cos(i * 1.2) * 4}`}
          fill="none"
          stroke={i % 2 === 0 ? c.highlight : c.shadow}
          strokeWidth={1.5}
          strokeLinecap="round"
          opacity={0.6}
        />
      ))}
    </G>
  );
}

function CurlyHair({ c, gradId }: { c: HairC; gradId: string }) {
  // Les boucles sont des ellipses superposées
  return (
    <G>
      {/* Volume de base élargi */}
      <Path
        d="M 58 110 C 58 76, 84 52, 120 50 C 156 52, 182 76, 182 110
           C 178 94, 164 76, 148 68 C 136 62, 122 58, 120 58
           C 118 58, 104 62, 92 68 C 76 76, 62 94, 58 110 Z"
        fill={`url(#${gradId})`}
      />
      <Path
        d="M 58 110 C 58 76, 84 52, 120 50 C 156 52, 182 76, 182 110"
        fill="none" stroke={c.shadow} strokeWidth={14} strokeLinecap="round"
      />
      {/* Boucles — ellipses stylisées */}
      {[
        { cx: 72,  cy: 84, rx: 10, ry: 8  },
        { cx: 90,  cy: 67, rx: 10, ry: 8  },
        { cx: 108, cy: 58, rx: 10, ry: 8  },
        { cx: 126, cy: 58, rx: 10, ry: 8  },
        { cx: 144, cy: 66, rx: 10, ry: 8  },
        { cx: 160, cy: 80, rx: 10, ry: 8  },
        { cx: 170, cy: 96, rx: 8,  ry: 6  },
        { cx: 66,  cy: 100, rx: 8, ry: 6  },
      ].map(({ cx, cy, rx, ry }, i) => (
        <Ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry}
          fill={i % 2 === 0 ? c.base : c.shadow}
          opacity={0.85}
        />
      ))}
      {/* Reflets boucles */}
      <Ellipse cx={104} cy={62} rx={10} ry={5} fill={c.highlight} opacity={0.35} />
      <Ellipse cx={136} cy={62} rx={10} ry={5} fill={c.highlight} opacity={0.3}  />
    </G>
  );
}

function LongHairFront({ c, gradId }: { c: HairC; gradId: string }) {
  return (
    <G>
      {/* Masse du dessus */}
      <Path
        d="M 64 106 C 67 76, 90 58, 120 56 C 150 58, 173 76, 176 106"
        fill="none" stroke={c.shadow} strokeWidth={13} strokeLinecap="round"
      />
      <Path
        d="M 65 108 C 68 76, 91 56, 120 54 C 149 56, 172 76, 175 108
           C 168 92, 154 78, 120 74 C 86 78, 72 92, 65 108 Z"
        fill={`url(#${gradId})`}
      />
      {/* Mèches latérales longues */}
      <Path
        d="M 66 108 C 58 130, 50 165, 50 195 C 50 220, 54 245, 60 265 C 56 265, 52 260, 50 250 C 46 230, 42 195, 44 165 C 46 138, 54 118, 60 106 Z"
        fill={c.base}
      />
      <Path
        d="M 174 108 C 182 130, 190 165, 190 195 C 190 220, 186 245, 180 265 C 184 265, 188 260, 190 250 C 194 230, 198 195, 196 165 C 194 138, 186 118, 180 106 Z"
        fill={c.base}
      />
      {/* Reflets sur les mèches */}
      <Path
        d="M 56 120 C 54 145, 50 175, 52 200"
        fill="none" stroke={c.highlight} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round"
      />
      <Path
        d="M 184 120 C 186 145, 190 175, 188 200"
        fill="none" stroke={c.highlight} strokeWidth={2} strokeOpacity={0.35} strokeLinecap="round"
      />
      <Ellipse cx={108} cy={66} rx={16} ry={7} fill={c.highlight} opacity={0.38} />
    </G>
  );
}

function BunHair({ c, gradId }: { c: HairC; gradId: string }) {
  return (
    <G>
      {/* Base du dessus — cheveux remontés */}
      <Path
        d="M 66 108 C 68 80, 90 62, 120 60 C 150 62, 172 80, 174 108"
        fill="none" stroke={c.shadow} strokeWidth={11} strokeLinecap="round"
      />
      <Path
        d="M 68 110 C 70 80, 92 60, 120 58 C 148 60, 170 80, 172 110
           C 166 95, 152 81, 120 77 C 88 81, 74 95, 68 110 Z"
        fill={`url(#${gradId})`}
      />
      {/* Chignon en haut arrière */}
      <Ellipse cx={120} cy={50} rx={18} ry={14} fill={c.shadow} />
      <Ellipse cx={120} cy={50} rx={14} ry={10} fill={c.base}   />
      <Ellipse cx={114} cy={46} rx={6}  ry={4}  fill={c.highlight} opacity={0.4} />
      {/* Élastique */}
      <Ellipse cx={120} cy={57} rx={12} ry={3} fill={c.shadow} opacity={0.8} />
      {/* Petites mèches devant — naturel */}
      <Path
        d="M 82 80 C 80 86, 78 92, 76 98"
        fill="none" stroke={c.base} strokeWidth={2.5} strokeLinecap="round"
      />
      <Path
        d="M 158 80 C 160 86, 162 92, 164 98"
        fill="none" stroke={c.base} strokeWidth={2.5} strokeLinecap="round"
      />
      <Ellipse cx={108} cy={68} rx={12} ry={5} fill={c.highlight} opacity={0.32} />
    </G>
  );
}
