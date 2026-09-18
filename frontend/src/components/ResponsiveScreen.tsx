import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { getResponsiveScale } from '../utils/responsive';

/**
 * Canvas proportionnel JeuTaime.
 *
 * Utilise exclusivement la règle globale définie dans responsive.ts :
 * un seul coefficient uniforme pour conserver tous les rapports.
 */
export function ResponsiveScreen({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const responsive = getResponsiveScale(width, height);

  return (
    <View style={styles.viewport}>
      <View
        style={[
          styles.canvas,
          {
            width: responsive.logicalWidth,
            height: responsive.logicalHeight,
            transform: [{ scale: responsive.scale }],
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
