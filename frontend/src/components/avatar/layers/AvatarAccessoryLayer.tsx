/**
 * AvatarAccessoryLayer — lunettes et boucles d'oreilles
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu au-dessus de tout sauf les cheveux du front.
 */

import React from 'react';
import { G, Path, Rect, Circle, Ellipse, Line } from 'react-native-svg';
import { AccessoryStyle } from '../../../types/avatar';

interface Props {
  accessoryStyle: AccessoryStyle;
}

export function AvatarAccessoryLayer({ accessoryStyle }: Props) {
  if (accessoryStyle === 'none') return null;

  switch (accessoryStyle) {

    // ── Lunettes rectangulaires — monture fine, style contemporain
    case 'glasses':
      return (
        <G>
          {/* Monture — cadre fin */}
          {/* Verre gauche */}
          <Rect
            x={71} y={137} width={38} height={24}
            rx={5} ry={5}
            fill="none"
            stroke="#2A2A2A"
            strokeWidth={1.6}
          />
          {/* Verre droit */}
          <Rect
            x={131} y={137} width={38} height={24}
            rx={5} ry={5}
            fill="none"
            stroke="#2A2A2A"
            strokeWidth={1.6}
          />
          {/* Pont central */}
          <Path
            d="M 109 148 C 113 145, 127 145, 131 148"
            fill="none"
            stroke="#2A2A2A"
            strokeWidth={1.4}
            strokeLinecap="round"
          />
          {/* Branches */}
          <Path
            d="M 71 147 C 62 148, 48 150, 44 152"
            fill="none" stroke="#2A2A2A" strokeWidth={1.3} strokeLinecap="round"
          />
          <Path
            d="M 169 147 C 178 148, 192 150, 196 152"
            fill="none" stroke="#2A2A2A" strokeWidth={1.3} strokeLinecap="round"
          />
          {/* Reflet verre — diagonale subtile */}
          <Path
            d="M 76 140 C 79 143, 80 146, 79 149"
            fill="none" stroke="white" strokeWidth={1.2} strokeOpacity={0.45} strokeLinecap="round"
          />
          <Path
            d="M 136 140 C 139 143, 140 146, 139 149"
            fill="none" stroke="white" strokeWidth={1.2} strokeOpacity={0.45} strokeLinecap="round"
          />
          {/* Teinte des verres */}
          <Rect
            x={71} y={137} width={38} height={24} rx={5} ry={5}
            fill="#A8C8E8" opacity={0.12}
          />
          <Rect
            x={131} y={137} width={38} height={24} rx={5} ry={5}
            fill="#A8C8E8" opacity={0.12}
          />
        </G>
      );

    // ── Lunettes rondes — style vintage/élégant
    case 'roundGlasses':
      return (
        <G>
          {/* Verre gauche */}
          <Circle
            cx={91} cy={149} r={19}
            fill="none" stroke="#5A3A1A" strokeWidth={1.8}
          />
          {/* Verre droit */}
          <Circle
            cx={149} cy={149} r={19}
            fill="none" stroke="#5A3A1A" strokeWidth={1.8}
          />
          {/* Pont */}
          <Path
            d="M 110 149 C 116 146, 124 146, 130 149"
            fill="none" stroke="#5A3A1A" strokeWidth={1.5} strokeLinecap="round"
          />
          {/* Branches */}
          <Path
            d="M 72 149 C 62 150, 50 152, 44 153"
            fill="none" stroke="#5A3A1A" strokeWidth={1.3} strokeLinecap="round"
          />
          <Path
            d="M 168 149 C 178 150, 190 152, 196 153"
            fill="none" stroke="#5A3A1A" strokeWidth={1.3} strokeLinecap="round"
          />
          {/* Teinte verres */}
          <Circle cx={91}  cy={149} r={18} fill="#D4A870" opacity={0.08} />
          <Circle cx={149} cy={149} r={18} fill="#D4A870" opacity={0.08} />
          {/* Reflets */}
          <Ellipse cx={83}  cy={143} rx={5} ry={3} fill="white" opacity={0.3}  />
          <Ellipse cx={141} cy={143} rx={5} ry={3} fill="white" opacity={0.3}  />
        </G>
      );

    // ── Boucle d'oreille — anneau fin à l'oreille gauche
    case 'earring':
      return (
        <G>
          {/* Boucle droite (visible de face) */}
          <Circle
            cx={199} cy={165} r={6}
            fill="none"
            stroke="#D4A830"
            strokeWidth={2}
          />
          {/* Attache */}
          <Circle cx={199} cy={159} r={2} fill="#D4A830" />
          {/* Second anneau — plus discret */}
          <Circle
            cx={199} cy={175} r={4}
            fill="none"
            stroke="#D4A830"
            strokeWidth={1.5}
            opacity={0.7}
          />
        </G>
      );

    default:
      return null;
  }
}
