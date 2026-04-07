/**
 * PremiumLetterAnimation
 * Enveloppe fermée → rabat qui s'ouvre vers l'arrière (pivot en haut)
 * → lettre qui sort légèrement en restant partiellement cachée par la face avant.
 *
 * COUCHES (z-order dans envelopeContainer) :
 *   z=1  backPanel    — fond arrière, visible sous le rabat ouvert
 *   z=2  letter       — lettre, part cachée dans la poche, monte ensuite
 *   z=3  frontPocket  — face avant de la poche, TOUJOURS devant la lettre
 *   z=4  flap         — rabat triangulaire, scaleY 1→0, pivot en haut
 */
import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';

const { width: SW } = Dimensions.get('window');

const ENV_W    = Math.min(SW - 80, 260);
const ENV_H    = Math.round(ENV_W * 0.65);
const FLAP_H   = Math.round(ENV_H * 0.45);
const POCKET_H = ENV_H - FLAP_H;

// Espace au-dessus de l'enveloppe où la lettre peut émerger
const LETTER_PEEK = Math.round(ENV_H * 0.35);
const CONTAINER_H = ENV_H + LETTER_PEEK;

// La lettre est plus haute que la poche pour rester partiellement dedans au final
const LETTER_H = POCKET_H + LETTER_PEEK;

// translateY final de la lettre : sort partiellement, pas entièrement
const LETTER_FINAL_Y = -Math.round(LETTER_PEEK * 0.72);

// SVG : triangle du rabat (hinge en haut, pointe en bas)
const FLAP_PTS = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  const sceneOp   = useSharedValue(0);
  const flapScale = useSharedValue(1);
  const flapOp    = useSharedValue(1);
  const letterY   = useSharedValue(FLAP_H);   // commence au niveau du hinge, dans la poche
  const letterOp  = useSharedValue(0);
  const exitOp    = useSharedValue(1);

  useEffect(() => {
    // Apparition
    sceneOp.value = withTiming(1, { duration: 200 });

    // Phase 1 — rabat s'ouvre (t=300ms, 500ms)
    flapScale.value = withDelay(300, withTiming(0, {
      duration: 500,
      easing: Easing.inOut(Easing.ease),
    }));
    // Le rabat disparaît quand il est à moitié fermé (ne doit pas traîner)
    flapOp.value = withDelay(600, withTiming(0, { duration: 200 }));

    // Phase 2 — lettre sort (t=900ms, 400ms)
    letterOp.value = withDelay(900, withTiming(1, { duration: 180 }));
    letterY.value  = withDelay(900, withTiming(LETTER_FINAL_Y, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    }));

    // Sortie (t=1600ms)
    exitOp.value = withDelay(1600, withTiming(0, {
      duration: 350,
      easing: Easing.in(Easing.ease),
    }));
  }, []);

  const sceneStyle  = useAnimatedStyle(() => ({ opacity: sceneOp.value }));
  const exitStyle   = useAnimatedStyle(() => ({ opacity: exitOp.value }));
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  /**
   * Pivot au bord SUPÉRIEUR du rabat (hinge) :
   *   [translateY(+FLAP_H/2), scaleY, translateY(-FLAP_H/2)]
   *   → le bord haut reste fixe, la pointe remonte vers lui.
   */
  const flapStyle = useAnimatedStyle(() => ({
    opacity: flapOp.value,
    transform: [
      { translateY:  FLAP_H / 2 },
      { scaleY: flapScale.value },
      { translateY: -FLAP_H / 2 },
    ],
  }));

  return (
    <Animated.View style={[styles.wrapper, exitStyle]}>
      <Animated.View style={sceneStyle}>
        <View style={[styles.envelopeContainer, { width: ENV_W, height: CONTAINER_H }]}>

          {/* ── z=1  backPanel ── fond arrière ──────────────────────── */}
          <View
            style={[styles.backPanel, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]}
          />

          {/* ── z=2  letter ── derrière la poche ───────────────────── */}
          <Animated.View
            style={[
              styles.letter,
              { top: LETTER_PEEK, left: 10, width: ENV_W - 20, height: LETTER_H },
              letterStyle,
            ]}
          >
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.letterLine,
                  { top: 14 + i * 14, width: (['70%', '85%', '80%', '45%'][i]) as any },
                ]}
              />
            ))}
          </Animated.View>

          {/* ── z=3  frontPocket ── TOUJOURS devant la lettre ──────── */}
          <View
            style={[
              styles.frontPocket,
              { top: LETTER_PEEK + FLAP_H, width: ENV_W, height: POCKET_H },
            ]}
          >
            {/* Ligne de pli en haut de la poche */}
            <View style={styles.foldLine} />
          </View>

          {/* ── z=4  flap ── rabat triangulaire ─────────────────────── */}
          <Animated.View
            style={[
              styles.flap,
              { top: LETTER_PEEK, width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              <Polygon points={FLAP_PTS} fill="#CC9438" />
              <Polygon
                points={FLAP_PTS}
                fill="none"
                stroke="rgba(95,55,5,0.38)"
                strokeWidth="1"
              />
            </Svg>
            {/* Cachet de cire */}
            <View
              style={[
                styles.seal,
                { bottom: Math.round(FLAP_H * 0.20), left: ENV_W / 2 - 14 },
              ]}
            />
          </Animated.View>

          {/* Bordure de l'enveloppe (par-dessus tout) */}
          <View
            style={[styles.outerBorder, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]}
            pointerEvents="none"
          />

        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Conteneur principal — overflow:hidden clip tout
  envelopeContainer: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },

  // z=1 — dos de l'enveloppe
  backPanel: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    backgroundColor: '#B87428',
    borderRadius: 6,
  },

  // z=2 — lettre
  letter: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: '#F7EED8',
    borderRadius: 3,
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#8C7040',
    opacity: 0.28,
    borderRadius: 1,
  },

  // z=3 — face avant de la poche (masque la lettre en bas)
  frontPocket: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    backgroundColor: '#CC9438',
  },
  foldLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(90,50,3,0.30)',
  },

  // z=4 — rabat
  flap: {
    position: 'absolute',
    left: 0,
    zIndex: 4,
  },

  // Cachet de cire
  seal: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#880000',
    zIndex: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
    elevation: 4,
  },

  // Bordure fine de l'enveloppe
  outerBorder: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(95,55,3,0.32)',
  },
});
