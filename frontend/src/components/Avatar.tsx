import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface AvatarProps {
  name: string;
  size?: number;
  online?: boolean;
  gender?: 'M' | 'F';
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

// Obtient les initiales
const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

export default function Avatar({ name, size = 50, online = true, gender }: AvatarProps) {
  const backgroundColor = getColorFromName(name);
  const initials = getInitials(name);
  const fontSize = size * 0.4;

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <View
        style={[
          styles.avatar,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor,
          },
        ]}
      >
        <Text style={[styles.initials, { fontSize }]}>{initials}</Text>
      </View>
      {online && (
        <View
          style={[
            styles.onlineIndicator,
            {
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              borderWidth: size * 0.04,
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
    bottom: 0,
    right: 0,
    backgroundColor: '#4CAF50',
    borderColor: '#FFF',
  },
});
