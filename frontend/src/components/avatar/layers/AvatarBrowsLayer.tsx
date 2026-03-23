/**
 * AvatarBrowsLayer — sourcils expressifs
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu au-dessus de la couche yeux.
 * Couleur dérivée de hairColor (légèrement assombrie).
 *
 * Positions :
 *  Sourcil gauche  : au-dessus de (93, 146) → zone y ≈ 124–133
 *  Sourcil droit   : miroir de gauche
 */

import React from 'react';
import { G, Path } from 'react-native-svg';
import { BrowStyle } from '../../../types/avatar';

interface Props {
  browStyle: BrowStyle;
  color:     string;  // couleur dérivée des cheveux
}

// ─── Paths sourcils (espace relatif, gauche) ──────────────────────────────────
// Tracés dans l'espace de l'œil gauche centré à (93, 146).
// Y sourcil ≈ y_œil - 18

const BROW_PATHS: Record<BrowStyle, {
  outer: string;   // tracé principal (trait ou contour)
  inner?: string;  // remplissage si style bold
  strokeWidth: number;
  filled: boolean;
}> = {

  // ── Doux — légèrement arqué, fin et naturel
  soft: {
    outer:       'M 75 128 C 83 122, 95 121, 112 126',
    strokeWidth: 1.8,
    filled:      false,
  },

  // ── Arqués — courbe plus prononcée, canthus interne plus bas
  arched: {
    outer:       'M 75 130 C 82 120, 97 118, 112 126',
    strokeWidth: 2,
    filled:      false,
  },

  // ── Droits — quasiment horizontaux, expression neutre/froide
  straight: {
    outer:       'M 75 127 C 86 125, 100 125, 112 126',
    strokeWidth: 1.9,
    filled:      false,
  },

  // ── Épais — forme pleine, expression forte
  bold: {
    outer:       'M 74 131 C 82 122, 97 120, 112 127 C 110 131, 94 124, 76 134 Z',
    inner:       'M 75 130 C 83 121, 98 119, 112 126',
    strokeWidth: 0,
    filled:      true,
  },
};

// ─── Un sourcil positionné à (cx, cy) ────────────────────────────────────────

function SingleBrow({
  cx, cy, browStyle, color, flipX = false,
}: {
  cx: number; cy: number;
  browStyle: BrowStyle;
  color:     string;
  flipX?:    boolean;
}) {
  const brow  = BROW_PATHS[browStyle];
  const trans = flipX
    ? `translate(${cx + 93},${cy}) scale(-1,1) translate(-93,0)`
    : `translate(${cx - 93},${cy - 146})`;

  return (
    <G transform={trans}>
      {brow.filled ? (
        // Style bold — forme pleine
        <Path
          d={brow.outer}
          fill={color}
          opacity={0.88}
        />
      ) : (
        // Style trait — strokeLinecap arrondi pour aspect naturel
        <Path
          d={brow.outer}
          fill="none"
          stroke={color}
          strokeWidth={brow.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
      )}
    </G>
  );
}

// ─── Composant public ─────────────────────────────────────────────────────────

export function AvatarBrowsLayer({ browStyle, color }: Props) {
  return (
    <G>
      {/* Sourcil gauche */}
      <SingleBrow cx={93} cy={146} browStyle={browStyle} color={color} />
      {/* Sourcil droit — miroir */}
      <SingleBrow cx={147} cy={146} browStyle={browStyle} color={color} flipX />
    </G>
  );
}
