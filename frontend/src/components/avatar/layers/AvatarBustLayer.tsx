/**
 * AvatarBustLayer — cou, épaules et haut du buste
 * ─────────────────────────────────────────────────────────────────────────────
 * IMPORTANT : le crop circulaire de AvatarCircle expose le SVG y=55→255.
 * Les épaules doivent donc commencer AVANT y=255 pour être visibles.
 * Nouveau design : épaules à y≈222–252.
 *
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
        {/* Dégradé buste : base → ombre en bas */}
        <LinearGradient id="bustGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={skin.base}   stopOpacity="1" />
          <Stop offset="0.5" stopColor={skin.mid}    stopOpacity="1" />
          <Stop offset="1"   stopColor={skin.shadow} stopOpacity="1" />
        </LinearGradient>
        {/* Dégradé cou : clair en haut → ombre en bas */}
        <LinearGradient id="neckGrad" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0"   stopColor={skin.base}   stopOpacity="1" />
          <Stop offset="1"   stopColor={skin.mid}    stopOpacity="1" />
        </LinearGradient>
      </Defs>

      {/* Épaules et buste — remontées pour être visibles dans le crop y<255 */}
      <Path
        d="M 0 300 L 0 252
           C 24 240, 58 230, 84 226
           C 96 224, 106 222, 112 222
           L 128 222
           C 134 222, 144 224, 156 226
           C 182 230, 216 240, 240 252
           L 240 300 Z"
        fill="url(#bustGrad)"
      />

      {/* Cou */}
      <Path
        d="M 108 222 C 108 228, 108 236, 108 244
           L 132 244 C 132 236, 132 228, 132 222 Z"
        fill="url(#neckGrad)"
      />

      {/* Ombres latérales du cou (volume) */}
      <Path
        d="M 108 222 C 108 230, 108 238, 109 244 C 111 244, 111 238, 110 230 Z"
        fill={skin.shadow} opacity={0.22}
      />
      <Path
        d="M 132 222 C 132 230, 132 238, 131 244 C 129 244, 129 238, 130 230 Z"
        fill={skin.shadow} opacity={0.22}
      />

      {/* Ombre de profondeur à la jonction cou/épaules */}
      <Ellipse cx={120} cy={244} rx={26} ry={7} fill={skin.shadow} opacity={0.2} />

      {/* Clavicule — suggestion subtile */}
      <Path
        d="M 84 236 C 98 232, 112 230, 120 230 C 128 230, 142 232, 156 236"
        fill="none"
        stroke={skin.shadow}
        strokeWidth={1.0}
        strokeOpacity={0.28}
        strokeLinecap="round"
      />
    </G>
  );
}
