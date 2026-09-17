import { useWindowDimensions } from 'react-native';

/**
 * Référence visuelle JeuTaime : iPhone 16e en portrait.
 * React Native travaille en points/logical pixels, pas en pixels physiques.
 * 393 x 852 correspond à la fenêtre logique de référence.
 *
 * Règle :
 * - référence = 1.0 (100 %)
 * - appareil 2x plus grand dans les deux dimensions = 2.0 (200 %)
 * - appareil 0.8x plus petit = 0.8 (80 %)
 *
 * Math.min(widthRatio, heightRatio) conserve les proportions sans provoquer
 * de débordement lorsqu'un téléphone a un ratio d'écran différent.
 */
export const REFERENCE_SCREEN = {
  width: 393,
  height: 852,
} as const;

export type ResponsiveScale = {
  width: number;
  height: number;
  widthScale: number;
  heightScale: number;
  scale: number;
  size: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
};

export function getResponsiveScale(width: number, height: number): ResponsiveScale {
  // L'orientation ne doit pas changer la base de calcul des écrans portrait.
  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const widthScale = portraitWidth / REFERENCE_SCREEN.width;
  const heightScale = portraitHeight / REFERENCE_SCREEN.height;
  const scale = Math.min(widthScale, heightScale);

  return {
    width,
    height,
    widthScale,
    heightScale,
    scale,
    size: (value: number) => value * scale,
    x: (value: number) => value * widthScale,
    y: (value: number) => value * heightScale,
  };
}

/**
 * Hook à utiliser dans les écrans/composants.
 * `size()` garde un objet proportionnel (carte, image, rayon, icône, espace).
 * `x()` / `y()` sont réservés aux positions qui doivent suivre séparément
 * la largeur ou la hauteur disponible.
 */
export function useResponsiveScale(): ResponsiveScale {
  const { width, height } = useWindowDimensions();
  return getResponsiveScale(width, height);
}
