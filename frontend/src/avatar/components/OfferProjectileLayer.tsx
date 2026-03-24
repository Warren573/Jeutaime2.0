/**
 * OfferProjectileLayer — Projectile animé d'une offrande
 * ─────────────────────────────────────────────────────────────────────────────
 * Trajectoires pilotées par offerRegistry :
 *  arcToMouth       → arc parabolique vers la bouche (boissons)
 *  softFloatToTorso → flottement doux vers le torse (rose, fleur, cœur)
 *  glideToTorso     → glissement avec légère rotation (lettre)
 *
 * Effets d'impact — différenciés par famille (ImpactVariant) :
 *
 *  warmGlow      (hotDrink)           → halo orange chaud, flash doux
 *  alcoholBounce (alcohol)            → spring overshoot énergique + flash doré
 *  petals        (symbolic/float)     → 4 petits points rose qui s'écartent
 *  ripple        (symbolic/glide=lettre) → anneau qui s'expand et disparaît
 *
 * Implémentation :
 *  - petalAnim      : Animated.Value(0→1), 4 pétales via interpolate (useMemo)
 *  - rippleScale    : Animated.Value, expansion anneau
 *  - rippleOpacity  : Animated.Value, fondu anneau
 *  - glowOpacity    : Animated.Value, flash pour warmGlow + alcoholBounce
 *  Tous useNativeDriver: true → thread UI non bloqué
 */

import React, { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { OfferFamily, OfferTrajectoryKey } from '../types/avatarTypes';

// ── Couleurs d'impact ──────────────────────────────────────────────────────

const GLOW_COLOR: Record<OfferFamily, string> = {
  hotDrink: 'rgba(255, 148, 40,  0.52)',
  alcohol:  'rgba(255, 210, 55,  0.48)',
  symbolic: 'rgba(255, 120, 175, 0.45)',
};

const PETAL_COLOR  = 'rgba(248, 128, 172, 0.88)';
const RIPPLE_COLOR = 'rgba(218, 188, 110, 0.60)';

// ── Positions des pétales (offset final en px depuis le centre) ────────────

const PETAL_OFFSETS = [
  { x:  19, y: -23 },
  { x: -21, y: -18 },
  { x:  22, y:  15 },
  { x: -17, y:  20 },
] as const;

// ── Variant d'impact ───────────────────────────────────────────────────────

type ImpactVariant = 'warmGlow' | 'alcoholBounce' | 'petals' | 'ripple';

function getImpactVariant(family: OfferFamily, trajectory: OfferTrajectoryKey): ImpactVariant {
  if (family === 'hotDrink') return 'warmGlow';
  if (family === 'alcohol')  return 'alcoholBounce';
  // symbolic : lettre → ripple, tout le reste → pétales
  return trajectory === 'glideToTorso' ? 'ripple' : 'petals';
}

// ── Composant ──────────────────────────────────────────────────────────────

interface Props {
  visible:    boolean;
  emoji:      string;
  trajectory: OfferTrajectoryKey;
  family:     OfferFamily;
}

export function OfferProjectileLayer({ visible, emoji, trajectory, family }: Props) {
  const tx            = useRef(new Animated.Value(-60)).current;
  const ty            = useRef(new Animated.Value(60)).current;
  const scale         = useRef(new Animated.Value(0.7)).current;
  const opacity       = useRef(new Animated.Value(0)).current;
  const rotate        = useRef(new Animated.Value(0)).current;
  // Impact values
  const glowOpacity   = useRef(new Animated.Value(0)).current;
  const petalAnim     = useRef(new Animated.Value(0)).current;
  const rippleScale   = useRef(new Animated.Value(0.5)).current;
  const rippleOpacity = useRef(new Animated.Value(0)).current;

  // Variant calculé une fois par render (stable pendant toute l'animation)
  const impactVariant = getImpactVariant(family, trajectory);

  // Interpolations des pétales — créées une seule fois (petalAnim ne change jamais)
  const petals = useMemo(() => PETAL_OFFSETS.map((off) => ({
    tx: petalAnim.interpolate({ inputRange: [0, 1], outputRange: [0, off.x] }),
    ty: petalAnim.interpolate({ inputRange: [0, 1], outputRange: [0, off.y] }),
    op: petalAnim.interpolate({
      inputRange:  [0, 0.12, 0.70, 1],
      outputRange: [0, 1,    0.85, 0],
    }),
  })), [petalAnim]);

  useEffect(() => {
    if (!visible) return;

    // ── Reset ──────────────────────────────────────────────────────────────
    tx.setValue(-60);
    ty.setValue(60);
    scale.setValue(0.7);
    opacity.setValue(0);
    rotate.setValue(0);
    glowOpacity.setValue(0);
    petalAnim.setValue(0);
    rippleScale.setValue(0.5);
    rippleOpacity.setValue(0);

    const fadeIn  = Animated.timing(opacity, { toValue: 1, duration: 130, useNativeDriver: true });
    const fadeOut = Animated.timing(opacity, { toValue: 0, duration: 180, useNativeDriver: true });

    // ── Effet d'impact selon le variant ────────────────────────────────────

    const buildImpact = (): Animated.CompositeAnimation => {

      if (impactVariant === 'warmGlow') {
        // Chaleur douce — halo orange, fondu lent
        return Animated.parallel([
          Animated.spring(scale, { toValue: 1.4, tension: 320, friction: 4, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(glowOpacity, { toValue: 1, duration: 65,  useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0, duration: 320, useNativeDriver: true }),
          ]),
        ]);
      }

      if (impactVariant === 'alcoholBounce') {
        // Énergie — overshoot prononcé + flash rapide
        return Animated.parallel([
          Animated.spring(scale, { toValue: 1.68, tension: 430, friction: 3, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(glowOpacity, { toValue: 1, duration: 50,  useNativeDriver: true }),
            Animated.timing(glowOpacity, { toValue: 0, duration: 190, useNativeDriver: true }),
          ]),
        ]);
      }

      if (impactVariant === 'petals') {
        // Romantique — 4 petits pétales qui s'écartent, scale doux
        return Animated.parallel([
          Animated.spring(scale, { toValue: 1.28, tension: 260, friction: 5, useNativeDriver: true }),
          Animated.timing(petalAnim, { toValue: 1, duration: 430, useNativeDriver: true }),
        ]);
      }

      // ripple — lettre : anneau qui s'ouvre et se dissout
      return Animated.parallel([
        Animated.spring(scale, { toValue: 1.18, tension: 200, friction: 6, useNativeDriver: true }),
        Animated.timing(rippleScale,   { toValue: 2.3,  duration: 400, useNativeDriver: true }),
        Animated.sequence([
          Animated.timing(rippleOpacity, { toValue: 0.65, duration: 55,  useNativeDriver: true }),
          Animated.timing(rippleOpacity, { toValue: 0,    duration: 345, useNativeDriver: true }),
        ]),
      ]);
    };

    // ── Trajectoires ───────────────────────────────────────────────────────

    const impact = buildImpact();

    const trajectories: Record<OfferTrajectoryKey, Animated.CompositeAnimation> = {

      arcToMouth: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx, { toValue: 0,   duration: 650, useNativeDriver: true }),
          Animated.sequence([
            Animated.timing(ty, { toValue: -15, duration: 280, useNativeDriver: true }),
            Animated.timing(ty, { toValue: -5,  duration: 370, useNativeDriver: true }),
          ]),
          Animated.timing(scale, { toValue: 1.1, duration: 650, useNativeDriver: true }),
        ]),
        impact,
        fadeOut,
      ]),

      softFloatToTorso: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx,    { toValue: -8,  duration: 850, useNativeDriver: true }),
          Animated.timing(ty,    { toValue: 10,  duration: 850, useNativeDriver: true }),
          Animated.timing(scale, { toValue: 1,   duration: 850, useNativeDriver: true }),
        ]),
        impact,
        fadeOut,
      ]),

      glideToTorso: Animated.sequence([
        Animated.parallel([
          fadeIn,
          Animated.timing(tx,     { toValue: -5,  duration: 720, useNativeDriver: true }),
          Animated.timing(ty,     { toValue: 18,  duration: 720, useNativeDriver: true }),
          Animated.timing(scale,  { toValue: 1,   duration: 720, useNativeDriver: true }),
          Animated.timing(rotate, { toValue: 1,   duration: 720, useNativeDriver: true }),
        ]),
        impact,
        fadeOut,
      ]),
    };

    trajectories[trajectory].start();
  }, [
    visible, trajectory, impactVariant,
    tx, ty, scale, opacity, rotate,
    glowOpacity, petalAnim, rippleScale, rippleOpacity,
  ]);

  if (!visible) return null;

  const rotateDeg = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['-8deg', '0deg'],
  });

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFillObject}>

      {/* ── Glow chaud (hotDrink) ou flash doré (alcohol) ── */}
      {(impactVariant === 'warmGlow' || impactVariant === 'alcoholBounce') && (
        <Animated.View
          style={[
            styles.glow,
            { backgroundColor: GLOW_COLOR[family], opacity: glowOpacity },
          ]}
        />
      )}

      {/* ── Pétales (symbolic / rose, fleur, cœur) ── */}
      {impactVariant === 'petals' && petals.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.petal,
            { opacity: p.op, transform: [{ translateX: p.tx }, { translateY: p.ty }] },
          ]}
        />
      ))}

      {/* ── Ripple (lettre) ── */}
      {impactVariant === 'ripple' && (
        <Animated.View
          style={[
            styles.ripple,
            { opacity: rippleOpacity, transform: [{ scale: rippleScale }] },
          ]}
        />
      )}

      {/* ── Projectile ── */}
      <Animated.View style={[
        styles.projectile,
        { opacity, transform: [{ translateX: tx }, { translateY: ty }, { scale }, { rotate: rotateDeg }] },
      ]}>
        <Text style={styles.emoji}>{emoji}</Text>
      </Animated.View>

    </View>
  );
}

const styles = StyleSheet.create({
  // Halo plein — hotDrink et alcohol
  glow: {
    position:     'absolute',
    left:         '45%',
    top:          '52%',
    width:        64,
    height:       64,
    marginLeft:   -32,
    marginTop:    -32,
    borderRadius: 32,
    zIndex:       101,
  },
  // Micro-point pétale — symbolic/float
  petal: {
    position:        'absolute',
    left:            '45%',
    top:             '52%',
    width:           11,
    height:          11,
    marginLeft:      -5.5,
    marginTop:       -5.5,
    borderRadius:    6,
    backgroundColor: PETAL_COLOR,
    zIndex:          101,
  },
  // Anneau qui s'expand — lettre
  ripple: {
    position:        'absolute',
    left:            '45%',
    top:             '52%',
    width:           54,
    height:          54,
    marginLeft:      -27,
    marginTop:       -27,
    borderRadius:    27,
    borderWidth:     2,
    borderColor:     RIPPLE_COLOR,
    backgroundColor: 'transparent',
    zIndex:          101,
  },
  // Projectile emoji
  projectile: {
    position:   'absolute',
    left:       '45%',
    top:        '52%',
    marginLeft: -18,
    marginTop:  -18,
    // zIndex 102 : au-dessus des overlays (100), sous les réactions (110)
    zIndex:     102,
  },
  emoji: {
    fontSize: 36,
  },
});
