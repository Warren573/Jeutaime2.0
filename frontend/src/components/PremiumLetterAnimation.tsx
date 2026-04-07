/**
 * PremiumLetterAnimation
 * Enveloppe fermée → rabat qui glisse vers le haut (s'ouvre vers l'arrière)
 * → lettre qui sort légèrement, partiellement masquée par la face avant.
 *
 * COUCHES (z-order dans envelopeContainer, overflow:hidden) :
 *   z=1  backPanel    — fond arrière (couleur intérieur enveloppe)
 *   z=2  letter       — lettre blanche, monte depuis l'intérieur
 *   z=3  frontPocket  — face avant de la poche, TOUJOURS devant la lettre
 *   z=4  flap         — rabat triangulaire, glisse vers le haut et sort du cadre
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

// Zone au-dessus de l'enveloppe où la lettre émerge
const LETTER_PEEK = Math.round(ENV_H * 0.35);
const CONTAINER_H = ENV_H + LETTER_PEEK;

// Lettre assez haute pour rester partiellement dans la poche au final
const LETTER_H = POCKET_H + LETTER_PEEK;

// Translation finale : lettre sort partiellement (pas entièrement)
const LETTER_FINAL_Y = -Math.round(LETTER_PEEK * 0.72);

// Le rabat doit monter au-delà du bord supérieur du container pour disparaître
const FLAP_EXIT_Y = -(LETTER_PEEK + FLAP_H + 8);

// SVG triangle du rabat (hinge en haut, pointe vers le bas)
const FLAP_PTS = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {
  const sceneOp  = useSharedValue(0);
  const flapY    = useSharedValue(0);          // glisse vers le haut
  const flapOp   = useSharedValue(1);
  const letterY  = useSharedValue(FLAP_H);     // part au niveau du hinge
  const letterOp = useSharedValue(0);
  const exitOp   = useSharedValue(1);

  useEffect(() => {
    // Apparition
    sceneOp.value = withTiming(1, { duration: 220 });

    // Phase 1 — rabat monte et sort du cadre (t=300ms, 480ms)
    flapY.value = withDelay(300, withTiming(FLAP_EXIT_Y, {
      duration: 480,
      easing: Easing.inOut(Easing.ease),
    }));
    // Fondu du rabat au moment où il passe le bord supérieur
    flapOp.value = withDelay(560, withTiming(0, { duration: 180 }));

    // Phase 2 — lettre sort (t=900ms, 400ms)
    letterOp.value = withDelay(900, withTiming(1, { duration: 180 }));
    letterY.value  = withDelay(900, withTiming(LETTER_FINAL_Y, {
      duration: 400,
      easing: Easing.out(Easing.ease),
    }));

    // Sortie globale (t=1650ms)
    exitOp.value = withDelay(1650, withTiming(0, {
      duration: 350,
      easing: Easing.in(Easing.ease),
    }));
  }, []);

  const sceneStyle  = useAnimatedStyle(() => ({ opacity: sceneOp.value }));
  const exitStyle   = useAnimatedStyle(() => ({ opacity: exitOp.value }));

  // Rabat : glisse vers le haut, sort du container (clippé par overflow:hidden)
  const flapStyle = useAnimatedStyle(() => ({
    opacity: flapOp.value,
    transform: [{ translateY: flapY.value }],
  }));

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  return (
    <Animated.View style={[styles.wrapper, exitStyle]}>
      <Animated.View style={sceneStyle}>
        <View style={[styles.envelopeContainer, { width: ENV_W, height: CONTAINER_H }]}>

          {/* ── z=1  backPanel ── intérieur visible quand le rabat est ouvert ── */}
          <View
            style={[styles.backPanel, { top: LETTER_PEEK, width: ENV_W, height: ENV_H }]}
          />

          {/* ── z=2  letter ── derrière la poche, monte ensuite ────────────── */}
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

          {/* ── z=3  frontPocket ── TOUJOURS devant la lettre (masque la bas) ─ */}
          <View
            style={[
              styles.frontPocket,
              { top: LETTER_PEEK + FLAP_H, width: ENV_W, height: POCKET_H },
            ]}
          >
            {/* Ligne de pli à la jonction rabat/poche */}
            <View style={styles.foldLine} />
          </View>

          {/* ── z=4  flap ── triangle, glisse vers le haut ──────────────────── */}
          <Animated.View
            style={[
              styles.flap,
              { top: LETTER_PEEK, width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              {/* Remplissage du triangle */}
              <Polygon points={FLAP_PTS} fill="#CC9438" />
              {/* Contour */}
              <Polygon
                points={FLAP_PTS}
                fill="none"
                stroke="rgba(90,50,5,0.35)"
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

          {/* Bordure fine autour de l'enveloppe */}
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

  // Conteneur — overflow:hidden clip tout (y compris le rabat qui monte)
  envelopeContainer: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
  },

  // z=1 — fond arrière (couleur intérieur de l'enveloppe, plus claire)
  backPanel: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    backgroundColor: '#DCA84A',   // légèrement plus clair que la poche = intérieur
    borderRadius: 6,
  },

  // z=2 — lettre (blanc pur, clairement visible contre le fond de l'overlay)
  letter: {
    position: 'absolute',
    zIndex: 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    shadowColor: '#3A2000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 0.5,
    borderColor: 'rgba(0,0,0,0.10)',
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#8C7040',
    opacity: 0.25,
    borderRadius: 1,
  },

  // z=3 — face avant de la poche (kraft, masque le bas de la lettre)
  frontPocket: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    backgroundColor: '#C48830',
  },
  foldLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(80,44,3,0.28)',
  },

  // z=4 — rabat triangulaire
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
  },

  // Bordure fine de l'enveloppe
  outerBorder: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(90,50,3,0.32)',
  },
});
