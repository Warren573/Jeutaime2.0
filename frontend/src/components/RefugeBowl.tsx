import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { BOWL_IMAGES, BOWL_LAYOUT, type RefugeFood } from '../data/refugeBowls';

/**
 * Gamelle de nourriture (PNG d'origine du projet). La gamelle d'eau fait partie du fond : jamais dupliquée ici.
 * Les deux PNG (pleine / vide) sont superposés : le passage de l'un à l'autre est un fondu perceptible.
 * L'apparition se fait en fondu ; le composant est retiré par l'écran à la fin de la réaction.
 */
export function RefugeBowl({ food, level, artWidth }: {
  food: RefugeFood;
  level: 'full' | 'empty';
  artWidth: number;
}) {
  const shown = useRef(new Animated.Value(0)).current;
  const emptiness = useRef(new Animated.Value(level === 'empty' ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(shown, { toValue: 1, duration: 250, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  }, [shown]);
  useEffect(() => {
    Animated.timing(emptiness, { toValue: level === 'empty' ? 1 : 0, duration: 600, easing: Easing.inOut(Easing.quad), useNativeDriver: true }).start();
  }, [level, emptiness]);

  const size = artWidth * BOWL_LAYOUT.widthRatio;
  const fullOpacity = emptiness.interpolate({ inputRange: [0, 1], outputRange: [1, 0] });
  return (
    <Animated.View
      pointerEvents="none"
      accessibilityLabel={level === 'full' ? 'Gamelle pleine' : 'Gamelle vide'}
      style={[styles.box, { top: BOWL_LAYOUT.top, left: BOWL_LAYOUT.left, width: size, height: size, opacity: shown }]}
    >
      <Animated.Image source={BOWL_IMAGES.empty} resizeMode="contain" style={styles.fill} />
      <Animated.Image source={BOWL_IMAGES[food]} resizeMode="contain" style={[styles.fill, { opacity: fullOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  box: { position: 'absolute', zIndex: 13 },
  fill: { position: 'absolute', width: '100%', height: '100%' },
});
