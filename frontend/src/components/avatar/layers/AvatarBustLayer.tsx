/**
 * AvatarBustLayer — cou, épaules et haut du buste
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu sous toutes les autres couches (fond de scène).
 * ViewBox référence : 0 0 240 300
 */

import React from 'react';
import { G, Path, Ellipse, LinearGradient, Defs, Stop } from 'react-native-svg';
import { SkinColors } from '../../../types/avatar';

interface Props {
  skin: SkinColors;
}

export function AvatarBustLayer({ skin }: Props) {
  return (
    <G>
      <Defs>
        {/* Dégradé buste : plus sombre en bas */}
        <LinearGradient id="bustGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={skin.base}   stopOpacity="1" />
          <Stop offset="1"   stopColor={skin.mid}    stopOpacity="1" />
        </LinearGradient>
        {/* Dégradé cou */}
        <LinearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={skin.mid}    stopOpacity="1" />
          <Stop offset="1"   stopColor={skin.shadow} stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Épaules et buste — forme large et naturelle */}
      <Path
        d="M 0 300 L 0 272 C 18 262, 50 252, 72 246
           C 82 244, 94 242, 100 242
           L 140 242
           C 146 242, 158 244, 168 246
           C 190 252, 222 262, 240 272
           L 240 300 Z"
        fill="url(#bustGrad)"
      />

      {/* Légère ombre de profondeur sous le cou */}
      <Ellipse
        cx={120} cy={250} rx={30} ry={8}
        fill={skin.shadow} opacity={0.18}
      />

      {/* Cou */}
      <Path
        d="M 100 242 C 102 246, 104 252, 104 258
           L 136 258 C 136 252, 138 246, 140 242 Z"
        fill="url(#neckGrad)"
      />

      {/* Ombre latérale du cou (volume) */}
      <Path
        d="M 100 242 C 100 248, 100 256, 102 260 C 104 260, 104 254, 104 248 Z"
        fill={skin.shadow} opacity={0.2}
      />
      <Path
        d="M 140 242 C 140 248, 140 256, 138 260 C 136 260, 136 254, 136 248 Z"
        fill={skin.shadow} opacity={0.2}
      />

      {/* Clavicule — suggestion très subtile */}
      <Path
        d="M 88 264 C 96 260, 112 258, 120 258 C 128 258, 144 260, 152 264"
        fill="none"
        stroke={skin.shadow}
        strokeWidth={0.8}
        strokeOpacity={0.25}
        strokeLinecap="round"
      />
    </G>
  );
}
