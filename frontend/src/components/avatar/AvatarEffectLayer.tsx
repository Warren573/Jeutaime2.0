/**
 * AvatarEffectLayer
 * ─────────────────────────────────────────────────────────────────────────────
 * Couche d'effets visuels ANIMÉS autour d'un avatar dans les salons.
 *
 * Rendu sur 2 couches distinctes :
 *  layer="behind"  → fond / halo (z:1)  — aura, ombre, soleil
 *  layer="over"    → particules (z:4)   — étincelles, étoiles, confettis, pétales, pluie
 *
 * Design : premium, lisible sur un avatar 54-88px, pas de surcharge visuelle.
 * Animation : uniquement Animated de React Native (pas de librairie externe).
 */

import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

export type VisualEffectId =
  | 'aura'
  | 'etincelles'
  | 'halo'
  | 'fumee'
  | 'ombre'
  | 'pluie_etoiles'
  | 'etoiles_filantes'
  | 'confettis'
  | 'petales'
  | 'pluie'
  | 'soleil';

export type EffectLayer = 'behind' | 'over';

interface Props {
  effectId: VisualEffectId;
  layer: EffectLayer;
  size: number;            // diamètre de l'avatar
}

// ─── Composant dispatcher ─────────────────────────────────────────────────────

export function AvatarEffectLayer({ effectId, layer, size }: Props) {
  // Chaque effet rend sur la couche correcte
  const effectLayer = EFFECT_LAYER_MAP[effectId] ?? 'behind';
  if (effectLayer !== layer) return null;

  switch (effectId) {
    case 'aura':           return <AuraEffect   size={size} />;
    case 'soleil':         return <SunshineEffect size={size} />;
    case 'ombre':          return <ShadowEffect  size={size} />;
    case 'etincelles':     return <SparklesEffect size={size} />;
    case 'halo':           return <HaloEffect     size={size} />;
    case 'fumee':          return <SmokeEffect    size={size} />;
    case 'pluie_etoiles':  return <StarRainEffect  size={size} count={5} emoji="⭐" />;
    case 'etoiles_filantes': return <StarRainEffect size={size} count={4} emoji="🌟" speed={700} />;
    case 'confettis':      return <ConfettiEffect  size={size} />;
    case 'petales':        return <PetalsEffect    size={size} />;
    case 'pluie':          return <RainEffect      size={size} />;
    default:               return null;
  }
}

// Mapping effectId → couche de rendu
const EFFECT_LAYER_MAP: Record<VisualEffectId, EffectLayer> = {
  aura:             'behind',
  soleil:           'behind',
  ombre:            'behind',
  etincelles:       'over',
  halo:             'over',
  fumee:            'over',
  pluie_etoiles:    'over',
  etoiles_filantes: 'over',
  confettis:        'over',
  petales:          'over',
  pluie:            'over',
};

// ─── Aura dorée pulsante ──────────────────────────────────────────────────────

function AuraEffect({ size }: { size: number }) {
  const pulse   = useRef(new Animated.Value(0)).current;
  const auraSize = size + 22;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.55] });
  const scale   = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absoluteCenter,
        {
          width: auraSize, height: auraSize,
          borderRadius: auraSize / 2,
          backgroundColor: '#C9A96E',
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

// ─── Rayon de soleil ──────────────────────────────────────────────────────────

function SunshineEffect({ size }: { size: number }) {
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(glow, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = glow.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.5] });
  const glowSize = size + 30;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absoluteCenter,
        {
          width: glowSize, height: glowSize,
          borderRadius: glowSize / 2,
          backgroundColor: '#FFD700',
          opacity,
        },
      ]}
    />
  );
}

// ─── Ombre mystérieuse ────────────────────────────────────────────────────────

function ShadowEffect({ size }: { size: number }) {
  const drift = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(drift, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(drift, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = drift.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.55] });
  const shadowSize = size + 18;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absoluteCenter,
        {
          width: shadowSize, height: shadowSize,
          borderRadius: shadowSize / 2,
          backgroundColor: '#1A1A2E',
          opacity,
        },
      ]}
    />
  );
}

// ─── Étincelles (4 points qui tournent) ──────────────────────────────────────

function SparklesEffect({ size }: { size: number }) {
  const rotate = useRef(new Animated.Value(0)).current;
  const EMOJIS = ['✨', '💫', '⚡', '✨'];
  const R = size / 2 + 8;

  useEffect(() => {
    Animated.loop(
      Animated.timing(rotate, { toValue: 1, duration: 3000, useNativeDriver: true })
    ).start();
  }, []);

  const rotation = rotate.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.absoluteCenter,
        { width: size, height: size, transform: [{ rotate: rotation }] },
      ]}
    >
      {EMOJIS.map((emoji, i) => {
        const angle = (i / EMOJIS.length) * 2 * Math.PI;
        const x = Math.cos(angle) * R - 7;
        const y = Math.sin(angle) * R - 7;
        return (
          <Text key={i} style={[styles.sparkleEmoji, { left: size / 2 + x, top: size / 2 + y }]}>
            {emoji}
          </Text>
        );
      })}
    </Animated.View>
  );
}

// ─── Halo (flotte au-dessus) ─────────────────────────────────────────────────

function HaloEffect({ size }: { size: number }) {
  const bob = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(bob, { toValue: -4, duration: 900, useNativeDriver: true }),
        Animated.timing(bob, { toValue: 0,  duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.haloContainer,
        { top: -(size * 0.55), transform: [{ translateY: bob }] },
      ]}
    >
      <Text style={{ fontSize: size * 0.36 }}>😇</Text>
    </Animated.View>
  );
}

// ─── Nuage de fumée ───────────────────────────────────────────────────────────

function SmokeEffect({ size }: { size: number }) {
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(fade, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.smokeContainer, { opacity: fade }]}
    >
      <Text style={{ fontSize: size * 0.7 }}>💨</Text>
    </Animated.View>
  );
}

// ─── Pluie d'étoiles (générique) ─────────────────────────────────────────────

function StarRainEffect({
  size, count = 5, emoji = '⭐', speed = 1000,
}: { size: number; count: number; emoji: string; speed?: number }) {
  const anims = useRef(
    Array.from({ length: count }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * (speed / count)),
          Animated.timing(a, { toValue: 1, duration: speed, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const range = size + 20;

  return (
    <View pointerEvents="none" style={[styles.absoluteCenter, { width: range, height: range }]}>
      {anims.map((a, i) => {
        const xPos = (i / count) * range - range / 2 + 6;
        const opacity = a.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 1, 1, 0] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-range / 2, range / 2] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.starEmoji,
              { left: range / 2 + xPos, opacity, transform: [{ translateY }] },
            ]}
          >
            {emoji}
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Confettis ────────────────────────────────────────────────────────────────

const CONFETTI_COLORS = ['#FF6B6B', '#FFD700', '#4ECDC4', '#FF69B4', '#7B68EE'];
const CONFETTI_COUNT = 8;

function ConfettiEffect({ size }: { size: number }) {
  const anims = useRef(
    Array.from({ length: CONFETTI_COUNT }, () => ({
      y: new Animated.Value(0),
      x: new Animated.Value(0),
      rot: new Animated.Value(0),
      opacity: new Animated.Value(0),
    }))
  ).current;

  useEffect(() => {
    const startConfetti = () => {
      anims.forEach((a, i) => {
        a.y.setValue(0); a.x.setValue(0);
        a.rot.setValue(0); a.opacity.setValue(0);
        const xDest = (Math.random() - 0.5) * (size + 30);
        Animated.sequence([
          Animated.delay(i * 80),
          Animated.parallel([
            Animated.timing(a.opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
            Animated.timing(a.y, { toValue: size * 0.8, duration: 900, useNativeDriver: true }),
            Animated.timing(a.x, { toValue: xDest, duration: 900, useNativeDriver: true }),
            Animated.timing(a.rot, { toValue: 1, duration: 900, useNativeDriver: true }),
          ]),
          Animated.timing(a.opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
      setTimeout(startConfetti, 1800);
    };
    startConfetti();
  }, []);

  return (
    <View pointerEvents="none" style={[styles.absoluteCenter, { width: size, height: size }]}>
      {anims.map((a, i) => {
        const rotation = a.rot.interpolate({
          inputRange: [0, 1],
          outputRange: ['0deg', `${180 + i * 30}deg`],
        });
        return (
          <Animated.View
            key={i}
            style={[
              styles.confettiPiece,
              {
                backgroundColor: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
                top: -6,
                left: size / 2 - 3,
                opacity: a.opacity,
                transform: [
                  { translateY: a.y },
                  { translateX: a.x },
                  { rotate: rotation },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

// ─── Pétales de rose ─────────────────────────────────────────────────────────

function PetalsEffect({ size }: { size: number }) {
  const PETALS = ['🌸', '🌺', '🌸', '🌷'];
  const anims = useRef(
    PETALS.map(() => ({ y: new Animated.Value(0), x: new Animated.Value(0), opacity: new Animated.Value(0) }))
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      const loop = () => {
        const xDest = (Math.random() - 0.5) * (size + 20);
        a.y.setValue(-size / 2);
        a.x.setValue(xDest / 3);
        a.opacity.setValue(0);
        Animated.sequence([
          Animated.delay(i * 350),
          Animated.parallel([
            Animated.timing(a.opacity, { toValue: 1, duration: 400, useNativeDriver: true }),
            Animated.timing(a.y, { toValue: size * 0.7, duration: 2200, useNativeDriver: true }),
            Animated.timing(a.x, { toValue: xDest, duration: 2200, useNativeDriver: true }),
          ]),
          Animated.timing(a.opacity, { toValue: 0, duration: 400, useNativeDriver: true }),
        ]).start(({ finished }) => { if (finished) loop(); });
      };
      loop();
    });
  }, []);

  return (
    <View pointerEvents="none" style={[styles.absoluteCenter, { width: size, height: size }]}>
      {anims.map((a, i) => (
        <Animated.Text
          key={i}
          style={[
            styles.petalEmoji,
            { left: size / 2 - 7, opacity: a.opacity, transform: [{ translateY: a.y }, { translateX: a.x }] },
          ]}
        >
          {PETALS[i]}
        </Animated.Text>
      ))}
    </View>
  );
}

// ─── Pluie sur avatar ─────────────────────────────────────────────────────────

const RAIN_DROPS = 7;

function RainEffect({ size }: { size: number }) {
  const anims = useRef(
    Array.from({ length: RAIN_DROPS }, () => new Animated.Value(0))
  ).current;

  useEffect(() => {
    anims.forEach((a, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(a, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(a, { toValue: 0, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  return (
    <View pointerEvents="none" style={[styles.absoluteCenter, { width: size + 20, height: size + 20 }]}>
      {anims.map((a, i) => {
        const opacity = a.interpolate({ inputRange: [0, 0.1, 0.8, 1], outputRange: [0, 0.9, 0.9, 0] });
        const translateY = a.interpolate({ inputRange: [0, 1], outputRange: [-(size / 2 + 10), size / 2 + 10] });
        return (
          <Animated.Text
            key={i}
            style={[
              styles.rainDrop,
              {
                left: (i / RAIN_DROPS) * (size + 20) - 6,
                opacity,
                transform: [{ translateY }],
              },
            ]}
          >
            💧
          </Animated.Text>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  absoluteCenter: {
    position:        'absolute',
    alignSelf:       'center',
    alignItems:      'center',
    justifyContent:  'center',
  },
  haloContainer: {
    position:  'absolute',
    alignSelf: 'center',
  },
  smokeContainer: {
    position:  'absolute',
    alignSelf: 'center',
    top:       0,
  },
  sparkleEmoji: {
    position: 'absolute',
    fontSize: 12,
  },
  starEmoji: {
    position: 'absolute',
    fontSize: 11,
  },
  petalEmoji: {
    position: 'absolute',
    fontSize: 13,
  },
  rainDrop: {
    position: 'absolute',
    fontSize: 10,
  },
  confettiPiece: {
    position:     'absolute',
    width:        6,
    height:       6,
    borderRadius: 1,
  },
});
