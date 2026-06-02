import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { SalonOfferingDTO } from '../api/offerings';

interface OfferingBadgeProps {
  offering: SalonOfferingDTO;
  size?: number;
}

/**
 * Affiche un badge d'offrande avec PNG si disponible, fallback emoji + stage
 * PNG nommage: /offerings/{offeringId}_stage{currentStage}.png
 */
export function OfferingBadge({ offering, size = 28 }: OfferingBadgeProps) {
  const pngPath = `/offerings/${offering.offeringId}_stage${offering.currentStage}.png`;

  const handleImageError = () => {
    // Si PNG manquant, affiche juste l'emoji
    setFallback(true);
  };

  const [fallback, setFallback] = React.useState(false);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
    >
      {!fallback ? (
        <Image
          source={{ uri: pngPath }}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          onError={handleImageError}
        />
      ) : null}

      {fallback || !pngPath ? (
        <Text style={[styles.emoji, { fontSize: size * 0.6 }]}>
          {offering.emoji}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(212,168,122,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(212,168,122,0.3)',
  },
  emoji: {
    fontWeight: '600',
  },
});
