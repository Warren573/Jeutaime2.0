/**
 * SalonAvatar — avatar animé pour les salons avec système de couches visuelles
 * ─────────────────────────────────────────────────────────────────────────────
 * 5 couches (z-index) :
 *  z:1 fond / halo     ← AvatarEffectLayer layer="behind"
 *  z:2 avatar base     ← DiceBear image + breathing
 *  z:3 transformation  ← AvatarTransformationLayer
 *  z:4 particules      ← AvatarEffectLayer layer="over"
 *  z:5 badges          ← offrandes reçues + badge "Moi"
 */

import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';
import type { ActiveEffect } from '../hooks/useAvatarEffects';

// ─── URLs DiceBear ────────────────────────────────────────────────────────────

const AVATAR_IMAGES: Record<string, string> = {
  zoe:       'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe&backgroundColor=b6e3f4',
  valerie:   'https://api.dicebear.com/7.x/adventurer/png?seed=Valerie&backgroundColor=ffd5dc',
  kevin:     'https://api.dicebear.com/7.x/adventurer/png?seed=Kevin&backgroundColor=c0aede',
  marc:      'https://api.dicebear.com/7.x/adventurer/png?seed=Marc&backgroundColor=d1f4d1',
  sophie:    'https://api.dicebear.com/7.x/adventurer/png?seed=Sophie&backgroundColor=ffe8b8',
  lucas:     'https://api.dicebear.com/7.x/adventurer/png?seed=Lucas&backgroundColor=b8d4ff',
  emma:      'https://api.dicebear.com/7.x/adventurer/png?seed=Emma&backgroundColor=ffb8d4',
  julie:     'https://api.dicebear.com/7.x/adventurer/png?seed=Julie&backgroundColor=ffc8e8',
  thomas:    'https://api.dicebear.com/7.x/adventurer/png?seed=Thomas&backgroundColor=c8ffc8',
  clara:     'https://api.dicebear.com/7.x/adventurer/png?seed=Clara&backgroundColor=fff0b8',
  alexandre: 'https://api.dicebear.com/7.x/adventurer/png?seed=Alexandre&backgroundColor=fde8c8',
  léa:       'https://api.dicebear.com/7.x/adventurer/png?seed=Lea&backgroundColor=ffd5dc',
  lea:       'https://api.dicebear.com/7.x/adventurer/png?seed=Lea&backgroundColor=ffd5dc',
  jules:     'https://api.dicebear.com/7.x/adventurer/png?seed=Jules&backgroundColor=c8ffc8',
  default:   'https://api.dicebear.com/7.x/adventurer/png?seed=Default&backgroundColor=e8e8e8',
  vous:      'https://api.dicebear.com/7.x/adventurer/png?seed=Me&backgroundColor=667eea',
  moi:       'https://api.dicebear.com/7.x/adventurer/png?seed=Me&backgroundColor=667eea',
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  participant: SalonParticipant & { isMe?: boolean };
  size: number;
  isSelected?: boolean;
  showBadges?: boolean;
  /** Effets actifs transmis par useAvatarEffects */
  activeEffects?: ActiveEffect[];
  /**
   * Si fourni, active la pression et appelle le callback avec les coordonnées
   * écran du centre de l'avatar (pour le menu radial et les projectiles).
   */
  onMeasuredPress?: (
    p: SalonParticipant & { isMe?: boolean },
    cx: number,
    cy: number
  ) => void;
  /** Appelé quand l'utilisateur tape sur le hint de rupture d'une transformation */
  onBreakAttempt?: (participantId: string, transformationId: string) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export default function SalonAvatar({
  participant,
  size,
  isSelected = false,
  showBadges = true,
  activeEffects = [],
  onMeasuredPress,
  onBreakAttempt,
}: Props) {
  const pressRef         = useRef<View>(null);
  const breathAnim       = useRef(new Animated.Value(1)).current;
  const prevEffectIdsRef = useRef<Set<string>>(new Set());
  const [activeReaction, setActiveReaction] = useState<{ emoji: string; category: string } | null>(null);

  // ── Détection d'un nouvel effet → déclenche l'animation de réaction ───────
  useEffect(() => {
    const prev    = prevEffectIdsRef.current;
    const newEff  = activeEffects.find(e => !prev.has(e.id));
    prevEffectIdsRef.current = new Set(activeEffects.map(e => e.id));
    if (newEff && !activeReaction) {
      setActiveReaction({ emoji: newEff.emoji, category: newEff.category });
    }
  }, [activeEffects]);

  // ── Breathing doux ────────────────────────────────────────────────────────
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.04, duration: 2200, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1,    duration: 2200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  // ── Image ─────────────────────────────────────────────────────────────────
  const avatarKey = participant.name.toLowerCase().replace(/[^a-zéèêëàâùûîïôæœ]/g, '').replace(/[éèêë]/g, 'e').replace(/[àâ]/g, 'a');
  const imageUrl  = AVATAR_IMAGES[avatarKey] ?? AVATAR_IMAGES.default;

  const handlePress = () => {
    if (!onMeasuredPress || !pressRef.current) return;
    pressRef.current.measureInWindow((x, y, w, h) => {
      onMeasuredPress(participant, x + w / 2, y + h / 2);
    });
  };

  const interactive = !!onMeasuredPress && !participant.isMe;

  // ── Couches d'effets ──────────────────────────────────────────────────────
  const visualEffects   = activeEffects.filter(e => e.category === 'visual_effect');
  const transformation  = activeEffects.find(e => e.category === 'transformation');
  const offeringBadges  = activeEffects.filter(e => e.category === 'offering').slice(-6);

  // ── Rendu ─────────────────────────────────────────────────────────────────
  const containerSize = size + 40; // espace pour halo + particules

  return (
    <View style={[styles.wrapper, { width: containerSize + 20 }]}>
      {/* Zone avatar — positionnement relatif des 5 couches */}
      <Pressable
        ref={pressRef}
        onPress={interactive ? handlePress : undefined}
        disabled={!interactive}
        style={[
          styles.avatarZone,
          { width: containerSize, height: containerSize + 28 },
        ]}
      >
        {/* ── z:1 — fond / halo (behind) ─────────────────────────────────── */}

        {/* ── z:2 — avatar base (breathing) ──────────────────────────────── */}
        <Animated.View
          style={[
            styles.circle,
            {
              width: size, height: size,
              borderRadius: size / 2,
              transform: [{ scale: breathAnim }],
            },
            isSelected && styles.circleSelected,
          ]}
        >
          <Image
            source={{ uri: `${imageUrl}&size=${size * 2}` }}
            style={{ width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }}
          />

          {/* Point en ligne */}
          {participant.online !== false && (
            <View style={[styles.onlineDot, { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]} />
          )}
        </Animated.View>

        {/* ── z:3 — transformation overlay ───────────────────────────────── */}

        {/* ── z:4 — particules / météo (over) ────────────────────────────── */}

        {/* ── z:5 — badges offrandes (ring) ──────────────────────────────── */}
        {showBadges && offeringBadges.length > 0 && (
          <View style={styles.offeringRing}>
            {offeringBadges.map((o, i) => (
              <OfferingBadge key={o.id} emoji={o.emoji} index={i} total={offeringBadges.length} size={size} />
            ))}
          </View>
        )}

        {/* Badge "Moi" */}
        {participant.isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>Moi</Text>
          </View>
        )}

        {/* ── z:6 — réaction animée (boire / manger / etc.) ─────────────── */}
      </Pressable>

      {/* Nom */}
      <Text style={[styles.name, { maxWidth: containerSize }]} numberOfLines={1}>
        {participant.name}
      </Text>

      {/* Offrandes persistantes (legacy — affichées si pas de activeEffects) */}
      {showBadges && offeringBadges.length === 0 && !!participant.offerings?.length && (
        <View style={styles.legacyBadges}>
          {participant.offerings.slice(-4).map((o, i) => (
            <Text key={i} style={styles.legacyBadge}>{o.emoji}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Badge offrande positionné en anneau ─────────────────────────────────────

function OfferingBadge({
  emoji, index, total, size,
}: { emoji: string; index: number; total: number; size: number }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(fadeAnim, { toValue: 1, friction: 5, useNativeDriver: true }).start();
  }, []);

  // Positionnement en arc au-dessus de l'avatar
  const angle = (-Math.PI / 2) + ((index - (total - 1) / 2) * (Math.PI / (total + 1)));
  const R = size / 2 + 14;
  const x = Math.cos(angle) * R;
  const y = Math.sin(angle) * R;

  return (
    <Animated.View
      style={[
        styles.offeringBadge,
        {
          transform: [
            { translateX: x },
            { translateY: y },
            { scale: fadeAnim },
          ],
        },
      ]}
    >
      <Text style={styles.offeringBadgeEmoji}>{emoji}</Text>
    </Animated.View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  avatarZone: {
    alignItems:     'center',
    justifyContent: 'center',
    position:       'relative',
  },
  circle: {
    backgroundColor: '#F0F0F0',
    alignItems:      'center',
    justifyContent:  'center',
    borderWidth:     3,
    borderColor:     '#FFF',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 3 },
    shadowOpacity:   0.18,
    shadowRadius:    6,
    elevation:       5,
    zIndex:          2,
  },
  circleSelected: {
    borderColor:   '#C9A96E',
    borderWidth:   3.5,
    shadowColor:   '#C9A96E',
    shadowOpacity: 0.55,
  },
  onlineDot: {
    position:    'absolute',
    bottom:      2,
    right:       2,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  meBadge: {
    position:         'absolute',
    bottom:           -8,
    backgroundColor:  '#667eea',
    paddingHorizontal: 8,
    paddingVertical:  2,
    borderRadius:     10,
    zIndex:           5,
  },
  meBadgeText: {
    fontSize:   10,
    color:      '#FFF',
    fontWeight: '700',
  },
  name: {
    fontSize:   12,
    color:      '#5D4037',
    fontWeight: '600',
    textAlign:  'center',
    marginTop:  8,
  },
  offeringRing: {
    position: 'absolute',
    width:    0,
    height:   0,
    zIndex:   5,
  },
  offeringBadge: {
    position: 'absolute',
  },
  offeringBadgeEmoji: {
    fontSize: 16,
  },
  legacyBadges: {
    flexDirection:  'row',
    justifyContent: 'center',
    marginTop:      4,
    flexWrap:       'wrap',
  },
  legacyBadge: {
    fontSize:       13,
    marginHorizontal: 1,
  },
});
