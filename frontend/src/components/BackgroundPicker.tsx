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
} from '../data/refugeBackgrounds';

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

  if (!REFUGE_BACKGROUNDS) {
    return (
      <View style={styles.container}>
        <Text style={styles.error}>Erreur: Données manquantes</Text>
      </View>
    );
  }

  const handleSelect = async (background: RefugeBackgroundType) => {
    setIsSubmitting(true);
    try {
      await onSelectBackground(background);
    } finally {
      setIsSubmitting(false);
    }
  };

  const backgrounds = Object.values(REFUGE_BACKGROUNDS);

  return (
    <View style={styles.container}>
      <View style={styles.headingBlock}>
        <Text style={styles.eyebrow}>AMBIANCE DU REFUGE</Text>
        <Text style={styles.title}>Choisir un décor</Text>
        <Text style={styles.subtitle}>
          Une ambiance douce pour personnaliser l'espace de votre compagnon.
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
      >
        {backgrounds.map((background) => {
          const isSelected = currentBackground === background.id;

          return (
            <Pressable
              key={background.id}
              onPress={() => handleSelect(background.id)}
              disabled={isSubmitting || isLoading}
              style={[
                styles.backgroundButton,
                {
                  backgroundColor: background.gradient[0],
                  borderColor: isSelected ? '#8B2E3C' : 'rgba(122, 92, 58, 0.28)',
                  borderWidth: isSelected ? 2 : 1,
                  opacity: isSubmitting || isLoading ? 0.6 : 1,
                },
                isSelected && styles.backgroundButtonSelected,
              ]}
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
            </Pressable>
          );
        })}
      </ScrollView>

      {isSubmitting && (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color="#8B2E3C" />
          <Text style={styles.loadingText}>Sauvegarde de l'ambiance…</Text>
        </View>
      )}

      <Text style={styles.hint}>
        Le décor est appliqué immédiatement au refuge.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 18,
    paddingBottom: 20,
    paddingHorizontal: 18,
    backgroundColor: '#FEFAF0',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  headingBlock: {
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.8,
    color: '#B87333',
    marginBottom: 5,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    color: '#2C1A0E',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#7A5C3A',
  },
  scroll: {
    marginBottom: 14,
  },
  scrollContent: {
    gap: 12,
    paddingRight: 4,
  },
  backgroundButton: {
    width: 108,
    height: 108,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 7,
    elevation: 3,
  },
  backgroundButtonSelected: {
    shadowColor: '#8B2E3C',
    shadowOpacity: 0.22,
    elevation: 5,
  },
  buttonContent: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    width: '100%',
    height: '100%',
    paddingHorizontal: 8,
  },
  emoji: {
    fontSize: 34,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#2C1A0E',
    textAlign: 'center',
  },
  checkmark: {
    position: 'absolute' as const,
    top: 8,
    right: 8,
    backgroundColor: '#8B2E3C',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFF8E7',
  },
  checkmarkText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loading: {
    flexDirection: 'row' as const,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F5EFDA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8D9C6',
    marginBottom: 10,
  },
  loadingText: {
    fontSize: 12,
    color: '#7A5C3A',
    fontWeight: '600',
  },
  hint: {
    fontSize: 11,
    color: '#9A7040',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  error: {
    fontSize: 14,
    color: '#9C2F45',
    textAlign: 'center',
    fontWeight: '600',
  },
});
