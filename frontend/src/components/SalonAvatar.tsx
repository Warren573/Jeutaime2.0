/**
 * SalonAvatar
 * Avatar animé (breathing) pour les salons.
 * Mesure sa propre position avec measureInWindow() pour déclencher le menu radial.
 */
import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  Animated,
  StyleSheet,
} from 'react-native';
import { SalonParticipant } from '../data/salonsData';

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
  /** Si fourni, active la pression et appelle le callback avec les coordonnées écran */
  onMeasuredPress?: (p: SalonParticipant & { isMe?: boolean }, cx: number, cy: number) => void;
}

// ─── Composant ───────────────────────────────────────────────────────────────

export default function SalonAvatar({
  participant,
  size,
  isSelected = false,
  showBadges = true,
  onMeasuredPress,
}: Props) {
  const pressRef   = useRef<View>(null);
  const breathAnim = useRef(new Animated.Value(1)).current;

  // Animation de respiration
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
        Animated.timing(breathAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const avatarKey = participant.name.toLowerCase().replace(/[^a-z]/g, '');
  const imageUrl  = AVATAR_IMAGES[avatarKey] ?? AVATAR_IMAGES.default;

  const handlePress = () => {
    if (!onMeasuredPress || !pressRef.current) return;
    pressRef.current.measureInWindow((x, y, w, h) => {
      onMeasuredPress(participant, x + w / 2, y + h / 2);
    });
  };

  const interactive = !!onMeasuredPress && !participant.isMe;

  return (
    <View style={styles.wrapper}>
      <Pressable
        ref={pressRef}
        onPress={interactive ? handlePress : undefined}
        disabled={!interactive}
        style={({ pressed }) => [{ opacity: pressed && interactive ? 0.85 : 1 }]}
      >
        <Animated.View
          style={[
            styles.circle,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              transform: [{ scale: breathAnim }],
            },
            isSelected && styles.circleSelected,
          ]}
        >
          <Image
            source={{ uri: `${imageUrl}&size=${size * 2}` }}
            style={{
              width:  size - 8,
              height: size - 8,
              borderRadius: (size - 8) / 2,
            }}
          />
          {/* Point en ligne */}
          {participant.online !== false && (
            <View
              style={[
                styles.onlineDot,
                { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 },
              ]}
            />
          )}
          {/* Badge "Moi" */}
          {participant.isMe && (
            <View style={styles.meBadge}>
              <Text style={styles.meBadgeText}>Moi</Text>
            </View>
          )}
        </Animated.View>
      </Pressable>

      {/* Nom */}
      <Text style={[styles.name, { maxWidth: size + 20 }]} numberOfLines={1}>
        {participant.name}
      </Text>

      {/* Badges d'offrandes */}
      {showBadges && !!participant.offerings?.length && (
        <View style={styles.badgesRow}>
          {participant.offerings.slice(-3).map((o, i) => (
            <Text key={i} style={styles.badge}>{o.emoji}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  circle: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  circleSelected: {
    borderColor: '#FFD700',
    borderWidth: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.45,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  meBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  meBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  name: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  badge: {
    fontSize: 13,
    marginHorizontal: 1,
  },
});
