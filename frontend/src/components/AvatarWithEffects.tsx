import React from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';

interface AvatarWithEffectsProps {
  name: string;
  size?: number;
  online?: boolean;
  transformation?: string;
  effects?: string[];
  offerings?: { emoji: string; from: string }[];
}

// Génère une couleur basée sur le nom
const getColorFromName = (name: string): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4',
    '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F',
    '#BB8FCE', '#85C1E9', '#F8B500', '#00CED1'
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
};

const getInitials = (name: string): string => {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
};

export default function AvatarWithEffects({
  name,
  size = 60,
  online = true,
  transformation,
  effects = [],
  offerings = [],
}: AvatarWithEffectsProps) {
  const backgroundColor = getColorFromName(name);
  const initials = getInitials(name);
  const fontSize = size * 0.35;

  // Si transformation active, afficher l'emoji de transformation
  const displayContent = transformation ? (
    <Text style={{ fontSize: size * 0.5 }}>{transformation}</Text>
  ) : (
    <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
  );

  return (
    <View style={[styles.container, { width: size + 20, height: size + 40 }]}>
      {/* Effets visuels autour de l'avatar */}
      {effects.includes('✨') && (
        <View style={[styles.effectRing, { width: size + 16, height: size + 16 }]}>
          <Text style={styles.effectEmoji}>✨</Text>
        </View>
      )}
      {effects.includes('🔥') && (
        <Text style={[styles.topEffect, { top: -10 }]}>🔥</Text>
      )}
      {effects.includes('🌧️') && (
        <Text style={[styles.topEffect, { top: -15 }]}>🌧️</Text>
      )}
      
      {/* Avatar principal */}
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: transformation ? '#E8E8E8' : backgroundColor,
          },
        ]}
      >
        {displayContent}
      </View>

      {/* Indicateur en ligne */}
      {online && !transformation && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.22,
              height: size * 0.22,
              borderRadius: size * 0.11,
            },
          ]}
        />
      )}

      {/* Nom */}
      <Text style={styles.name} numberOfLines={1}>{name}</Text>

      {/* Mini grille d'offrandes (2x3) sous le nom */}
      {offerings.length > 0 && (
        <View style={styles.offeringsGrid}>
          {offerings.slice(0, 6).map((off, idx) => (
            <Text key={idx} style={styles.offeringEmoji}>{off.emoji}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    position: 'relative',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  initials: {
    color: '#FFF',
    fontWeight: '700',
  },
  onlineIndicator: {
    position: 'absolute',
    top: 0,
    right: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  name: {
    marginTop: 4,
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
    maxWidth: 70,
  },
  effectRing: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -8,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: '#FFD700',
    opacity: 0.7,
  },
  effectEmoji: {
    position: 'absolute',
    top: -10,
    right: -5,
    fontSize: 16,
  },
  topEffect: {
    position: 'absolute',
    fontSize: 20,
    zIndex: 10,
  },
  offeringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 4,
    width: 54,
  },
  offeringEmoji: {
    fontSize: 12,
    margin: 1,
  },
});
