import { useWindowDimensions } from 'react-native';

/**
 * Référence JeuTaime : iPhone 16e en portrait = 100 %.
 * React Native travaille en points logiques : 390 x 844.
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
  const scale = widthScale;

  return {
    width,
    height,
    widthScale,
    heightScale,
    scale,
    logicalWidth: width / scale,
    logicalHeight: height / scale,
    size: (value: number) => value * scale,
    x: (value: number) => value * widthScale,
    y: (value: number) => value * heightScale,
  };
}

export function useResponsiveScale(): ResponsiveScale {
  const { width, height } = useWindowDimensions();
  return getResponsiveScale(width, height);
}
