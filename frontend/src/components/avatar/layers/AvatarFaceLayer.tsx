/**
 * AvatarFaceLayer — forme du visage + teint + volumes + éclats
 * ─────────────────────────────────────────────────────────────────────────────
 * Gère 4 formes de visage : round, oval, square, heart
 * Ombres et reflets renforcés pour un portrait illustré premium.
 */

import React from 'react';
import {
  G, Path, Ellipse, Defs, LinearGradient, Stop, ClipPath,
} from 'react-native-svg';
import { FaceShape, SkinColors } from '../../../types/avatar';

interface Props {
  faceShape: FaceShape;
  skin:      SkinColors;
}

const FACE_PATHS: Record<FaceShape, string> = {
  oval:
    'M 120 67 C 182 67, 202 108, 198 150 C 194 192, 168 238, 120 240 C 72 238, 46 192, 42 150 C 38 108, 58 67, 120 67 Z',

  round:
    'M 120 74 C 178 74, 200 112, 197 155 C 194 198, 166 236, 120 236 C 74 236, 46 198, 43 155 C 40 112, 62 74, 120 74 Z',

  square:
    'M 120 68 C 172 68, 196 100, 196 140 C 196 185, 194 218, 168 234 C 152 242, 88 242, 72 234 C 46 218, 44 185, 44 140 C 44 100, 68 68, 120 68 Z',

  heart:
    'M 120 68 C 172 68, 200 105, 196 146 C 192 182, 172 214, 152 230 C 140 242, 100 242, 88 230 C 68 214, 48 182, 44 146 C 40 105, 68 68, 120 68 Z',
};

export function AvatarFaceLayer({ faceShape, skin }: Props) {
  const facePath = FACE_PATHS[faceShape];

  return (
    <G>
      <Defs>
        {/* Dégradé principal : front lumineux → tempes → menton ombré */}
        <LinearGradient id="faceGrad" x1="0.5" y1="0" x2="0.5" y2="1">
          <Stop offset="0"    stopColor={skin.highlight} stopOpacity="1" />
          <Stop offset="0.28" stopColor={skin.base}      stopOpacity="1" />
          <Stop offset="0.72" stopColor={skin.base}      stopOpacity="1" />
          <Stop offset="1"    stopColor={skin.mid}       stopOpacity="1" />
        </LinearGradient>

        {/* Clip du visage — pour contenir les ombres internes */}
        <ClipPath id="faceClip">
          <Path d={facePath} />
        </ClipPath>
      </Defs>

      {/* ── Oreilles (derrière le visage) ────────────────────────────────────── */}
      <Path
        d="M 44 148 C 38 146, 31 150, 29 159 C 27 168, 31 176, 40 177 C 44 177, 47 174, 47 169"
        fill={skin.base}
      />
      <Path
        d="M 37 154 C 33 157, 31 163, 33 169 C 35 174, 40 175, 42 171"
        fill="none" stroke={skin.shadow} strokeWidth={0.9} strokeOpacity={0.45} strokeLinecap="round"
      />
      <Path
        d="M 196 148 C 202 146, 209 150, 211 159 C 213 168, 209 176, 200 177 C 196 177, 193 174, 193 169"
        fill={skin.base}
      />
      <Path
        d="M 203 154 C 207 157, 209 163, 207 169 C 205 174, 200 175, 198 171"
        fill="none" stroke={skin.shadow} strokeWidth={0.9} strokeOpacity={0.45} strokeLinecap="round"
      />

      {/* ── Forme principale du visage ────────────────────────────────────────── */}
      <Path d={facePath} fill="url(#faceGrad)" />

      {/* ── Volumes (ombres internes) ──────────────────────────────────────────── */}
      {/* Ombres temporales */}
      <Ellipse cx={58}  cy={155} rx={24} ry={48} fill={skin.shadow} opacity={0.16} clipPath="url(#faceClip)" />
      <Ellipse cx={182} cy={155} rx={24} ry={48} fill={skin.shadow} opacity={0.16} clipPath="url(#faceClip)" />

      {/* Ombres sous les pommettes */}
      <Ellipse cx={70}  cy={188} rx={18} ry={11} fill={skin.shadow} opacity={0.14} clipPath="url(#faceClip)" />
      <Ellipse cx={170} cy={188} rx={18} ry={11} fill={skin.shadow} opacity={0.14} clipPath="url(#faceClip)" />

      {/* Reflet central du front */}
      <Ellipse cx={120} cy={92} rx={30} ry={20} fill={skin.highlight} opacity={0.42} clipPath="url(#faceClip)" />

      {/* Éclat des pommettes (catch-light) */}
      <Ellipse cx={80}  cy={175} rx={14} ry={8} fill={skin.highlight} opacity={0.22} clipPath="url(#faceClip)" />
      <Ellipse cx={160} cy={175} rx={14} ry={8} fill={skin.highlight} opacity={0.22} clipPath="url(#faceClip)" />

      {/* Rougeur des joues — très subtile */}
      <Ellipse cx={76}  cy={178} rx={20} ry={13} fill={skin.lips} opacity={0.07} clipPath="url(#faceClip)" />
      <Ellipse cx={164} cy={178} rx={20} ry={13} fill={skin.lips} opacity={0.07} clipPath="url(#faceClip)" />

      {/* Ombre sous le menton / structure du bas du visage */}
      <Ellipse cx={120} cy={228} rx={26} ry={9} fill={skin.shadow} opacity={0.13} clipPath="url(#faceClip)" />

      {/* Reflet du nez (arête) — ponctuel, très discret */}
      <Ellipse cx={120} cy={168} rx={4} ry={8} fill={skin.highlight} opacity={0.18} clipPath="url(#faceClip)" />
    </G>
  );
}
