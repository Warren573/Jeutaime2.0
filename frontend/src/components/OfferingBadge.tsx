import React from 'react';
import { View, Image, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SalonOfferingDTO } from '../api/offerings';
import { getSalonOfferingStage1Asset } from '../config/salonOfferingAssets';

interface OfferingBadgeProps {
  offering: SalonOfferingDTO;
  size?: number;
}

/**
 * Affiche un badge d'offrande avec PNG si disponible, fallback emoji + stage
 * PNG nommage: /offerings/{offeringId}_stage{currentStage}.png
 */
export function OfferingBadge({ offering, size = 28 }: OfferingBadgeProps) {
  const fileId = offering.offeringId === 'off_the' ? 'off_thé' : offering.offeringId;
  const pngPath = `/offerings/${fileId}_stage${offering.currentStage}.png`;
  const stage1Asset = getSalonOfferingStage1Asset(offering.offeringId);
  const [fallback, setFallback] = React.useState(false);

  const handleImageError = () => {
    // Sur natif, une URI relative peut échouer : on retombe sur le stage1 embarqué,
    // jamais sur un emoji.
    setFallback(true);
  };

  const handlePress = () => {
    // Déterminer le message basé sur offeringId
    let title = 'Consommé!';
    let body = 'Vous avez consommé cette offrande.';

    if (offering.offeringId === 'off_biere') {
      title = 'Glouglou 🍻';
      body = 'Vous avez savouré cette boisson.';
    } else if (offering.offeringId === 'off_fraises' || offering.offeringId === 'off_bonbons') {
      title = 'Miam 😋';
      body = 'Vous avez dégusté cette nourriture.';
    }

    Alert.alert(title, body);
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
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
      ) : stage1Asset ? (
        <Image
          source={stage1Asset}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
          }}
          resizeMode="contain"
        />
      ) : null}
    </TouchableOpacity>
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
