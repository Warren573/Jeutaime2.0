/**
 * AvatarMouthLayer — bouche subtile et expressive
 * ─────────────────────────────────────────────────────────────────────────────
 * Composée de :
 *  1. Arc de Cupidon (lèvre supérieure) — forme complexe, pas un simple trait
 *  2. Lèvre inférieure — plus pleine, légèrement saillante
 *  3. Ligne de commissure (fermeture) — très fine
 *  4. Reflet sur la lèvre inf — petite ellipse claire
 *
 * Centre : x=120, y_mids ≈ 208-220
 */

import React from 'react';
import { G, Path, Ellipse } from 'react-native-svg';
import { MouthStyle, SkinColors } from '../../../types/avatar';

interface Props {
  mouthStyle: MouthStyle;
  skin:       SkinColors;
}

export function AvatarMouthLayer({ mouthStyle, skin }: Props) {
  const L  = skin.lips;
  const LS = skin.lipShadow;
  const H  = skin.highlight;

  switch (mouthStyle) {

    // ── Sourire doux — léger retroussement symétrique
    case 'softSmile':
      return (
        <G>
          {/* Lèvre supérieure — arc de Cupidon */}
          <Path
            d="M 104 210 C 108 206, 114 204, 120 206 C 126 204, 132 206, 136 210 C 132 212, 124 213, 120 213 C 116 213, 108 212, 104 210 Z"
            fill={LS}
          />
          {/* Creux de la lèvre sup */}
          <Path
            d="M 111 208 C 114 205, 118 204, 120 206 C 122 204, 126 205, 129 208"
            fill="none" stroke={LS} strokeWidth={0.8} strokeLinecap="round" opacity={0.5}
          />
          {/* Lèvre inférieure */}
          <Path
            d="M 104 210 C 108 218, 115 222, 120 222 C 125 222, 132 218, 136 210 C 128 214, 120 215, 112 214 Z"
            fill={L}
          />
          {/* Reflet lèvre inf */}
          <Ellipse cx={120} cy={217} rx={7} ry={2.5} fill={H} opacity={0.22} />
          {/* Commissures */}
          <Path
            d="M 104 210 C 103 211, 102 211, 102 212"
            fill="none" stroke={LS} strokeWidth={0.7} strokeLinecap="round"
          />
          <Path
            d="M 136 210 C 137 211, 138 211, 138 212"
            fill="none" stroke={LS} strokeWidth={0.7} strokeLinecap="round"
          />
        </G>
      );

    // ── Neutre — lèvres fermées, légèrement détendues
    case 'neutral':
      return (
        <G>
          {/* Lèvre supérieure — plate avec léger arc central */}
          <Path
            d="M 105 210 C 110 208, 115 207, 120 208 C 125 207, 130 208, 135 210 C 130 212, 122 213, 120 213 C 118 213, 110 212, 105 210 Z"
            fill={LS}
          />
          {/* Lèvre inférieure — plus pleine */}
          <Path
            d="M 105 210 C 109 217, 115 220, 120 220 C 125 220, 131 217, 135 210 C 128 213, 122 214, 120 214 C 118 214, 112 213, 105 210 Z"
            fill={L}
          />
          {/* Reflet */}
          <Ellipse cx={120} cy={215} rx={7} ry={2} fill={H} opacity={0.2} />
          {/* Ligne de fermeture */}
          <Path
            d="M 105 210 C 112 211, 120 211, 135 210"
            fill="none" stroke={LS} strokeWidth={0.6} strokeLinecap="round" opacity={0.4}
          />
        </G>
      );

    // ── Coin relevé — smirk unilatéral (côté droit plus haut)
    case 'smirk':
      return (
        <G>
          {/* Lèvre supérieure asymétrique */}
          <Path
            d="M 106 212 C 110 209, 115 207, 120 208 C 126 206, 132 205, 136 208 C 133 210, 126 212, 120 212 C 114 212, 108 213, 106 212 Z"
            fill={LS}
          />
          {/* Lèvre inférieure */}
          <Path
            d="M 106 212 C 109 219, 115 222, 120 222 C 126 222, 132 219, 136 208 C 131 214, 124 215, 120 215 C 116 215, 110 215, 106 212 Z"
            fill={L}
          />
          <Ellipse cx={121} cy={217} rx={7} ry={2.5} fill={H} opacity={0.2} />
          {/* Fossette droite */}
          <Path
            d="M 136 208 C 137 209, 138 210, 137 212"
            fill="none" stroke={LS} strokeWidth={0.8} strokeLinecap="round"
          />
        </G>
      );

    // ── Légèrement ouverte — dents légèrement visibles
    case 'slightlyOpen':
      return (
        <G>
          {/* Lèvre supérieure */}
          <Path
            d="M 105 208 C 109 205, 115 204, 120 205 C 125 204, 131 205, 135 208 C 130 211, 122 212, 120 212 C 118 212, 110 211, 105 208 Z"
            fill={LS}
          />
          {/* Espace buccal — dents (blanc légèrement chaud) */}
          <Path
            d="M 108 210 C 110 213, 115 215, 120 215 C 125 215, 130 213, 132 210 C 128 211, 122 212, 120 212 C 118 212, 112 211, 108 210 Z"
            fill="#F4EEE8"
          />
          {/* Ligne de fermeture dents / séparation lèvres */}
          <Path
            d="M 108 210 C 114 211, 120 212, 132 210"
            fill="none" stroke={LS} strokeWidth={0.5} opacity={0.4}
          />
          {/* Lèvre inférieure */}
          <Path
            d="M 108 210 C 111 219, 116 222, 120 222 C 124 222, 129 219, 132 210 C 127 214, 122 215, 120 215 C 118 215, 113 214, 108 210 Z"
            fill={L}
          />
          <Ellipse cx={120} cy={217} rx={7} ry={2.5} fill={H} opacity={0.22} />
        </G>
      );

    default:
      return null;
  }
}
