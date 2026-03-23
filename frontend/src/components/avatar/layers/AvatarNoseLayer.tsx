/**
 * AvatarNoseLayer — nez stylisé, volumes sans contour caricatural
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu par des formes d'ombre et de reflet uniquement — pas de trait contour.
 * Centre : x=120, base du nez : y≈182–190 selon le style.
 */

import React from 'react';
import { G, Path, Ellipse } from 'react-native-svg';
import { NoseStyle, SkinColors } from '../../../types/avatar';

interface Props {
  noseStyle: NoseStyle;
  skin:      SkinColors;
}

export function AvatarNoseLayer({ noseStyle, skin }: Props) {
  const s = skin.shadow;
  const h = skin.highlight;

  switch (noseStyle) {

    // ── Petit — très discret, narines proches
    case 'small':
      return (
        <G>
          {/* Arête fine */}
          <Path
            d="M 119 158 C 118 164, 116 172, 116 178 C 117 182, 120 183, 123 181 C 123 173, 121 164, 120 158 Z"
            fill={s} opacity={0.14}
          />
          {/* Narine gauche */}
          <Ellipse cx={113} cy={183} rx={5} ry={3.5}
            fill={s} opacity={0.22} />
          {/* Narine droite */}
          <Ellipse cx={127} cy={183} rx={5} ry={3.5}
            fill={s} opacity={0.22} />
          {/* Reflet arête */}
          <Path
            d="M 120 160 C 120 167, 120 174, 120 179"
            fill="none" stroke={h} strokeWidth={0.8} strokeOpacity={0.3} strokeLinecap="round"
          />
        </G>
      );

    // ── Moyen — équilibré, naturel
    case 'medium':
      return (
        <G>
          {/* Arête du nez */}
          <Path
            d="M 119 155 C 117 163, 114 173, 114 181 C 116 186, 120 188, 124 186 C 124 176, 121 163, 120 155 Z"
            fill={s} opacity={0.15}
          />
          {/* Pointe du nez — volume léger */}
          <Ellipse cx={120} cy={186} rx={8} ry={5} fill={s} opacity={0.1} />
          {/* Narine gauche */}
          <Path
            d="M 110 185 C 108 181, 112 178, 116 180 C 116 184, 113 188, 110 187 Z"
            fill={s} opacity={0.25}
          />
          {/* Narine droite */}
          <Path
            d="M 130 185 C 132 181, 128 178, 124 180 C 124 184, 127 188, 130 187 Z"
            fill={s} opacity={0.25}
          />
          {/* Reflet */}
          <Path
            d="M 120 158 C 120 167, 120 176, 120 182"
            fill="none" stroke={h} strokeWidth={1} strokeOpacity={0.28} strokeLinecap="round"
          />
        </G>
      );

    // ── Long — arête plus haute, profil marqué
    case 'long':
      return (
        <G>
          <Path
            d="M 119 150 C 117 160, 114 172, 113 183 C 115 190, 120 192, 125 190 C 124 177, 121 161, 120 150 Z"
            fill={s} opacity={0.14}
          />
          <Ellipse cx={120} cy={190} rx={9} ry={5.5} fill={s} opacity={0.1} />
          <Path
            d="M 109 188 C 107 183, 111 180, 115 182 C 115 187, 112 191, 109 190 Z"
            fill={s} opacity={0.24}
          />
          <Path
            d="M 131 188 C 133 183, 129 180, 125 182 C 125 187, 128 191, 131 190 Z"
            fill={s} opacity={0.24}
          />
          <Path
            d="M 120 152 C 120 163, 120 175, 120 184"
            fill="none" stroke={h} strokeWidth={0.9} strokeOpacity={0.25} strokeLinecap="round"
          />
        </G>
      );

    // ── Droit — profil rectiligne, narines fines
    case 'straight':
      return (
        <G>
          <Path
            d="M 120 154 C 119 163, 119 173, 119 182 C 120 185, 121 185, 122 182 C 122 173, 121 163, 120 154 Z"
            fill={s} opacity={0.16}
          />
          <Ellipse cx={114} cy={183} rx={4.5} ry={3} fill={s} opacity={0.22} />
          <Ellipse cx={126} cy={183} rx={4.5} ry={3} fill={s} opacity={0.22} />
          <Path
            d="M 120 156 C 120 164, 120 173, 120 182"
            fill="none" stroke={h} strokeWidth={0.9} strokeOpacity={0.32} strokeLinecap="round"
          />
        </G>
      );

    // ── Arrondi doux — large et doux, narines rondes
    case 'softRound':
      return (
        <G>
          <Path
            d="M 119 158 C 116 165, 113 174, 112 183 C 114 189, 120 191, 126 189 C 125 177, 122 166, 120 158 Z"
            fill={s} opacity={0.13}
          />
          <Ellipse cx={120} cy={188} rx={11} ry={6} fill={s} opacity={0.1} />
          <Ellipse cx={111} cy={186} rx={6}  ry={4.5} fill={s} opacity={0.22} />
          <Ellipse cx={129} cy={186} rx={6}  ry={4.5} fill={s} opacity={0.22} />
          <Path
            d="M 120 160 C 120 168, 120 177, 120 184"
            fill="none" stroke={h} strokeWidth={1} strokeOpacity={0.26} strokeLinecap="round"
          />
        </G>
      );

    default:
      return null;
  }
}
