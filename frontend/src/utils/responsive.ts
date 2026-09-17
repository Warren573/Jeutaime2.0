import { useWindowDimensions } from 'react-native';

/**
 * Référence visuelle JeuTaime : iPhone 16e en portrait.
 * Toutes les dimensions validées sur cet appareil valent 100 %.
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
  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const widthScale = portraitWidth / REFERENCE_SCREEN.width;
  const heightScale = portraitHeight / REFERENCE_SCREEN.height;

  // La largeur pilote l'échelle visuelle sur téléphone : un support 2x plus
  // large donne 200 %. La hauteur reste disponible séparément pour les
  // éléments qui doivent suivre la hauteur/safe-area sans déformer l'UI.
  const scale = widthScale;

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

export function useResponsiveScale(): ResponsiveScale {
  const { width, height } = useWindowDimensions();
  return getResponsiveScale(width, height);
}
