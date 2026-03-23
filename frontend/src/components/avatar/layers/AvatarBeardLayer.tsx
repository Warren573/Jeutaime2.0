/**
 * AvatarBeardLayer — pilosité masculine naturelle
 * ─────────────────────────────────────────────────────────────────────────────
 * Zone : bas du visage, x ≈ 88–152, y ≈ 200–238
 * Couleur : dérivée de hairColor (légèrement assombrie)
 */

import React from 'react';
import { G, Path, Ellipse } from 'react-native-svg';
import { BeardStyle } from '../../../types/avatar';

interface Props {
  beardStyle: BeardStyle;
  color:      string;  // couleur de pilosité
}

export function AvatarBeardLayer({ beardStyle, color }: Props) {
  if (beardStyle === 'none') return null;

  switch (beardStyle) {

    // ── 3 jours — points légers sur la zone barbue
    case 'stubble':
      return (
        <G opacity={0.45}>
          {/* Grille de petits points simulant le duvet */}
          {[
            [94,215],[101,218],[109,220],[117,221],[125,221],[133,220],[141,218],[148,215],
            [91,222],[98,225],[107,228],[116,229],[124,229],[133,228],[142,225],[149,222],
            [95,230],[104,233],[113,234],[122,234],[131,233],[140,233],[148,230],
          ].map(([x, y], i) => (
            <Ellipse key={i} cx={x} cy={y} rx={1.2} ry={1} fill={color} />
          ))}
        </G>
      );

    // ── Moustache — bande au-dessus de la lèvre
    case 'mustache':
      return (
        <G>
          <Path
            d="M 106 204 C 110 200, 116 198, 120 200 C 124 198, 130 200, 134 204
               C 130 206, 125 207, 120 206 C 115 207, 110 206, 106 204 Z"
            fill={color}
            opacity={0.85}
          />
          {/* Volume central — plus foncé */}
          <Path
            d="M 113 203 C 116 200, 120 199, 120 200 C 120 200, 124 200, 127 203"
            fill="none"
            stroke={color}
            strokeWidth={0.8}
            strokeLinecap="round"
            opacity={0.5}
          />
        </G>
      );

    // ── Bouc — moustache + barbiche sous le menton
    case 'goatee':
      return (
        <G>
          {/* Moustache */}
          <Path
            d="M 107 203 C 111 199, 116 198, 120 199 C 124 198, 129 199, 133 203
               C 129 205, 124 206, 120 205 C 116 206, 111 205, 107 203 Z"
            fill={color}
            opacity={0.85}
          />
          {/* Barbiche */}
          <Path
            d="M 112 217 C 113 213, 118 211, 120 212 C 122 211, 127 213, 128 217
               C 126 224, 122 228, 120 228 C 118 228, 114 224, 112 217 Z"
            fill={color}
            opacity={0.8}
          />
          {/* Transition moustache-barbiche */}
          <Path
            d="M 117 206 C 118 209, 120 210, 120 211 C 120 210, 122 209, 123 206"
            fill="none"
            stroke={color}
            strokeWidth={1.5}
            strokeLinecap="round"
            opacity={0.5}
          />
        </G>
      );

    // ── Barbe courte — couvre le bas du visage naturellement
    case 'shortBeard':
      return (
        <G>
          {/* Masse principale de barbe */}
          <Path
            d="M 86 208 C 88 202, 92 198, 96 196
               C 96 196, 96 198, 98 202 C 100 204, 104 205, 107 204
               C 110 200, 115 198, 120 199 C 125 198, 130 200, 133 204
               C 136 205, 140 204, 142 202 C 144 198, 144 196, 144 196
               C 148 198, 152 202, 154 208
               C 152 220, 148 230, 142 236 C 136 240, 128 242, 120 242
               C 112 242, 104 240, 98 236 C 92 230, 88 220, 86 208 Z"
            fill={color}
            opacity={0.78}
          />
          {/* Moustache intégrée — bande plus dense */}
          <Path
            d="M 106 203 C 110 199, 116 198, 120 199 C 124 198, 130 199, 134 203
               C 130 206, 122 207, 120 207 C 118 207, 110 206, 106 203 Z"
            fill={color}
            opacity={0.9}
          />
          {/* Texture — quelques traits de direction */}
          {[
            'M 90 215 C 92 220, 94 226, 96 231',
            'M 100 210 C 100 218, 101 226, 102 232',
            'M 112 207 C 112 216, 112 225, 113 233',
            'M 120 207 C 120 216, 120 226, 120 234',
            'M 128 207 C 128 216, 128 225, 127 233',
            'M 140 210 C 140 218, 139 226, 138 232',
            'M 150 215 C 148 220, 146 226, 144 231',
          ].map((d, i) => (
            <Path
              key={i}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={0.6}
              strokeLinecap="round"
              opacity={0.35}
            />
          ))}
        </G>
      );

    default:
      return null;
  }
}
