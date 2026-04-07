/**
 * PremiumLetterAnimation — Enveloppe qui s'ouvre puis disparaît
 *
 * Séquence (~1500ms) :
 *   1. Enveloppe arrive avec spring
 *   2. Cachet de cire pulse
 *   3. Rabat s'ouvre (rotateX pivot sur le bord supérieur)
 *   4. Enveloppe ouverte visible brièvement
 *   5. Fondu de sortie → la carte lettre apparaît en dessous
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSpring,
  withSequence,
  interpolate,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const ENV_W  = Math.min(SW - 48, 300);
const ENV_H  = Math.round(ENV_W * 0.64);
const FLAP_H = Math.round(ENV_H * 0.52);

// Géométrie SVG de l'enveloppe
const FLAP_PTS   = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;
const FOLD_LEFT  = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_RIGHT = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_BTM   = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

interface Props {
  senderName?: string;
}

export function PremiumLetterAnimation({ senderName: _senderName = 'Sophie' }: Props) {
  // ── Conteneur global ────────────────────────────────────────────────────────
  const wrapOpacity    = useSharedValue(0);
  const wrapTranslateY = useSharedValue(50);
  const wrapScale      = useSharedValue(0.90);

  // ── Cachet ──────────────────────────────────────────────────────────────────
  const sealScale   = useSharedValue(1);
  const sealOpacity = useSharedValue(1);

  // ── Rabat ───────────────────────────────────────────────────────────────────
  const flapRotate  = useSharedValue(0);   // 0=fermé → 1=ouvert
  const flapOpacity = useSharedValue(1);

  // ── Sortie ──────────────────────────────────────────────────────────────────
  const exitOpacity = useSharedValue(1);
  const exitScale   = useSharedValue(1);

  useEffect(() => {
    // 1 — Arrivée (0–350ms)
    wrapOpacity.value    = withTiming(1, { duration: 300 });
    wrapTranslateY.value = withSpring(0, { damping: 12, stiffness: 120 });
    wrapScale.value      = withSequence(
      withTiming(1.04, { duration: 180 }),
      withTiming(1.0,  { duration: 160 }),
    );

    // 2 — Cachet pulse (350–650ms)
    sealScale.value = withDelay(350, withSequence(
      withTiming(1.20, { duration: 180 }),
      withTiming(1.0,  { duration: 150 }),
      withTiming(1.10, { duration: 130 }),
      withTiming(1.0,  { duration: 120 }),
    ));

    // 3 — Cachet disparaît + rabat s'ouvre (700–1200ms)
    sealOpacity.value = withDelay(720, withTiming(0, { duration: 200 }));
    flapRotate.value  = withDelay(700, withSpring(1, {
      damping: 14, stiffness: 72, mass: 1.0,
    }));
    flapOpacity.value = withDelay(1000, withTiming(0, {
      duration: 250, easing: Easing.out(Easing.quad),
    }));

    // 4 — Fondu de sortie (1200–1500ms)
    exitOpacity.value = withDelay(1180, withTiming(0, {
      duration: 320, easing: Easing.in(Easing.quad),
    }));
    exitScale.value = withDelay(1180, withTiming(0.92, { duration: 320 }));
  }, []);

  // ── Styles animés ────────────────────────────────────────────────────────────
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: wrapOpacity.value,
    transform: [
      { translateY: wrapTranslateY.value },
      { scale: wrapScale.value },
    ],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOpacity.value,
    transform: [{ scale: exitScale.value }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value }],
    opacity: sealOpacity.value,
  }));

  const flapStyle = useAnimatedStyle(() => {
    const deg = interpolate(flapRotate.value, [0, 1], [0, -168]);
    return {
      opacity: flapOpacity.value,
      transform: [
        { translateY:  FLAP_H / 2 },
        { perspective: 900 },
        { rotateX: `${deg}deg` },
        { translateY: -(FLAP_H / 2) },
      ],
    };
  });

  return (
    <View style={[styles.outer, { height: ENV_H + 20 }]}>
      <Animated.View style={exitStyle}>
        <Animated.View style={[styles.scene, { width: ENV_W, height: ENV_H }, wrapStyle]}>

          {/* Corps de l'enveloppe */}
          <View style={[styles.envBody, { width: ENV_W, height: ENV_H }]}>
            <LinearGradient
              colors={['#EDD5A3', '#E8C98A', '#DFB86A']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FOLD_LEFT}  fill="rgba(180,130,60,0.10)" stroke="rgba(160,110,40,0.28)" strokeWidth="0.8" />
              <Polygon points={FOLD_RIGHT} fill="rgba(210,160,70,0.07)" stroke="rgba(160,110,40,0.28)" strokeWidth="0.8" />
              <Polygon points={FOLD_BTM}   fill="rgba(190,140,60,0.12)" stroke="rgba(160,110,40,0.28)" strokeWidth="0.8" />
            </Svg>
            <View style={styles.envInnerBorder} />
          </View>

          {/* Rabat triangulaire */}
          <Animated.View style={[styles.flapContainer, { width: ENV_W, height: FLAP_H }, flapStyle]}>
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FLAP_PTS} fill="#E5C280" />
              <Polygon points={`0,0 ${ENV_W/2},0 ${ENV_W/2},${FLAP_H}`} fill="rgba(200,160,60,0.18)" />
              <Polygon points={`${ENV_W/2},0 ${ENV_W},0 ${ENV_W/2},${FLAP_H}`} fill="rgba(255,240,190,0.15)" />
              <Polygon points={FLAP_PTS} fill="none" stroke="rgba(160,110,40,0.55)" strokeWidth="1.2" />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View style={[styles.sealWrap, sealStyle]}>
              <LinearGradient
                colors={['#C0392B', '#7B1515', '#5A0E0E']}
                start={{ x: 0.2, y: 0 }}
                end={{ x: 0.8, y: 1 }}
                style={styles.sealGrad}
              />
              <View style={styles.sealRing} />
              <View style={styles.sealInner}>
                <View style={styles.sealHeart} />
              </View>
            </Animated.View>
          </Animated.View>

        </Animated.View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  scene: {
    position: 'relative',
    overflow: 'visible',
  },

  // Corps enveloppe
  envBody: {
    position: 'absolute',
    top: 0, left: 0,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#B8882A',
    zIndex: 1,
  },
  envInnerBorder: {
    position: 'absolute',
    inset: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(200,160,60,0.35)',
  },

  // Rabat
  flapContainer: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 2,
    overflow: 'visible',
  },

  // Cachet de cire
  sealWrap: {
    position: 'absolute',
    bottom: 6,
    left: ENV_W / 2 - 27,
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.50,
    shadowRadius: 7,
    elevation: 9,
    overflow: 'hidden',
  },
  sealGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 27,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: 'rgba(255,190,140,0.40)',
  },
  sealInner: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sealHeart: {
    width: 14,
    height: 14,
    backgroundColor: 'rgba(255,200,180,0.70)',
    borderRadius: 7,
    transform: [{ rotate: '45deg' }],
  },
});
