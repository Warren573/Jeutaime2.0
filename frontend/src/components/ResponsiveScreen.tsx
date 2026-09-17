import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { REFERENCE_SCREEN } from '../utils/responsive';

/**
 * Canvas proportionnel JeuTaime.
 *
 * Le contenu est dessiné dans la largeur de référence iPhone 16e puis mis à
 * l'échelle selon la largeur réelle du téléphone. Le wrapper extérieur reste
 * aux dimensions natives : safe areas, clavier, navigation et gestes système
 * ne sont donc jamais artificiellement mis à l'échelle.
 *
 * À utiliser autour du contenu visuel d'un écran portrait (pas les Salons).
 */
export function ResponsiveScreen({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const portraitWidth = Math.min(width, height);
  const scale = portraitWidth / REFERENCE_SCREEN.width;
  const logicalWidth = width / scale;
  const logicalHeight = height / scale;

  return (
    <View style={styles.viewport}>
      <View
        style={[
          styles.canvas,
          {
            width: logicalWidth,
            height: logicalHeight,
            transform: [{ scale }],
          },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  viewport: {
    flex: 1,
    overflow: 'hidden',
  },
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    transformOrigin: 'top left',
  },
});
