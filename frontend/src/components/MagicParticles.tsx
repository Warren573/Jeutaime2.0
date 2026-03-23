/**
 * MagicParticles — petites particules dorées discrètes
 * Utilisation : placer en overlay absolu sur un conteneur
 * <View style={{ position: 'relative' }}>
 *   <MagicParticles />
 *   <MonContenu />
 * </View>
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
  Easing,
} from 'react-native-reanimated';

interface SparkleProps {
  x: number;
  y: number;
  delay?: number;
  size?: number;
  color?: string;
}

function Sparkle({ x, y, delay = 0, size = 5, color = '#C9A96E' }: SparkleProps) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: 1600,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        false,
      ),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.4, 0.8, 1], [0, 1, 0.6, 0]),
    transform: [
      { translateX: x },
      { translateY: y - interpolate(progress.value, [0, 1], [0, 12]) },
      { scale: interpolate(progress.value, [0, 0.4, 1], [0.5, 1.1, 0.5]) },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          width:           size,
          height:          size,
          borderRadius:    size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

interface Props {
  width?: number;
  height?: number;
  color?: string;
  count?: number;
}

// Position des particules (relatives à la zone)
const DEFAULT_POSITIONS = [
  { x: 8,  y: 10,  delay: 0   },
  { x: 40, y: 6,   delay: 180 },
  { x: 68, y: 18,  delay: 320 },
  { x: 22, y: 50,  delay: 500 },
  { x: 58, y: 55,  delay: 140 },
  { x: 82, y: 35,  delay: 400 },
  { x: 14, y: 72,  delay: 260 },
];

export function MagicParticles({
  width = 100,
  height = 100,
  color = '#C9A96E',
}: Props) {
  return (
    <View
      pointerEvents="none"
      style={[styles.container, { width, height }]}
    >
      {DEFAULT_POSITIONS.map((p, i) => (
        <Sparkle
          key={i}
          x={p.x * (width / 100)}
          y={p.y * (height / 100)}
          delay={p.delay}
          color={color}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  sparkle: {
    position: 'absolute',
  },
});
