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
 *  10. effects[]      Effets visuels (glow, sparkles, halo…) — PLUSIEURS simultanés
 *  11. transformation Transformation (fantôme, pirate, grenouille…) — une seule
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
 *     effects={["glow_01", "sparkles_01"]}
 *     transformation={null}
 *   />
 *
 * ─── NOTES ───────────────────────────────────────────────────────────────────
 * - `body` et `head` ont des valeurs par défaut ('body_default' / 'head_default').
 * - Toutes les autres couches sont optionnelles. null ou absent = couche invisible.
 * - `effects` est un tableau : plusieurs effets peuvent coexister.
 * - Un ID non enregistré dans le registre = couche silencieusement ignorée.
 * - Pour ajouter un asset : voir registry.ts.
 */

import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { getAsset } from './registry';

// ─── Couches de base (ordre fixe) ────────────────────────────────────────────

const BASE_LAYERS = [
  'body',
  'clothes',
  'head',
  'nose',
  'mouth',
  'pilosite',
  'hair',
  'earrings',
  'accessory',
] as const;

type BaseLayer = (typeof BASE_LAYERS)[number];

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

  /**
   * Effets visuels simultanés (glow, sparkles, halo…).
   * Tableau vide = aucun effet. Plusieurs effets coexistent par empilement.
   */
  effects?: string[];

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
  effects        = [],
  transformation,
}: AvatarProps) {

  const baseLayers: Record<BaseLayer, string | null | undefined> = {
    body, clothes, head, nose, mouth, pilosite, hair, earrings, accessory,
  };

  const transformationSource = getAsset(transformation);

  return (
    <View style={[styles.container, { width: size, height: size }]}>

      {/* ① Couches de base (1–9) ─────────────────────────────────────────── */}
      {BASE_LAYERS.map(slot => {
        const source = getAsset(baseLayers[slot]);
        if (!source) return null;
        return (
          <Image
            key={slot}
            source={source}
            style={styles.layer}
            resizeMode="contain"
            fadeDuration={0}
          />
        );
      })}

      {/* ② Effets simultanés (10) ─────────────────────────────────────────── */}
      {effects.map(effectId => {
        const source = getAsset(effectId);
        if (!source) return null;
        return (
          <Image
            key={effectId}
            source={source}
            style={styles.layer}
            resizeMode="contain"
            fadeDuration={0}
          />
        );
      })}

      {/* ③ Transformation (11) ────────────────────────────────────────────── */}
      {transformationSource && (
        <Image
          source={transformationSource}
          style={styles.layer}
          resizeMode="contain"
          fadeDuration={0}
        />
      )}

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
