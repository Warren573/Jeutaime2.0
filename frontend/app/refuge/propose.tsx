import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { refugeApi } from '../../src/api/refuge-api';
import { BouncyButton } from '../../src/components/BouncyButton';
import { REFUGE_ANIMALS, ANIMAL_LABELS } from '../../src/data/refugeAnimals';
import { AnimalIllustration } from '../../src/components/AnimalIllustration';

// Bordeaux de l'app (Retour, sélection, bouton), comme ailleurs.
const BURGUNDY = '#8B2E3C';
const ANIMALS = REFUGE_ANIMALS.map((value) => ({ value, label: ANIMAL_LABELS[value] }));
const PREFERENCES = [
  { value: 'HOMME_FEMME', label: 'Tous (Homme et Femme)' },
  { value: 'HOMME', label: 'Homme uniquement' },
  { value: 'FEMME', label: 'Femme uniquement' },
];

export default function ProposePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedPreference, setSelectedPreference] = useState<string>('HOMME_FEMME');
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if user has an active session - if so, redirect
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeSession = await refugeApi.getActive();
        if (activeSession?.id) {
          router.replace('/refuge');
          return;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setCheckingSession(false);
      }
    };

    checkActiveSession();
  }, [router]);

  const handlePropose = async () => {
    if (!selectedAnimal) {
      Alert.alert('Erreur', 'Veuillez choisir un type d\'animal');
      return;
    }

    setLoading(true);
    try {
      const result = await refugeApi.propose({
        animalType: selectedAnimal,
        acceptedSexe: selectedPreference,
      });

      if (result && result.id) {
        router.replace('/refuge');
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de la proposition du compagnon');
      setLoading(false);
    }
  };

  // Show loading while checking for active session
  if (checkingSession) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  // Show error if session check failed
  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <Text style={styles.errorTitle}>Erreur de chargement</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.errorButton}>
            <Text style={styles.errorButtonText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Deux étapes, chacune sur une page pleine (maquette validée, option 2) :
  // 1. choisir l'animal (les 12 cartes remplissent l'écran) ;
  // 2. l'animal choisi en grand + préférence + « Proposer ce compagnon ».
  // Même logique qu'avant : selectedAnimal, selectedPreference, handlePropose.
  const rows: typeof ANIMALS[] = [];
  for (let i = 0; i < ANIMALS.length; i += 3) rows.push(ANIMALS.slice(i, i + 3));
  const chosen = step >= 2 && selectedAnimal ? ANIMALS.find((a) => a.value === selectedAnimal) : undefined;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentFill}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎭 Incarner un compagnon</Text>
        </View>

        {!chosen ? (
          /* Étape 1 : animal */
          <View style={styles.stepFill}>
            <Text style={styles.stepTitle}>Quel compagnon proposez-vous?</Text>
            <View style={styles.gridFill}>
              {rows.map((row, r) => (
                <View key={r} style={styles.gridRow}>
                  {row.map((animal) => (
                    <TouchableOpacity
                      key={animal.value}
                      style={[styles.choice, selectedAnimal === animal.value && styles.choiceSelected]}
                      onPress={() => {
                        setSelectedAnimal(animal.value);
                        setStep(2);
                      }}
                    >
                      <AnimalIllustration animal={animal.value} state="assis" size={72} />
                      <Text style={[styles.choiceText, selectedAnimal === animal.value && styles.choiceSelectedText]}>
                        {animal.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>
          </View>
        ) : (
          /* Étape 2 : préférence */
          <View style={styles.stepFill}>
            <View style={styles.chosenCard}>
              <AnimalIllustration animal={chosen.value} state="assis" size={150} />
              <Text style={styles.chosenLabel}>{chosen.label}</Text>
            </View>
            <TouchableOpacity onPress={() => setStep(1)} accessibilityRole="button" disabled={loading}>
              <Text style={styles.changeAnimal}>Changer d&apos;animal</Text>
            </TouchableOpacity>

            <Text style={styles.stepTitle}>Quelle préférence pour l&apos;Adoptant?</Text>
            <View style={styles.preferencesContainer}>
              {PREFERENCES.map((pref) => (
                <TouchableOpacity
                  key={pref.value}
                  style={[
                    styles.preferenceButton,
                    selectedPreference === pref.value && styles.preferenceSelected,
                  ]}
                  onPress={() => setSelectedPreference(pref.value)}
                >
                  <Text
                    style={[
                      styles.preferenceText,
                      selectedPreference === pref.value && styles.preferenceTextSelected,
                    ]}
                  >
                    {pref.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Submit Button */}
            <BouncyButton
              style={styles.submitButton}
              onPress={handlePropose}
              disabled={loading}
            >
              <Text style={styles.submitButtonText}>
                {loading ? 'Chargement...' : 'Proposer ce compagnon'}
              </Text>
            </BouncyButton>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#d32f2f',
    marginBottom: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorButton: {
    paddingHorizontal: 30,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  errorButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  // Page pleine : le contenu occupe toute la hauteur (redevient défilable si l'écran est trop petit).
  contentFill: { flexGrow: 1 },
  stepFill: { flex: 1 },
  gridFill: { flex: 1, gap: 10, marginBottom: 8, minHeight: 4 * 108 + 3 * 10 },
  gridRow: { flex: 1, flexDirection: 'row', gap: 10 },
  chosenCard: {
    flex: 1,
    minHeight: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: BURGUNDY,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chosenLabel: { fontSize: 20, fontWeight: '700', color: '#2B2B2B', marginTop: 6 },
  changeAnimal: { fontSize: 14, fontWeight: '600', color: BURGUNDY, textAlign: 'center', paddingVertical: 10 },
  header: {
    marginVertical: 20,
  },
  backButton: {
    fontSize: 16,
    color: BURGUNDY,
    marginBottom: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2B2B',
  },
  step: {
    marginBottom: 28,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  choice: {
    flex: 1,
    minWidth: '30%',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0D5C8',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 108,
  },
  choiceSelected: {
    backgroundColor: '#FBF0F0',
    borderColor: BURGUNDY,
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2B2B2B',
    marginTop: 4,
    textAlign: 'center',
  },
  choiceSelectedText: {
    color: BURGUNDY,
  },
  preferencesContainer: {
    gap: 12,
    marginBottom: 24,
  },
  preferenceButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0D5C8',
  },
  preferenceSelected: {
    backgroundColor: BURGUNDY,
    borderColor: BURGUNDY,
  },
  preferenceText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2B2B2B',
  },
  preferenceTextSelected: {
    color: '#FFFFFF',
  },
  submitButton: {
    paddingVertical: 16,
    backgroundColor: BURGUNDY,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
