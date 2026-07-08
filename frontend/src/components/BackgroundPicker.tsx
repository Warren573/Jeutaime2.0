import React, { useState } from 'react';
import {
  View,
  ScrollView,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  REFUGE_BACKGROUNDS,
  RefugeBackgroundType,
  getBackgroundLabel,
} from '../data/refugeBackgrounds';
import { BouncyButton } from './BouncyButton';

interface BackgroundPickerProps {
  currentBackground: RefugeBackgroundType | string;
  onSelectBackground: (background: RefugeBackgroundType) => Promise<void>;
  isLoading?: boolean;
}

export function BackgroundPicker({
  currentBackground,
  onSelectBackground,
  isLoading = false,
}: BackgroundPickerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelect = async (background: RefugeBackgroundType) => {
    setIsSubmitting(true);
    try {
      await onSelectBackground(background);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backgrounds = REFUGE_BACKGROUNDS ? Object.values(REFUGE_BACKGROUNDS) : [];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choisir l'ambiance</Text>
      <Text style={styles.subtitle}>
        Personnalisez le refuge de votre compagnon
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {backgrounds.map((background) => {
          const isSelected = currentBackground === background.id;

          return (
            <BouncyButton
              key={background.id}
              style={[
                styles.backgroundButton,
                {
                  backgroundColor: background.gradient[0],
                  borderColor: isSelected ? '#2D1F0E' : '#E0D5C8',
                  borderWidth: isSelected ? 3 : 2,
                },
              ]}
              onPress={() => handleSelect(background.id)}
              disabled={isSubmitting || isLoading}
            >
              <View style={styles.buttonContent}>
                <Text style={styles.emoji}>{background.emoji}</Text>
                <Text style={styles.label}>{background.label}</Text>
                {isSelected && (
                  <View style={styles.checkmark}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </View>
            </BouncyButton>
          );
        })}
      </ScrollView>

      {isSubmitting && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#8B6F47" />
          <Text style={styles.loadingText}>Sauvegarde...</Text>
        </View>
      )}

      <Text style={styles.hint}>
        L'ambiance sera appliquée au refuge de votre compagnon
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1F0E',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    color: '#8B6F47',
    marginBottom: 12,
  },
  scroll: {
    marginBottom: 12,
  },
  scrollContent: {
    gap: 10,
    paddingHorizontal: 0,
  },
  backgroundButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  buttonContent: {
    alignItems: 'center',
    gap: 4,
  },
  emoji: {
    fontSize: 32,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    color: '#2D1F0E',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute' as const,
    top: 4,
    right: 4,
    backgroundColor: '#2D1F0E',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmarkText: {
    color: '#FFF8E7',
    fontSize: 14,
    fontWeight: '700',
  },
  loading: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(240, 235, 225, 0.5)',
    borderRadius: 8,
    marginBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#8B6F47',
    fontWeight: '500',
  },
  hint: {
    fontSize: 11,
    color: '#A89A7E',
    textAlign: 'center',
  },
});
