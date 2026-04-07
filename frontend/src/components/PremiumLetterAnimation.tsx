/**
 * PremiumLetterAnimation
 *
 * ARCHITECTURE EN COUCHES (ordre z) :
 *   z=1  back-panel    — fond kraft arrière, toujours visible
 *   z=2  letter        — papier lettre, part caché dans la poche, monte ensuite
 *   z=3  front-pocket  — face avant de l'enveloppe, TOUJOURS devant la lettre
 *                        masque la partie basse de la lettre = illusion "encore dedans"
 *   z=4  flap          — rabat triangulaire du dessus, s'ouvre en premier
 *
 * SÉQUENCE :
 *   Phase 1 — enveloppe fermée : lettre invisible derrière front-pocket + flap
 *   Phase 2 — flap scaleY 1→0 (pivot bord haut = hinge) : rabat se replie
 *   Phase 3 — lettre translateY depuis l'intérieur vers le haut
 *   Phase 4 — fondu de sortie
 *
 * Container height = ENV_H + LETTER_PEEK, overflow:hidden :
 *   - La zone LETTER_PEEK au sommet est à l'intérieur du container (la lettre peut y monter)
 *   - overflow:hidden clip le bas de la lettre (front-pocket couvre le reste)
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
  Easing,
} from 'react-native-reanimated';
import Svg, { Polygon } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');

const ENV_W     = Math.min(SW - 64, 280);
const ENV_H     = Math.round(ENV_W * 0.62);
const FLAP_H    = Math.round(ENV_H * 0.48);
const POCKET_H  = ENV_H - FLAP_H;                    // hauteur de la poche (partie basse)

// Espace au-dessus de l'enveloppe où la lettre va émerger
const LETTER_PEEK   = Math.round(ENV_H * 0.38);
// Profondeur initiale de la lettre dans la poche (avant qu'elle monte)
const LETTER_INSIDE = Math.round(FLAP_H * 0.35);
// Hauteur totale du container
const CONTAINER_H   = ENV_H + LETTER_PEEK;

// — SVG enveloppe —

// Triangle du rabat (pointe vers le bas = fermé, hinge en haut)
const FLAP_TRI = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;

// Plis de la poche avant (triangle gauche, droit, bas → center de la poche)
const CX = ENV_W / 2;
const CY = POCKET_H / 2;
const PKT_L = `0,0 0,${POCKET_H} ${CX},${CY}`;
const PKT_R = `${ENV_W},0 ${ENV_W},${POCKET_H} ${CX},${CY}`;
const PKT_B = `0,${POCKET_H} ${ENV_W},${POCKET_H} ${CX},${CY}`;

// Pli supérieur visible sur le back-panel après ouverture du rabat
const BCX = ENV_W / 2;
const BCY = ENV_H / 2;
const BACK_TOP = `0,0 ${ENV_W},0 ${BCX},${BCY}`;

interface Props { senderName?: string }

export function PremiumLetterAnimation({ senderName: _ = '' }: Props) {

  // Arrivée
  const sceneOp = useSharedValue(0);
  const sceneY  = useSharedValue(22);

  // Cachet
  const sealSc  = useSharedValue(1);
  const sealOp  = useSharedValue(1);

  // Flap : scaleY 1→0 avec pivot au bord SUPÉRIEUR (hinge)
  // Technique : translateY(+FLAP_H/2) → scaleY → translateY(-FLAP_H/2)
  // → le bord haut reste fixe, la pointe du triangle se replie vers lui
  const flapScale = useSharedValue(1);
  const flapOp    = useSharedValue(1);

  // Lettre : part de (FLAP_H + LETTER_INSIDE) → monte vers -LETTER_PEEK
  // translateY initial = FLAP_H + LETTER_INSIDE = lettre cachée dans la poche
  // translateY final   = -LETTER_PEEK = lettre dépasse en haut du container
  const letterY   = useSharedValue(FLAP_H + LETTER_INSIDE);
  const letterOp  = useSharedValue(0);

  // Sortie
  const exitOp = useSharedValue(1);
  const exitSc = useSharedValue(1);

  useEffect(() => {
    // 1 — arrivée (0–280ms)
    sceneOp.value = withTiming(1, { duration: 260 });
    sceneY.value  = withSpring(0, { damping: 18, stiffness: 150 });

    // 2 — cachet pulse (280–490ms)
    sealSc.value = withDelay(280, withSequence(
      withTiming(1.16, { duration: 130 }),
      withTiming(1.00, { duration: 110 }),
      withTiming(1.09, { duration: 100 }),
      withTiming(1.00, { duration: 90 }),
    ));
    sealOp.value = withDelay(470, withTiming(0, { duration: 130 }));

    // 3 — flap se referme / se replie vers le haut (530–1010ms = ~480ms)
    //     scaleY 1→0 avec pivot au bord haut (voir flapStyle)
    flapScale.value = withDelay(530, withTiming(0, {
      duration: 480,
      easing: Easing.inOut(Easing.quad),
    }));
    flapOp.value = withDelay(820, withTiming(0, { duration: 160 }));

    // 4 — lettre sort de l'intérieur (680–1180ms = ~500ms)
    //     démarre 150ms après le début du flap (~2/3 de l'animation du flap)
    letterOp.value = withDelay(680, withTiming(1, { duration: 320 }));
    letterY.value  = withDelay(680, withSpring(-LETTER_PEEK, {
      damping: 24,
      stiffness: 130,
      mass: 1.0,
    }));

    // 5 — sortie globale (1250–1560ms)
    exitOp.value = withDelay(1250, withTiming(0, {
      duration: 310,
      easing: Easing.in(Easing.quad),
    }));
    exitSc.value = withDelay(1250, withTiming(0.94, { duration: 310 }));
  }, []);

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

  /**
   * Flap pivot au bord SUPÉRIEUR :
   *   translateY(+FLAP_H/2)  → déplace le centre vers le bas (bord haut au centre)
   *   scaleY                 → compresse autour du nouveau centre = autour du bord haut
   *   translateY(-FLAP_H/2)  → restitue la position
   * Résultat : la pointe du triangle se replie vers la ligne de hinge en haut.
   */
  const flapStyle = useAnimatedStyle(() => ({
    opacity: flapOp.value,
    transform: [
      { translateY:  FLAP_H / 2 },
      { scaleY: flapScale.value },
      { translateY: -FLAP_H / 2 },
    ],
  }));

  /**
   * Lettre masquée par le corps opaque de l'enveloppe (z=2 < front-pocket z=3).
   * Part de translateY = FLAP_H + LETTER_INSIDE (profondeur dans la poche).
   * Monte vers translateY = -LETTER_PEEK (dépasse en haut du container).
   * La front-pocket (z=3) masque toujours la partie basse de la lettre.
   */
  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOp.value,
    transform: [{ translateY: letterY.value }],
  }));

  const SEAL_R = 23;

  return (
    /**
     * Container — overflow:hidden clip tout.
     * HEIGHT = ENV_H + LETTER_PEEK :
     *   – top LETTER_PEEK pixels = espace où la lettre émerge (dans le container)
     *   – bottom ENV_H pixels = corps de l'enveloppe
     */
    <Animated.View style={exitStyle}>
      <Animated.View style={sceneStyle}>
        <View
          style={[
            styles.container,
            { width: ENV_W, height: CONTAINER_H },
          ]}
        >

          {/* ── z=1  back-panel ─────────────────────────────────────────────── */}
          {/* Fond arrière de l'enveloppe. Visible dans la zone ouverte après flap. */}
          <View
            style={[
              styles.backPanel,
              { top: LETTER_PEEK, width: ENV_W, height: ENV_H },
            ]}
          >
            <LinearGradient
              colors={['#C8913A', '#B87E28', '#A86E18']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Pli supérieur visible quand le rabat est ouvert */}
            <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
              <Polygon
                points={BACK_TOP}
                fill="rgba(100,60,5,0.12)"
                stroke="rgba(90,50,3,0.25)"
                strokeWidth="0.7"
              />
            </Svg>
          </View>

          {/* ── z=2  letter ─────────────────────────────────────────────────── */}
          {/*
            Positionnée au même top que le corps de l'enveloppe.
            translateY initial = FLAP_H + LETTER_INSIDE → profondeur dans la poche.
            La front-pocket (z=3 > z=2) la masque tant qu'elle est en bas.
          */}
          <Animated.View
            style={[
              styles.letter,
              {
                top:    LETTER_PEEK,
                left:   9,
                width:  ENV_W - 18,
                height: ENV_H,
              },
              letterStyle,
            ]}
          >
            <LinearGradient
              colors={['#F9F2E0', '#F1E7CB', '#EAD9B4']}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Bord gauche décoratif */}
            <View style={styles.letterBar} />
            {/* Lignes de texte simulées */}
            {[0, 1, 2, 3].map((i) => (
              <View
                key={i}
                style={[
                  styles.letterLine,
                  {
                    top:   16 + i * 13,
                    width: i === 3 ? '46%' : i === 0 ? '68%' : '80%',
                    opacity: 0.18 + i * 0.025,
                  },
                ]}
              />
            ))}
          </Animated.View>

          {/* ── z=3  front-pocket ───────────────────────────────────────────── */}
          {/*
            FACE AVANT de l'enveloppe — partie basse (sous la ligne de pli).
            Commence à top = LETTER_PEEK + FLAP_H = ligne de pli.
            Hauteur = POCKET_H = ENV_H - FLAP_H.
            TOUJOURS au-dessus de la lettre (z=3 > z=2) :
            la lettre qui monte semble encore dedans tant que sa partie basse
            est couverte par cette poche.
          */}
          <View
            style={[
              styles.frontPocket,
              {
                top:    LETTER_PEEK + FLAP_H,
                width:  ENV_W,
                height: POCKET_H,
              },
            ]}
          >
            <LinearGradient
              colors={['#DCB060', '#CC9E48', '#BC8C32']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            {/* Plis en X de la poche */}
            <Svg width={ENV_W} height={POCKET_H} style={StyleSheet.absoluteFill}>
              <Polygon
                points={PKT_L}
                fill="rgba(130,82,5,0.12)"
                stroke="rgba(110,68,3,0.28)"
                strokeWidth="0.8"
              />
              <Polygon
                points={PKT_R}
                fill="rgba(185,145,35,0.07)"
                stroke="rgba(110,68,3,0.28)"
                strokeWidth="0.8"
              />
              <Polygon
                points={PKT_B}
                fill="rgba(140,90,8,0.10)"
                stroke="rgba(110,68,3,0.28)"
                strokeWidth="0.8"
              />
            </Svg>
            {/* Micro-ombre en haut de la poche (profondeur à la ligne de pli) */}
            <View style={styles.pocketTopShadow} />
            {/* Bordure intérieure */}
            <View style={styles.pocketInner} />
          </View>

          {/* ── z=4  flap ───────────────────────────────────────────────────── */}
          {/*
            Rabat triangulaire supérieur.
            Positionné au top de l'enveloppe (LETTER_PEEK).
            Pivot au bord haut = hinge via translateY(+FLAP_H/2) + scaleY + translateY(-FLAP_H/2).
            scaleY 1→0 : la pointe du triangle remonte vers la ligne de hinge en haut.
          */}
          <Animated.View
            style={[
              styles.flap,
              { top: LETTER_PEEK, width: ENV_W, height: FLAP_H },
              flapStyle,
            ]}
          >
            <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
              {/* Remplissage du triangle */}
              <Polygon points={FLAP_TRI} fill="#C48828" />
              {/* Ombre gauche */}
              <Polygon
                points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(140,85,5,0.20)"
              />
              {/* Reflet droit */}
              <Polygon
                points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`}
                fill="rgba(255,210,100,0.10)"
              />
              {/* Contour */}
              <Polygon
                points={FLAP_TRI}
                fill="none"
                stroke="rgba(105,62,3,0.45)"
                strokeWidth="1.1"
              />
            </Svg>

            {/* Cachet de cire */}
            <Animated.View
              style={[
                styles.seal,
                {
                  bottom: 8,
                  left:   ENV_W / 2 - SEAL_R,
                  width:  SEAL_R * 2,
                  height: SEAL_R * 2,
                  borderRadius: SEAL_R,
                },
                sealStyle,
              ]}
            >
              <LinearGradient
                colors={['#C02828', '#7A0C0C', '#520808']}
                start={{ x: 0.3, y: 0 }}
                end={{ x: 0.7, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.sealRing} />
              <View style={styles.sealDot} />
            </Animated.View>
          </Animated.View>

          {/* Bordure extérieure de l'enveloppe */}
          <View
            style={[
              styles.outerBorder,
              { top: LETTER_PEEK, width: ENV_W, height: ENV_H },
            ]}
            pointerEvents="none"
          />

        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({

  // Container principal — overflow:hidden clip tout
  container: {
    position: 'relative',
    overflow: 'hidden',
    alignSelf: 'center',
    // Ombre portée sur l'ensemble
    shadowColor: '#3A1E00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.20,
    shadowRadius: 12,
    elevation: 8,
  },

  // z=1 — Fond arrière kraft
  backPanel: {
    position: 'absolute',
    left: 0,
    zIndex: 1,
    overflow: 'hidden',
  },

  // z=2 — Lettre (papier crème)
  letter: {
    position: 'absolute',
    zIndex: 2,
    overflow: 'hidden',
    borderRadius: 3,
  },
  letterBar: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 3,
    backgroundColor: '#A07018',
    opacity: 0.42,
  },
  letterLine: {
    position: 'absolute',
    left: 12,
    height: 1,
    backgroundColor: '#886215',
    borderRadius: 1,
  },

  // z=3 — Face avant de la poche (MASQUE la lettre en bas)
  frontPocket: {
    position: 'absolute',
    left: 0,
    zIndex: 3,
    overflow: 'hidden',
  },
  pocketTopShadow: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    height: 5,
    backgroundColor: 'rgba(60,32,0,0.12)',
  },
  pocketInner: {
    position: 'absolute',
    inset: 4,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(190,145,30,0.20)',
  },

  // z=4 — Rabat triangulaire
  flap: {
    position: 'absolute',
    left: 0,
    zIndex: 4,
  },

  // Cachet de cire
  seal: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 5,
    shadowColor: '#180000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 9,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: 'rgba(255,155,95,0.28)',
  },
  sealDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: 'rgba(255,175,125,0.42)',
  },

  // Bordure extérieure de l'enveloppe (par-dessus tout)
  outerBorder: {
    position: 'absolute',
    left: 0,
    zIndex: 10,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: 'rgba(110,65,3,0.38)',
  },
});
