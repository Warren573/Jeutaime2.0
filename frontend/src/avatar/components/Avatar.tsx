/**
 * Avatar — composant universel, utilisable partout dans l'app.
 * ─────────────────────────────────────────────────────────────────────────────
 * Ordre de rendu (bas → haut) :
 *   AvatarEffectLayer [behind]    ← effets derrière (halo)
 *   AvatarRenderer                ← couches de base (hairBack, head, eyes…)
 *   AvatarTransformationLayer     ← overlay transformation (pirate, rockstar…)
 *   AvatarEffectLayer [front]     ← effets devant (pluie, aura fantôme)
 *   onlineDot                     ← indicateur de présence (optionnel)
 *
 * Ce composant est STATELESS : le parent décide quels effets sont actifs.
 * Pour gérer des effets avec expiration automatique, voir `useAvatarEffectState`.
 *
 * Règles de coexistence gérées ici :
 *   - mutesMagic=true (statue, grenouille, âne, poule) → effets magiques masqués.
 *   - Les effets `behind` (halo) s'affichent sous l'avatar de base.
 *   - Les effets `front` (rain, ghost) s'affichent au-dessus.
 *   - Plusieurs effets peuvent coexister (ex : ['halo', 'rain']).
 *
 * Exemple d'utilisation :
 *   <Avatar
 *     avatar={MOCK_AVATAR_DEFAULT}
 *     size={96}
 *     activeEffects={['halo', 'rain']}
 *     transformation="rockstar"
 *     isOnline
 *   />
 */

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { magicRegistry } from '../config/magicRegistry';
import { transformationRegistry } from '../config/transformationRegistry';
import type { AvatarDefinition, MagicType, TransformationType } from '../types/avatarTypes';
import { AvatarEffectLayer } from './AvatarEffectLayer';
import { AvatarRenderer } from './AvatarRenderer';
import { AvatarTransformationLayer } from './AvatarTransformationLayer';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  /** Définition structurelle : couches visuelles + points d'ancrage. */
  avatar: AvatarDefinition;

  /** Taille en pixels (carré). Default: 96. */
  size?: number;

  /**
   * Effets magiques simultanés.
   * Plusieurs peuvent coexister : ex. ['halo', 'rain'].
   * Valeurs valides : 'halo' | 'rain' | 'ghost'
   * Masqués si la transformation active a mutesMagic=true.
   */
  activeEffects?: MagicType[];

  /**
   * Transformation active (une seule à la fois).
   * ex. 'pirate' | 'rockstar' | 'invisible' | 'donkey' | …
   * null = aucune transformation.
   */
  transformation?: TransformationType | null;

  /** Affiche le point vert de présence en ligne. */
  isOnline?: boolean;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function Avatar({
  avatar,
  size            = 96,
  activeEffects   = [],
  transformation  = null,
  isOnline        = false,
}: AvatarProps) {

  // Certaines transformations (statue, grenouille, âne, poule) gèlent les effets magiques.
  const transDef   = transformation ? transformationRegistry[transformation] : null;
  const mutesMagic = transDef?.mutesMagic ?? false;

  const renderedEffects = mutesMagic ? [] : activeEffects;

  // Séparation par z-layer : halo derrière l'avatar, pluie/aura devant.
  const behindEffects = renderedEffects.filter(t => magicRegistry[t]?.zLayer === 'behind');
  const frontEffects  = renderedEffects.filter(t => magicRegistry[t]?.zLayer === 'front');

  return (
    <View style={[styles.wrapper, { width: size, height: size }]}>

      {/* ① Effets derrière l'avatar (halo) ─────────────────────────────── */}
      {behindEffects.map(type => (
        <AvatarEffectLayer key={type} magic={type} avatarSize={size} />
      ))}

      {/* ② Avatar de base (hairBack → head → eyes → brows → nose → mouth → beard → hairFront → accessory) */}
      <AvatarRenderer avatar={avatar} size={size} />

      {/* ③ Overlay de transformation (pirate, rockstar, invisible…) ─────── */}
      <AvatarTransformationLayer transformation={transformation} avatarSize={size} />

      {/* ④ Effets devant l'avatar (pluie, aura fantôme) ─────────────────── */}
      {frontEffects.map(type => (
        <AvatarEffectLayer key={type} magic={type} avatarSize={size} />
      ))}

      {/* ⑤ Point de présence en ligne ────────────────────────────────────── */}
      {isOnline && <View style={styles.onlineDot} />}

    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  onlineDot: {
    position:        'absolute',
    bottom:          3,
    right:           3,
    width:           11,
    height:          11,
    borderRadius:    6,
    backgroundColor: '#4CAF50',
    borderWidth:     2,
    borderColor:     '#fff',
    zIndex:          999,
  },
});
