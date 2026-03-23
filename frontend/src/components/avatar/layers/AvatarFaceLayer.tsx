/**
 * AvatarFaceLayer — forme du visage + teint + volumes subtils
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère 4 formes de visage : round, oval, square, heart
 * Applique des ombres et reflets en shapes SVG (pas de filtres lourds).
 */

import React from 'react';
import {
  G, Path, Ellipse, Defs, LinearGradient, Stop, ClipPath, Rect,
} from 'react-native-svg';
import { FaceShape, SkinColors } from '../../../types/avatar';

interface Props {
  faceShape: FaceShape;
  skin:      SkinColors;
}

// ─── Paths SVG par forme de visage ────────────────────────────────────────────
// Coordonnées dans un espace 240×300

const FACE_PATHS: Record<FaceShape, string> = {
  oval:
    'M 120 67 C 182 67, 202 108, 198 150 C 194 192, 168 238, 120 240 C 72 238, 46 192, 42 150 C 38 108, 58 67, 120 67 Z',

  round:
    'M 120 74 C 178 74, 200 112, 197 155 C 194 198, 166 236, 120 236 C 74 236, 46 198, 43 155 C 40 112, 62 74, 120 74 Z',

  square:
    'M 120 68 C 172 68, 196 100, 196 140 C 196 185, 194 218, 168 234 C 152 242, 88 242, 72 234 C 46 218, 44 185, 44 140 C 44 100, 68 68, 120 68 Z',

  heart:
    // Large en haut, se rétrécit vers un menton pointu
    'M 120 68 C 172 68, 200 105, 196 146 C 192 182, 172 214, 152 230 C 140 242, 100 242, 88 230 C 68 214, 48 182, 44 146 C 40 105, 68 68, 120 68 Z',
};

export function AvatarFaceLayer({ faceShape, skin }: Props) {
  const facePath = FACE_PATHS[faceShape];

  return (
    <G>
      <Defs>
        {/* Dégradé vertical du visage : front clair → menton moins lumineux */}
        <LinearGradient id="faceGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0"    stopColor={skin.highlight} stopOpacity="1" />
          <Stop offset="0.35" stopColor={skin.base}      stopOpacity="1" />
          <Stop offset="1"    stopColor={skin.mid}       stopOpacity="1" />
        </LinearGradient>

        {/* Clip du visage — pour contenir les ombres internes */}
        <ClipPath id="faceClip">
          <Path d={facePath} />
        </ClipPath>
      </Defs>

      {/* ── Forme principale du visage ──────────────────────────────────────── */}
      <Path d={facePath} fill="url(#faceGrad)" />

      {/* ── Ombres internes (volumes du visage) ─────────────────────────────── */}
      {/* Ombre temporale gauche */}
      <Ellipse
        cx={60} cy={155} rx={22} ry={45}
        fill={skin.shadow}
        opacity={0.1}
        clipPath="url(#faceClip)"
      />
      {/* Ombre temporale droite */}
      <Ellipse
        cx={180} cy={155} rx={22} ry={45}
        fill={skin.shadow}
        opacity={0.1}
        clipPath="url(#faceClip)"
      />
      {/* Ombre sous les pommettes */}
      <Ellipse
        cx={72}  cy={185} rx={16} ry={10}
        fill={skin.shadow}
        opacity={0.1}
        clipPath="url(#faceClip)"
      />
      <Ellipse
        cx={168} cy={185} rx={16} ry={10}
        fill={skin.shadow}
        opacity={0.1}
        clipPath="url(#faceClip)"
      />
      {/* Reflet central du front */}
      <Ellipse
        cx={120} cy={95} rx={28} ry={18}
        fill={skin.highlight}
        opacity={0.35}
        clipPath="url(#faceClip)"
      />

      {/* ── Oreilles ────────────────────────────────────────────────────────── */}
      {/* Oreille gauche */}
      <Path
        d="M 44 148 C 38 146, 32 150, 30 158 C 28 166, 32 174, 40 175 C 44 175, 47 172, 47 168"
        fill={skin.base}
      />
      <Path
        d="M 38 154 C 34 156, 32 162, 34 168 C 36 172, 40 173, 42 170"
        fill="none"
        stroke={skin.shadow}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
      {/* Oreille droite */}
      <Path
        d="M 196 148 C 202 146, 208 150, 210 158 C 212 166, 208 174, 200 175 C 196 175, 193 172, 193 168"
        fill={skin.base}
      />
      <Path
        d="M 202 154 C 206 156, 208 162, 206 168 C 204 172, 200 173, 198 170"
        fill="none"
        stroke={skin.shadow}
        strokeWidth={0.8}
        strokeOpacity={0.5}
        strokeLinecap="round"
      />
    </G>
  );
}
