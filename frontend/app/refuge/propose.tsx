import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { refugeApi } from '../../src/api/refuge-api';
import { BouncyButton } from '../../src/components/BouncyButton';

const ANIMALS = [
  { value: 'CHAT', label: 'Chat' },
  { value: 'CHIEN', label: 'Chien' },
  { value: 'LAPIN', label: 'Lapin' },
  { value: 'HAMSTER', label: 'Hamster' },
  { value: 'RENARD', label: 'Renard' },
  { value: 'PINGOUIN', label: 'Pingouin' },
  { value: 'IGUANE', label: 'Iguane' },
  { value: 'PANDA', label: 'Panda' },
  { value: 'LICORNE', label: 'Licorne' },
  { value: 'DRAGON', label: 'Dragon' },
];
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

  // Check if user has an active session - if so, redirect
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeSession = await refugeApi.getActive();
        if (activeSession?.id) {
          // User has an active session, redirect to it
          router.replace(`/refuge?sessionId=${activeSession.id}`);
          return;
        }
      } catch (error) {
        console.error('Error checking active session:', error);
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
        // Navigate to the session with sessionId
        router.replace(`/refuge?sessionId=${result.id}`);
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backButton}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>🎭 Incarner un compagnon</Text>
        </View>

        {/* Step 1: Animal */}
        {step >= 1 && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>Quel compagnon proposez-vous?</Text>
            <View style={styles.grid}>
              {ANIMALS.map((animal) => (
                <TouchableOpacity
                  key={animal.value}
                  style={[
                    styles.choice,
                    selectedAnimal === animal.value && styles.choiceSelected,
                  ]}
                  onPress={() => {
                    setSelectedAnimal(animal.value);
                    setStep(2);
                  }}
                >
                  <Text style={[
                    styles.choiceText,
                    selectedAnimal === animal.value && styles.choiceSelectedText,
                  ]}>
                    {animal.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Preference */}
        {step >= 2 && selectedAnimal && (
          <View style={styles.step}>
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
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    marginVertical: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
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
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E0D5C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceSelected: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  choiceText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2B2B2B',
  },
  choiceSelectedText: {
    color: '#FFFFFF',
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
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
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
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 40,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
