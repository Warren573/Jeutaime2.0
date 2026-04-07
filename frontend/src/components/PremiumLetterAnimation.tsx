/**
 * PremiumLetterAnimation
 *
 * Approche 100% compatible RN Web :
 *   - Aucun rotateX / perspective (non fiable sur web)
 *   - Le rabat glisse vers le HAUT et sort de la scène (overflow:hidden le coupe)
 *   - La lettre monte doucement depuis l'intérieur
 *
 * Structure :
 *   Scene (overflow:hidden, shadow)
 *   ├── Body      — enveloppe kraft avec plis en X
 *   ├── Letter    — papier crème, z=1, glisse vers le haut
 *   └── Flap      — triangle, z=2, glisse vers le haut et disparaît
 *
 * Timing total : ~1500ms
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

const ENV_W  = Math.min(SW - 64, 280);
const ENV_H  = Math.round(ENV_W * 0.62);
const FLAP_H = Math.round(ENV_H * 0.48);

// Géométrie SVG
const FLAP_TRI  = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;
const FOLD_LEFT = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_RGHT = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_BOT  = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

const SEAL_R = 24; // rayon du cachet

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {

  /* ── valeurs animées ───────────────────────────────────────────────────────── */

  // Scène
  const sceneOp = useSharedValue(0);
  const sceneY  = useSharedValue(28);

  // Cachet
  const sealSc  = useSharedValue(1);
  const sealOp  = useSharedValue(1);

  // Rabat — monte et sort de la scène (clippé par overflow:hidden)
  const flapY   = useSharedValue(0);
  const flapOp  = useSharedValue(1);

  // Lettre — glisse doucement vers le haut
  const letterY  = useSharedValue(20);
  const letterOp = useSharedValue(0);

  // Sortie
  const exitOp = useSharedValue(1);
  const exitSc = useSharedValue(1);

  useEffect(() => {
    // 1 — arrivée (0–320ms)
    sceneOp.value = withTiming(1, { duration: 260 });
    sceneY.value  = withSpring(0, { damping: 18, stiffness: 140 });

    // 2 — cachet pulse (340–560ms)
    sealSc.value = withDelay(340, withSequence(
      withTiming(1.18, { duration: 150 }),
      withTiming(1.0,  { duration: 130 }),
      withTiming(1.10, { duration: 110 }),
      withTiming(1.0,  { duration: 100 }),
    ));
    // cachet disparaît juste avant le rabat
    sealOp.value = withDelay(530, withTiming(0, { duration: 150 }));

    // 3 — rabat monte et sort (560–950ms)
    //    glisse vers le haut (-(FLAP_H + 20) pour sortir totalement de la scène)
    flapY.value  = withDelay(560, withTiming(-(FLAP_H + 20), {
      duration: 390,
      easing: Easing.inOut(Easing.quad),
    }));
    flapOp.value = withDelay(700, withTiming(0, { duration: 200 }));

    // 4 — lettre monte (100ms après le rabat, spring léger)
    letterOp.value = withDelay(660, withTiming(1, { duration: 250 }));
    letterY.value  = withDelay(660, withSpring(0, {
      damping: 20, stiffness: 150, mass: 0.9,
    }));

    // 5 — sortie globale (1200–1500ms)
    exitOp.value = withDelay(1200, withTiming(0, {
      duration: 300, easing: Easing.in(Easing.quad),
    }));
    exitSc.value = withDelay(1200, withTiming(0.93, { duration: 300 }));
  }, []);

  /* ── styles animés ─────────────────────────────────────────────────────────── */

  const sceneStyle = useAnimatedStyle(() => ({
    opacity: sceneOp.value,
    transform: [{ translateY: sceneY.value }],
  }));

  const exitStyle = useAnimatedStyle(() => ({
    opacity: exitOp.value,
    transform: [{ scale: exitSc.value }],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    opacity: sealOp.value,
    transform: [{ scale: sealSc.value }],
  }));

  // Rabat : translateY + légère compression (simule la perspective sans rotateX)
  const flapStyle = useAnimatedStyle(() => {
    const progress = interpolate(flapY.value, [0, -(FLAP_H + 20)], [0, 1]);
    return {
      opacity: flapOp.value,
      transform: [
        { translateY: flapY.value },
        { scaleY: interpolate(progress, [0, 0.6, 1], [1, 0.85, 0.6]) },
      ],
    };
  });

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  /* ── rendu ──────────────────────────────────────────────────────────────────── */
  return (
    <View style={[styles.outer, { height: ENV_H }]}>
      <Animated.View style={exitStyle}>
        <Animated.View
          style={[styles.scene, { width: ENV_W, height: ENV_H }, sceneStyle]}
        >

          {/* ── Corps de l'enveloppe ── */}
          <View style={[styles.body, { width: ENV_W, height: ENV_H }]}>
            <LinearGradient
              colors={['#E4C87A', '#D6AD56', '#C89840']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
              <Polygon
                points={FOLD_LEFT}
                fill="rgba(148,100,12,0.12)"
                stroke="rgba(128,82,8,0.28)"
                strokeWidth="0.8"
              />
              <Polygon
                points={FOLD_RGHT}
                fill="rgba(195,155,45,0.07)"
                stroke="rgba(128,82,8,0.28)"
                strokeWidth="0.8"
              />
              <Polygon
                points={FOLD_BOT}
                fill="rgba(158,110,18,0.10)"
                stroke="rgba(128,82,8,0.28)"
                strokeWidth="0.8"
              />
            </Svg>
            <View style={styles.bodyInner} />
          </View>

          {/* ── Papier lettre — visible dans l'ouverture après le pli ── */}
          <Animated.View
            style={[
              styles.letter,
              { width: ENV_W - 20, height: FLAP_H - 4, left: 10, top: 2 },
              letterStyle,
            ]}
          >
            <LinearGradient
              colors={['#F9F2E0', '#F1E6CA']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Accent gauche */}
            <View style={styles.letterBar} />
            {/* Lignes simulées */}
            {[0, 1, 2].map(i => (
              <View
                key={i}
                style={[
                  styles.letterLine,
                  {
                    bottom: 12 + i * 11,
                    width: i === 2 ? '50%' : '78%',
                    opacity: 0.18 + i * 0.04,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* ── Rabat triangulaire — glisse vers le haut ── */}
          <Animated.View
            style={[
              styles.flap,
              { width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FLAP_TRI} fill="#C8923A" />
              <Polygon
                points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(155,98,10,0.20)"
              />
              <Polygon
                points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(255,218,110,0.12)"
              />
              <Polygon
                points={FLAP_TRI}
                fill="none"
                stroke="rgba(118,72,5,0.45)"
                strokeWidth="1.1"
              />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View style={[styles.seal, sealStyle]}>
              <LinearGradient
                colors={['#C03030', '#800F0F', '#560B0B']}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sealRing} />
              <View style={styles.sealDot} />
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
  },

  scene: {
    position: 'relative',
    overflow: 'hidden',         // clipe le rabat quand il monte
    borderRadius: 10,
    shadowColor: '#3A2000',
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.24,
    shadowRadius: 14,
    elevation: 8,
  },

  body: {
    position: 'absolute',
    top: 0, left: 0,
    borderRadius: 10,
    overflow: 'hidden',
  },
  bodyInner: {
    position: 'absolute',
    inset: 5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(190,145,30,0.25)',
  },

  letter: {
    position: 'absolute',
    borderRadius: 4,
    overflow: 'hidden',
    zIndex: 1,
    shadowColor: '#2A1500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  letterBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#B08020',
    opacity: 0.50,
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#8A6618',
    borderRadius: 1,
  },

  flap: {
    position: 'absolute',
    top: 0, left: 0,
    zIndex: 2,
  },

  seal: {
    position: 'absolute',
    bottom: 8,
    left: ENV_W / 2 - SEAL_R,
    width: SEAL_R * 2,
    height: SEAL_R * 2,
    borderRadius: SEAL_R,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#1A0000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.48,
    shadowRadius: 6,
    elevation: 9,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,165,110,0.30)',
  },
  sealDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,185,140,0.45)',
  },
});
