/**
 * PowerReactionOverlay — animation de réaction quand un pouvoir/offrande atterrit sur un avatar
 * ─────────────────────────────────────────────────────────────────────────────────────────────
 * S'affiche en overlay absolu sur l'avatar pendant ~1.5s puis appelle onComplete.
 *
 * Animations par catégorie :
 *  boisson     → emoji s'incline à -45° (geste de boire) + gouttes qui montent
 *  nourriture  → emoji fait 3 "croques" rapides (scale pulse)
 *  symbolique  → emoji flotte vers le haut en fondu
 *  humour      → secousse horizontale rapide
 *  transformation → spin 360° + flash blanc + échelle dramatique
 *  visual_effect  → pulsion + fondu
 */

import React, { useEffect } from 'react';
import { Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withRepeat,
  runOnJS,
  Easing,
} from 'react-native-reanimated';

type Category =
  | 'boisson'
  | 'nourriture'
  | 'symbolique'
  | 'humour'
  | 'transformation'
  | 'visual_effect'
  | string;

interface Props {
  emoji: string;
  category: Category;
  size: number;       // taille de l'avatar (ex. 54 portrait, 88 paysage)
  onComplete: () => void;
}

// ─── Goutte d'eau (animation boire) ──────────────────────────────────────────

function Droplet({ offsetX, delay, size }: { offsetX: number; delay: number; size: number }) {
  const ty      = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 80 });
    ty.value      = withTiming(-size * 0.55, { duration: 500, easing: Easing.out(Easing.quad) });
    opacity.value = withSequence(
      withTiming(0.9, { duration: 80 }),
      withTiming(0.9, { duration: 300 }),
      withTiming(0,   { duration: 220 }),
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateX: offsetX }, { translateY: ty.value }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }, style]}>
      <Text style={{ fontSize: size * 0.22 }}>💧</Text>
    </Animated.View>
  );
}

// ─── Composant principal ─────────────────────────────────────────────────────

export function PowerReactionOverlay({ emoji, category, size, onComplete }: Props) {
  const scale      = useSharedValue(0);
  const opacity    = useSharedValue(1);
  const rotate     = useSharedValue(0);
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Nombre de gouttes pour "boire"
  const showDroplets = category === 'boisson';

  useEffect(() => {
    const done = () => runOnJS(onComplete)();

    switch (category) {

      // ── Boire ─────────────────────────────────────────────────────────────
      case 'boisson':
        // Apparaît → s'incline → maintient → se redresse → disparaît
        scale.value = withSpring(1.25, { damping: 9, stiffness: 220 });
        rotate.value = withSequence(
          withTiming(0,   { duration: 150 }),
          withTiming(-48, { duration: 380, easing: Easing.out(Easing.quad) }),
          withTiming(-48, { duration: 420 }),   // maintien incliné
          withTiming(0,   { duration: 280 }),
        );
        opacity.value = withSequence(
          withTiming(1,  { duration: 100 }),
          withTiming(1,  { duration: 980 }),
          withTiming(0,  { duration: 300 }, (ok) => { if (ok) done(); }),
        );
        break;

      // ── Manger ────────────────────────────────────────────────────────────
      case 'nourriture':
        // Spring d'entrée → 3 croques rapides → disparaît
        scale.value = withSequence(
          withSpring(1.35, { damping: 7, stiffness: 240 }),
          withRepeat(
            withSequence(
              withTiming(1.05, { duration: 90  }),
              withTiming(1.35, { duration: 90  }),
            ),
            3,
            false,
          ),
          withTiming(0, { duration: 220 }),
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 760 }),
          withTiming(0, { duration: 220 }, (ok) => { if (ok) done(); }),
        );
        break;

      // ── Symbolique ────────────────────────────────────────────────────────
      case 'symbolique':
        // Monte en flottant + fondu élégant
        scale.value   = withSpring(1.2, { damping: 7, stiffness: 160 });
        translateY.value = withSequence(
          withTiming(0,           { duration: 250 }),
          withTiming(-size * 0.4, { duration: 900, easing: Easing.out(Easing.quad) }),
        );
        opacity.value = withSequence(
          withTiming(1,  { duration: 200 }),
          withTiming(0.9,{ duration: 600 }),
          withTiming(0,  { duration: 400 }, (ok) => { if (ok) done(); }),
        );
        break;

      // ── Humour ────────────────────────────────────────────────────────────
      case 'humour':
        scale.value = withSpring(1.3, { damping: 8 });
        translateX.value = withRepeat(
          withSequence(
            withTiming(-size * 0.12, { duration: 60 }),
            withTiming( size * 0.12, { duration: 60 }),
          ),
          5,
          true,
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 700 }),
          withTiming(0, { duration: 300 }, (ok) => { if (ok) done(); }),
        );
        break;

      // ── Transformation ────────────────────────────────────────────────────
      case 'transformation':
        // Spin 360° spectaculaire + montée en échelle dramatique
        rotate.value = withTiming(360, {
          duration: 450,
          easing: Easing.out(Easing.back(1.5)),
        });
        scale.value = withSequence(
          withSpring(1.7, { damping: 5, stiffness: 300 }),
          withSpring(1.1, { damping: 10 }),
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 700 }),
          withTiming(0, { duration: 300 }, (ok) => { if (ok) done(); }),
        );
        break;

      // ── Effet visuel / défaut ──────────────────────────────────────────────
      default:
        scale.value = withSequence(
          withSpring(1.3, { damping: 7 }),
          withTiming(1.3, { duration: 500 }),
          withTiming(0,   { duration: 280 }),
        );
        opacity.value = withSequence(
          withTiming(1, { duration: 100 }),
          withTiming(1, { duration: 580 }),
          withTiming(0, { duration: 280 }, (ok) => { if (ok) done(); }),
        );
    }
  }, []);

  const mainStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [
      { scale:      scale.value      },
      { rotate:    `${rotate.value}deg` },
      { translateY: translateY.value },
      { translateX: translateX.value },
    ],
  }));

  const emojiSize = Math.round(size * 0.62);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* Emoji principal animé */}
      <Animated.View style={[styles.center, mainStyle]}>
        <Text style={{ fontSize: emojiSize }}>{emoji}</Text>
      </Animated.View>

      {/* Gouttes pour "boire" — apparaissent pendant l'inclinaison */}
      {showDroplets && (
        <>
          <Droplet offsetX={-size * 0.15} delay={380} size={size} />
          <Droplet offsetX={ size * 0.05} delay={480} size={size} />
          <Droplet offsetX={ size * 0.18} delay={420} size={size} />
        </>
      )}
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         10,
  },
});
