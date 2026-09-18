import { useWindowDimensions } from 'react-native';

/**
 * RÈGLE UNIQUE ET OBLIGATOIRE DE MISE À L'ÉCHELLE JEUTAIME
 *
 * iPhone 16e portrait = référence 100 % (390 x 844 points logiques).
 *
 * Toute l'interface utilise UN SEUL coefficient uniforme. Il est interdit
 * d'appliquer une échelle X différente d'une échelle Y : cela déformerait les
 * proportions. Le coefficient qui permet de conserver intégralement le dessin
 * de référence dans le support est le plus petit des deux rapports.
 *
 * Exemple : scale 0,8 => dimensions, textes, images, marges et espacements
 * valent tous 80 % de leur valeur de référence.
 */
export const REFERENCE_SCREEN = {
  width: 390,
  height: 844,
} as const;

export type ResponsiveScale = {
  width: number;
  height: number;
  widthScale: number;
  heightScale: number;
  scale: number;
  logicalWidth: number;
  logicalHeight: number;
  size: (value: number) => number;
  x: (value: number) => number;
  y: (value: number) => number;
};

export function getResponsiveScale(width: number, height: number): ResponsiveScale {
  const portraitWidth = Math.min(width, height);
  const portraitHeight = Math.max(width, height);
  const widthScale = portraitWidth / REFERENCE_SCREEN.width;
  const heightScale = portraitHeight / REFERENCE_SCREEN.height;

  // Homothétie stricte : un seul coefficient pour absolument tout.
  const scale = Math.min(widthScale, heightScale);

  const proportional = (value: number) => value * scale;

  return {
    width,
    height,
    widthScale,
    heightScale,
    scale,
    logicalWidth: width / scale,
    logicalHeight: height / scale,
    size: proportional,
    x: proportional,
    y: proportional,
  };
}

export function useResponsiveScale(): ResponsiveScale {
  const { width, height } = useWindowDimensions();
  return getResponsiveScale(width, height);
}
