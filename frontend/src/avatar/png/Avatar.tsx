/**
 * Avatar — composant modulaire PNG, universel (salons, profils, cards…).
 * ─────────────────────────────────────────────────────────────────────────────
 * Chaque couche est un PNG 512×512 transparent rendu en position absolute,
 * width/height 100%, dans un conteneur carré en position relative.
 * Les couches se superposent pixel-perfect sans décalage.
 *
 * ─── ORDRE DE RENDU (bas → haut) ────────────────────────────────────────────
 *   1. body           Corps / silhouette de base
 *   2. clothes        Vêtements
 *   3. head           Tête / carnation
 *   4. nose           Nez
 *   5. mouth          Bouche
 *   6. pilosite       Barbe, moustache…
 *   7. hair           Cheveux
 *   8. earrings       Boucles d'oreilles
 *   9. accessory      Lunettes, chapeau, bijoux…
 *  10. effect         Effets visuels (glow, sparkles, halo…)
 *  11. transformation Transformations (fantôme, pirate, grenouille…)
 *
 * ─── UTILISATION ─────────────────────────────────────────────────────────────
 *   <Avatar
 *     size={200}
 *     clothes="clothes_01"
 *     nose="nose_01"
 *     mouth="mouth_01"
 *     pilosite="beard_01"
 *     hair="hair_01"
 *     earrings="earrings_01"
 *     accessory="glasses_01"
 *     effect="glow_01"
 *     transformation={null}
 *   />
 *
 * ─── NOTES ───────────────────────────────────────────────────────────────────
 * - `body` et `head` ont des valeurs par défaut ('body_default' / 'head_default').
 * - Toutes les autres couches sont optionnelles. null ou absent = couche invisible.
 * - Un ID non enregistré dans le registre = couche silencieusement ignorée.
 * - Pour ajouter un asset : voir registry.ts.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getAsset } from './registry';

// ─── Ordre de rendu ───────────────────────────────────────────────────────────

const LAYER_ORDER = [
  'body',
  'clothes',
  'head',
  'nose',
  'mouth',
  'pilosite',
  'hair',
  'earrings',
  'accessory',
  'effect',
  'transformation',
] as const;

type LayerKey = (typeof LAYER_ORDER)[number];

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AvatarProps {
  /** Taille en pixels (carré). Default: 200. */
  size?: number;

  // ── Couches de base ──────────────────────────────────────────────────────
  /** Corps / silhouette. Default: 'body_default'. */
  body?: string | null;
  /** Tête / carnation. Default: 'head_default'. */
  head?: string | null;

  // ── Couches optionnelles ─────────────────────────────────────────────────
  /** Vêtements. */
  clothes?: string | null;
  /** Nez. */
  nose?: string | null;
  /** Bouche. */
  mouth?: string | null;
  /** Pilosité faciale (barbe, moustache…). */
  pilosite?: string | null;
  /** Cheveux. */
  hair?: string | null;
  /** Boucles d'oreilles. */
  earrings?: string | null;
  /** Accessoire (lunettes, chapeau…). */
  accessory?: string | null;
  /** Effet visuel temporaire (glow, sparkles, halo…). */
  effect?: string | null;
  /** Transformation (fantôme, pirate, grenouille…). null = aucune. */
  transformation?: string | null;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const Avatar = memo(function Avatar({
  size           = 200,
  body           = 'body_default',
  head           = 'head_default',
  clothes,
  nose,
  mouth,
  pilosite,
  hair,
  earrings,
  accessory,
  effect,
  transformation,
}: AvatarProps) {

  // Map slot → ID pour itération dans l'ordre garanti
  const layers: Record<LayerKey, string | null | undefined> = {
    body,
    clothes,
    head,
    nose,
    mouth,
    pilosite,
    hair,
    earrings,
    accessory,
    effect,
    transformation,
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {LAYER_ORDER.map(slot => {
        const source = getAsset(layers[slot]);
        if (!source) return null;               // couche absente ou non enregistrée

        return (
          <Image
            key={slot}
            source={source}
            style={styles.layer}
            resizeMode="contain"
            fadeDuration={0}                    // pas de fondu parasitaire au chargement
          />
        );
      })}
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  /** Conteneur carré de référence. Position relative = ancre pour les enfants. */
  container: {
    position: 'relative',
  },
  /**
   * Chaque couche occupe 100% du conteneur, en absolu.
   * Les PNG 512×512 se superposent sans décalage grâce à resizeMode="contain".
   */
  layer: {
    position: 'absolute',
    width:    '100%',
    height:   '100%',
  },
});
