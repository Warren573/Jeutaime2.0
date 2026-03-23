/**
 * AvatarBrowsLayer — sourcils expressifs
 * ─────────────────────────────────────────────────────────────────────────────
 * Rendu au-dessus de la couche yeux.
 * Couleur dérivée de hairColor (légèrement assombrie).
 *
 * Positions :
 *  Sourcil gauche  : au-dessus de (93, 146) → zone y ≈ 124–133
 *  Sourcil droit   : miroir de gauche (symétrie autour de x=120)
 */

import React from 'react';
import { G, Path } from 'react-native-svg';
import { BrowStyle } from '../../../types/avatar';

interface Props {
  browStyle: BrowStyle;
  color:     string;  // couleur dérivée des cheveux
}

// ─── Paths sourcils (coordonnées absolues dans le SVG 240×300) ───────────────
// Conçus pour le sourcil GAUCHE (x ≈ 75–112, y ≈ 122–131)
// Le sourcil DROIT est obtenu par symétrie : x' = 240 - x (via transform)

const BROW_PATHS: Record<BrowStyle, {
  outer:       string;
  strokeWidth: number;
  filled:      boolean;
}> = {

  // ── Doux — légèrement arqué, fin et naturel
  soft: {
    outer:       'M 75 129 C 84 122, 97 121, 113 126',
    strokeWidth: 2.2,
    filled:      false,
  },

  // ── Arqués — courbe prononcée, canthus interne plus bas
  arched: {
    outer:       'M 75 131 C 83 120, 98 118, 113 126',
    strokeWidth: 2.4,
    filled:      false,
  },

  // ── Droits — quasiment horizontaux, expression neutre
  straight: {
    outer:       'M 75 128 C 87 125, 101 125, 113 127',
    strokeWidth: 2.3,
    filled:      false,
  },

  // ── Épais — forme pleine, expression forte
  bold: {
    outer:  'M 74 132 C 83 122, 98 120, 113 127 C 111 132, 95 125, 76 135 Z',
    strokeWidth: 0,
    filled: true,
  },
};

// ─── Un sourcil positionné à sa place absolue ─────────────────────────────────

function SingleBrow({
  browStyle, color, flipX = false,
}: {
  browStyle: BrowStyle;
  color:     string;
  flipX?:    boolean;
}) {
  const brow = BROW_PATHS[browStyle];

  // Sourcil gauche : pas de transformation (paths déjà en coordonnées absolues)
  // Sourcil droit  : symétrie horizontale autour de x=120 → x' = 240 - x
  const trans = flipX ? 'translate(240, 0) scale(-1, 1)' : undefined;

  return (
    <G transform={trans}>
      {brow.filled ? (
        <Path d={brow.outer} fill={color} opacity={0.9} />
      ) : (
        <>
          {/* Ombre douce en dessous (volume) */}
          <Path
            d={brow.outer}
            fill="none"
            stroke={color}
            strokeWidth={brow.strokeWidth + 2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.18}
          />
          {/* Trait principal */}
          <Path
            d={brow.outer}
            fill="none"
            stroke={color}
            strokeWidth={brow.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={0.88}
          />
        </>
      )}
    </G>
  );
}

// ─── Composant public ─────────────────────────────────────────────────────────

export function AvatarBrowsLayer({ browStyle, color }: Props) {
  return (
    <G>
      <SingleBrow browStyle={browStyle} color={color} />
      <SingleBrow browStyle={browStyle} color={color} flipX />
    </G>
  );
}
