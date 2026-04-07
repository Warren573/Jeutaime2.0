/**
 * PremiumLetterAnimation — Enveloppe réaliste avec rabat triangulaire SVG
 *
 * Séquence :
 *   1. Arrivée avec spring naturel
 *   2. Cachet de cire qui pulse
 *   3. Rabat s'ouvre (rotateX avec pivot sur le bord supérieur)
 *   4. Lettre parcheminée qui sort par le haut
 *   5. État final : lettre dépassant de l'enveloppe ouverte
 */
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
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
import Svg, { Polygon, Line, Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SW } = Dimensions.get('window');
const ENV_W  = Math.min(SW - 48, 300);
const ENV_H  = Math.round(ENV_W * 0.64);
const FLAP_H = Math.round(ENV_H * 0.52);   // hauteur du triangle du rabat

// Points SVG du rabat triangulaire : coin haut-gauche, haut-droit, pointe centrale en bas
const FLAP_PTS = `0,0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`;
// Points des triangles latéraux (lignes de pli du corps)
const FOLD_LEFT  = `0,0 0,${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_RIGHT = `${ENV_W},0 ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;
const FOLD_BTM   = `0,${ENV_H} ${ENV_W},${ENV_H} ${ENV_W / 2},${ENV_H / 2}`;

// Lettre : dépasse de PEEK_H au-dessus du bord de l'enveloppe, reste dedans pour le reste
const PEEK_H   = Math.round(ENV_H * 0.42);  // hauteur visible au-dessus de l'enveloppe
const LETTER_W = ENV_W - 20;
const LETTER_H = PEEK_H + ENV_H;             // total : peek + partie dans l'enveloppe

interface Props {
  senderName?: string;
}

export function PremiumLetterAnimation({ senderName = 'Sophie' }: Props) {
  // ── Conteneur global ────────────────────────────────────────────────────────
  const wrapOpacity    = useSharedValue(0);
  const wrapTranslateY = useSharedValue(60);
  const wrapScale      = useSharedValue(0.88);

  // ── Cachet de cire ──────────────────────────────────────────────────────────
  const sealScale   = useSharedValue(1);
  const sealOpacity = useSharedValue(1);

  // ── Rabat (rotateX pivoté sur le bord supérieur) ────────────────────────────
  const flapRotate  = useSharedValue(0);   // 0 = fermé, 1 = ouvert (-165°)
  const flapOpacity = useSharedValue(1);

  // ── Lettre ──────────────────────────────────────────────────────────────────
  // Commence cachée dans l'enveloppe (translateY = ENV_H * 0.5 depuis top:0)
  // Finit à translateY = -PEEK_H (dépasse de PEEK_H au-dessus)
  const letterY       = useSharedValue(ENV_H * 0.55);
  const letterOpacity = useSharedValue(0);
  const letterShadow  = useSharedValue(0);

  useEffect(() => {
    // 1 — Arrivée
    wrapOpacity.value    = withTiming(1, { duration: 350 });
    wrapTranslateY.value = withSpring(0, { damping: 12, stiffness: 110 });
    wrapScale.value      = withSequence(
      withTiming(1.04, { duration: 200 }),
      withTiming(1.0,  { duration: 180 }),
    );

    // 2 — Cachet pulse
    sealScale.value = withDelay(400, withSequence(
      withTiming(1.18, { duration: 200 }),
      withTiming(1.0,  { duration: 160 }),
      withTiming(1.12, { duration: 150 }),
      withTiming(1.0,  { duration: 140 }),
    ));

    // 3 — Cachet s'efface quand le rabat s'ouvre
    sealOpacity.value = withDelay(800, withTiming(0, { duration: 220 }));

    // 4 — Rabat s'ouvre (rotateX de 0° à -165°)
    flapRotate.value = withDelay(750, withSpring(1, {
      damping: 14, stiffness: 70, mass: 1.1,
    }));
    flapOpacity.value = withDelay(1050, withTiming(0.08, {
      duration: 300, easing: Easing.out(Easing.quad),
    }));

    // 5 — Lettre sort de l'enveloppe (s'arrête à -PEEK_H = juste au-dessus du bord)
    letterOpacity.value = withDelay(880, withTiming(1, { duration: 300 }));
    letterY.value       = withDelay(880, withSpring(-PEEK_H, {
      damping: 13, stiffness: 80,
    }));
    letterShadow.value  = withDelay(1100, withTiming(1, { duration: 400 }));
  }, []);

  // ── Styles animés ────────────────────────────────────────────────────────────
  const wrapStyle = useAnimatedStyle(() => ({
    opacity: wrapOpacity.value,
    transform: [
      { translateY: wrapTranslateY.value },
      { scale: wrapScale.value },
    ],
  }));

  const sealStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sealScale.value }],
    opacity: sealOpacity.value,
  }));

  // Rabat : pivot sur le bord supérieur via translate + rotateX + translate inverse
  const flapStyle = useAnimatedStyle(() => {
    const deg = interpolate(flapRotate.value, [0, 1], [0, -165]);
    return {
      opacity: flapOpacity.value,
      transform: [
        { translateY: FLAP_H / 2 },
        { perspective: 900 },
        { rotateX: `${deg}deg` },
        { translateY: -(FLAP_H / 2) },
      ],
    };
  });

  const letterStyle = useAnimatedStyle(() => ({
    opacity: letterOpacity.value,
    transform: [{ translateY: letterY.value }],
  }));

  // ── Rendu ─────────────────────────────────────────────────────────────────────
  // Outer : espace PEEK_H en haut pour la lettre qui dépasse + ENV_H pour l'enveloppe
  return (
    <View style={[styles.outer, { height: ENV_H + PEEK_H + 20 }]}>
      <Animated.View style={[styles.scene, { width: ENV_W, height: ENV_H }, wrapStyle]}>

        {/* ① LETTRE (derrière, sort par le dessus — top:0, translateY négatif pour sortir) */}
        <Animated.View
          style={[
            styles.letter,
            { width: LETTER_W, height: LETTER_H, top: 0, left: 10 },
            letterStyle,
          ]}
        >
          <LinearGradient
            colors={['#FDF6E8', '#F5E8CC', '#F0DDB8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Bords décoratifs gauche + droite (finesse papier lettre) */}
          <View style={styles.letterBorderLeft} />
          <View style={styles.letterBorderRight} />

          {/* ── Zone visible PEEK (haut de la lettre qui dépasse de l'enveloppe) ── */}
          {/* Bandeau décoratif haut */}
          <View style={styles.letterTopBand}>
            <View style={styles.letterTopBandLine} />
            <Text style={styles.letterTopBandText}>✦  Lettre privée  ✦</Text>
            <View style={styles.letterTopBandLine} />
          </View>

          {/* Nom de l'expéditeur (visible dans le peek) */}
          <Text style={styles.letterFrom}>De la part de</Text>
          <Text style={styles.letterName}>{senderName}</Text>

          {/* Séparateur ornemental */}
          <View style={styles.letterDividerRow}>
            <View style={styles.letterDividerLine} />
            <Text style={styles.letterDividerOrnament}>❧</Text>
            <View style={styles.letterDividerLine} />
          </View>

          {/* ── Zone dans l'enveloppe (non visible jusqu'au tap) ── */}
          {/* Lignes de texte simulées */}
          <View style={styles.ruledLines}>
            {[0, 1, 2, 3].map(i => (
              <View key={i} style={[styles.ruleLine, { opacity: 0.35 + i * 0.04, width: i === 3 ? '55%' : '100%' }]} />
            ))}
          </View>

          {/* Invite à lire */}
          <View style={styles.letterFooter}>
            <View style={styles.letterFooterLine} />
            <Text style={styles.letterHint}>✉  Toucher pour lire</Text>
          </View>

          {/* Grain de papier */}
          {Array.from({ length: 10 }).map((_, i) => (
            <View
              key={`grain-${i}`}
              style={[styles.paperGrain, { top: 20 + i * 16, opacity: 0.05 + (i % 2) * 0.025 }]}
            />
          ))}
        </Animated.View>

        {/* ② CORPS DE L'ENVELOPPE */}
        <View style={[styles.envBody, { width: ENV_W, height: ENV_H }]}>
          <LinearGradient
            colors={['#EDD5A3', '#E8C98A', '#DFB86A']}
            start={{ x: 0.1, y: 0 }}
            end={{ x: 0.9, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          {/* Lignes de pli (4 triangles qui se rejoignent au centre) */}
          <Svg width={ENV_W} height={ENV_H} style={StyleSheet.absoluteFill}>
            {/* Triangle gauche */}
            <Polygon
              points={FOLD_LEFT}
              fill="rgba(180,130,60,0.10)"
              stroke="rgba(160,110,40,0.28)"
              strokeWidth="0.8"
            />
            {/* Triangle droit */}
            <Polygon
              points={FOLD_RIGHT}
              fill="rgba(210,160,70,0.07)"
              stroke="rgba(160,110,40,0.28)"
              strokeWidth="0.8"
            />
            {/* Triangle bas */}
            <Polygon
              points={FOLD_BTM}
              fill="rgba(190,140,60,0.12)"
              stroke="rgba(160,110,40,0.28)"
              strokeWidth="0.8"
            />
          </Svg>
          {/* Bordure intérieure décorative */}
          <View style={styles.envInnerBorder} />
          {/* Ombre intérieure en haut = effet "poche ouverte" */}
          <View style={styles.envTopPocket} />
        </View>

        {/* ③ RABAT TRIANGULAIRE (au-dessus du corps, s'ouvre en rotateX) */}
        <Animated.View
          style={[
            styles.flapContainer,
            { width: ENV_W, height: FLAP_H },
            flapStyle,
          ]}
        >
          <Svg width={ENV_W} height={FLAP_H} style={StyleSheet.absoluteFill}>
            {/* Remplissage du triangle */}
            <Polygon
              points={FLAP_PTS}
              fill="#E5C280"
            />
            {/* Ombrage dégradé simulé sur le rabat */}
            <Polygon
              points={`0,0 ${ENV_W / 2},0 ${ENV_W / 2},${FLAP_H}`}
              fill="rgba(200,160,60,0.18)"
            />
            <Polygon
              points={`${ENV_W / 2},0 ${ENV_W},0 ${ENV_W / 2},${FLAP_H}`}
              fill="rgba(255,240,190,0.15)"
            />
            {/* Contour du triangle */}
            <Polygon
              points={FLAP_PTS}
              fill="none"
              stroke="rgba(160,110,40,0.55)"
              strokeWidth="1.2"
            />
          </Svg>

          {/* Cachet de cire */}
          <Animated.View style={[styles.sealWrap, sealStyle]}>
            <LinearGradient
              colors={['#C0392B', '#7B1515', '#5A0E0E']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 0.8, y: 1 }}
              style={styles.sealGrad}
            />
            <Text style={styles.sealEmoji}>💌</Text>
            {/* Relief du cachet */}
            <View style={styles.sealRing} />
          </Animated.View>
        </Animated.View>

      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    alignItems: 'center',
    justifyContent: 'flex-end',  // enveloppe collée en bas, espace libre en haut pour le peek
    overflow: 'visible',
  },
  scene: {
    position: 'relative',
    overflow: 'visible',          // permet à la lettre de sortir vers le haut
  },

  // ── Lettre ──────────────────────────────────────────────────────────────────
  letter: {
    position: 'absolute',
    borderRadius: 6,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#C8A870',
    zIndex: 1,
    // Ombre portée
    shadowColor: '#4A2E00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  letterBorderLeft: {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: 2.5,
    backgroundColor: '#C8962A',
    opacity: 0.5,
  },
  letterBorderRight: {
    position: 'absolute',
    right: 0, top: 0, bottom: 0,
    width: 2.5,
    backgroundColor: '#C8962A',
    opacity: 0.3,
  },
  // Bandeau décoratif haut (visible dans le peek)
  letterTopBand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
    backgroundColor: 'rgba(200,160,60,0.12)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(180,130,50,0.25)',
  },
  letterTopBandLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#B8902A',
    opacity: 0.5,
  },
  letterTopBandText: {
    fontSize: 9,
    color: '#7A5210',
    letterSpacing: 1.2,
    fontStyle: 'italic',
  },
  letterFrom: {
    fontSize: 9,
    color: '#8A6A30',
    letterSpacing: 1.8,
    textTransform: 'uppercase',
    marginTop: 10,
    paddingHorizontal: 14,
  },
  letterName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A2208',
    paddingHorizontal: 14,
    marginTop: 1,
    fontStyle: 'italic',
  },
  letterDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginTop: 8,
    marginBottom: 4,
    gap: 8,
  },
  letterDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#C8A870',
    opacity: 0.55,
  },
  letterDividerOrnament: {
    fontSize: 14,
    color: '#9A6A20',
  },
  ruledLines: {
    paddingHorizontal: 14,
    marginTop: 8,
    gap: 12,
  },
  ruleLine: {
    height: 1,
    backgroundColor: '#A08040',
    alignSelf: 'stretch',
  },
  paperGrain: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#6A4A10',
  },
  letterFooter: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    alignItems: 'center',
  },
  letterFooterLine: {
    width: '65%',
    height: 1,
    backgroundColor: '#C8A870',
    opacity: 0.5,
    marginBottom: 6,
  },
  letterHint: {
    fontSize: 11,
    color: '#7A4A10',
    fontStyle: 'italic',
    letterSpacing: 0.5,
  },

  // ── Corps enveloppe ──────────────────────────────────────────────────────────
  envBody: {
    position: 'absolute',
    top: 0,
    left: 0,
    borderRadius: 10,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#B8882A',
    zIndex: 2,
  },
  envInnerBorder: {
    position: 'absolute',
    inset: 4,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: 'rgba(200,160,60,0.35)',
  },
  envTopPocket: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 18,
    backgroundColor: 'rgba(80,40,0,0.10)',
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  },

  // ── Rabat ────────────────────────────────────────────────────────────────────
  flapContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    zIndex: 3,
    overflow: 'visible',
  },

  // ── Cachet de cire ───────────────────────────────────────────────────────────
  sealWrap: {
    position: 'absolute',
    bottom: 4,
    left: ENV_W / 2 - 26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  sealGrad: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 26,
  },
  sealEmoji: {
    fontSize: 24,
    zIndex: 1,
  },
  sealRing: {
    position: 'absolute',
    inset: 3,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(255,200,150,0.35)',
  },
});
