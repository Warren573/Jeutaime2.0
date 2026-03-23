/**
 * AvatarRenderer — compositeur SVG modulaire
 * ─────────────────────────────────────────────────────────────────────────────
 * Assemble toutes les couches dans le bon ordre de z-index :
 *
 *  1. Buste / cou / épaules
 *  2. Cheveux DERRIÈRE (nuque, mèches longues)
 *  3. Visage (forme, teint, volumes, oreilles)
 *  4. Yeux
 *  5. Sourcils
 *  6. Nez
 *  7. Bouche
 *  8. Barbe / pilosité
 *  9. Cheveux DEVANT (masse principale, reflets, frange)
 * 10. Accessoires
 *
 * Le ViewBox est fixe : "0 0 240 300"
 * Le rendu est scalé selon la prop `size` (hauteur en px).
 */

import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';

import { AvatarConfig } from '../../types/avatar';
import { SKIN_COLORS, HAIR_COLOR_PALETTE } from '../../data/avatarCatalog';

import { AvatarBustLayer }      from './layers/AvatarBustLayer';
import { AvatarFaceLayer }      from './layers/AvatarFaceLayer';
import { AvatarEyesLayer }      from './layers/AvatarEyesLayer';
import { AvatarBrowsLayer }     from './layers/AvatarBrowsLayer';
import { AvatarNoseLayer }      from './layers/AvatarNoseLayer';
import { AvatarMouthLayer }     from './layers/AvatarMouthLayer';
import { AvatarBeardLayer }     from './layers/AvatarBeardLayer';
import { AvatarAccessoryLayer } from './layers/AvatarAccessoryLayer';
import { AvatarHairBack, AvatarHairFront } from './layers/AvatarHairLayer';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  config:     AvatarConfig;
  /** Hauteur en px — le rendu s'adapte proportionnellement (ratio 240/300) */
  size?:      number;
  /** Fond transparent si false, sinon couleur de fond */
  background?: string | null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function AvatarRenderer({ config, size = 240, background = null }: Props) {
  // Calcul de la largeur pour respecter le ratio 240:300
  const width  = size * (240 / 300);
  const height = size;

  // Palettes de couleurs
  const skin      = SKIN_COLORS[config.skinTone];
  const hairPal   = HAIR_COLOR_PALETTE[config.hairColor];

  // Couleur des sourcils ≈ cheveux légèrement plus foncés
  const browColor = hairPal.shadow;

  // Couleur de pilosité faciale ≈ cheveux sombres
  const beardColor = hairPal.base;

  return (
    <View style={{ width, height }}>
      <Svg
        width={width}
        height={height}
        viewBox="0 0 240 300"
        style={{ overflow: 'visible' }}
      >
        {/* ── Fond (optionnel) ──────────────────────────────────────────────── */}
        {background && (
          <Rect x={0} y={0} width={240} height={300} fill={background} rx={16} />
        )}

        {/* ── 1. Buste + cou + épaules ─────────────────────────────────────── */}
        <AvatarBustLayer skin={skin} />

        {/* ── 2. Cheveux derrière le visage ────────────────────────────────── */}
        <AvatarHairBack
          hairStyle={config.hairStyle}
          hairColor={config.hairColor}
        />

        {/* ── 3. Visage (forme, teint, volumes, oreilles) ──────────────────── */}
        <AvatarFaceLayer
          faceShape={config.faceShape}
          skin={skin}
        />

        {/* ── 4. Yeux ──────────────────────────────────────────────────────── */}
        <AvatarEyesLayer
          eyeStyle={config.eyeStyle}
          eyeColor={config.eyeColor}
          skin={skin}
        />

        {/* ── 5. Sourcils ──────────────────────────────────────────────────── */}
        <AvatarBrowsLayer
          browStyle={config.browStyle}
          color={browColor}
        />

        {/* ── 6. Nez ───────────────────────────────────────────────────────── */}
        <AvatarNoseLayer
          noseStyle={config.noseStyle}
          skin={skin}
        />

        {/* ── 7. Bouche ────────────────────────────────────────────────────── */}
        <AvatarMouthLayer
          mouthStyle={config.mouthStyle}
          skin={skin}
        />

        {/* ── 8. Pilosité ──────────────────────────────────────────────────── */}
        <AvatarBeardLayer
          beardStyle={config.beardStyle}
          color={beardColor}
        />

        {/* ── 9. Cheveux devant (masse principale) ─────────────────────────── */}
        <AvatarHairFront
          hairStyle={config.hairStyle}
          hairColor={config.hairColor}
          skin={skin}
        />

        {/* ── 10. Accessoires ──────────────────────────────────────────────── */}
        <AvatarAccessoryLayer
          accessoryStyle={config.accessoryStyle}
        />
      </Svg>
    </View>
  );
}
