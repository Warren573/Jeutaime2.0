/**
 * MagicAura — halo pulsant doré discret autour d'un avatar
 * Utilisation : <MagicAura><Avatar ... /></MagicAura>
 */
import React, { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  interpolate,
} from 'react-native-reanimated';

interface Props {
  children: React.ReactNode;
  size?: number;       // diamètre de l'avatar enfant (défaut 72)
  color?: string;      // couleur du halo (défaut doré)
  active?: boolean;    // si false, pas d'animation
}

export function MagicAura({
  children,
  size = 72,
  color = '#C9A96E',
  active = true,
}: Props) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (!active) return;
    pulse.value = withRepeat(
      withTiming(1, {
        duration: 1800,
        easing: Easing.inOut(Easing.ease),
      }),
      -1,
      true,
    );
  }, [active]);

  const auraStyle = useAnimatedStyle(() => ({
    opacity:   interpolate(pulse.value, [0, 1], [0.18, 0.42]),
    transform: [{ scale: interpolate(pulse.value, [0, 1], [1, 1.14]) }],
  }));

  const containerSize = size + 20;

  return (
    <View
      style={[
        styles.container,
        { width: containerSize, height: containerSize },
      ]}
    >
      {/* Halo animé */}
      <Animated.View
        style={[
          styles.aura,
          {
            width:        containerSize,
            height:       containerSize,
            borderRadius: containerSize / 2,
            backgroundColor: color,
          },
          auraStyle,
        ]}
      />
      {/* Contenu (avatar) */}
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems:     'center',
    justifyContent: 'center',
  },
  aura: {
    position: 'absolute',
  },
  content: {
    zIndex: 2,
  },
});
