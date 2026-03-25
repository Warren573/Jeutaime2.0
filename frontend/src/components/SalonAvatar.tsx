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

import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';
import type { ActiveEffect } from '../hooks/useAvatarEffects';
import { AvatarRenderer } from '../avatar/components/AvatarRenderer';
import { MOCK_PROFILE_AVATARS, MOCK_AVATAR_DEFAULT } from '../avatar/data/mockAvatars';

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
  const pressRef   = useRef<View>(null);
  const breathAnim = useRef(new Animated.Value(1)).current;

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

  // ── Avatar def ────────────────────────────────────────────────────────────
  const avatarDef = MOCK_PROFILE_AVATARS[participant.id] ?? MOCK_AVATAR_DEFAULT;

  const handlePress = () => {
    if (!onMeasuredPress || !pressRef.current) return;
    pressRef.current.measureInWindow((x, y, w, h) => {
      onMeasuredPress(participant, x + w / 2, y + h / 2);
    });
  };

  const interactive = !!onMeasuredPress && !participant.isMe;

  // ── Badges offrandes (anneau) ─────────────────────────────────────────────
  const offeringBadges = activeEffects.filter(e => e.category === 'offering').slice(-6);

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
              overflow: 'hidden',
            },
            isSelected && styles.circleSelected,
          ]}
        >
          <AvatarRenderer avatar={avatarDef} size={size} />

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
});
