import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { refugeApi } from '../../src/api/refuge-api';
import { BouncyButton } from '../../src/components/BouncyButton';

const ANIMALS = ['Chat', 'Chien', 'Lapin', 'Hamster', 'Perroquet'];
const CATEGORIES = ['Chaton', 'Chiot', 'Lapin nain', 'Hamster syrien', 'Perruche'];
const SEXES = ['Mâle', 'Femelle'];
const PREFERENCES = [
  { value: 'HOMME_FEMME', label: 'Tous (Homme et Femme)' },
  { value: 'HOMME', label: 'Homme uniquement' },
  { value: 'FEMME', label: 'Femme uniquement' },
];

export default function ProposePage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [selectedAnimal, setSelectedAnimal] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSex, setSelectedSex] = useState<string | null>(null);
  const [selectedPreference, setSelectedPreference] = useState<string>('HOMME_FEMME');
  const [loading, setLoading] = useState(false);

  const handlePropose = async () => {
    if (!selectedAnimal || !selectedCategory || !selectedSex) {
      Alert.alert('Erreur', 'Veuillez compléter tous les champs');
      return;
    }

    setLoading(true);
    try {
      const result = await refugeApi.propose({
        animalType: selectedAnimal,
        animalCategory: selectedCategory,
        animalSexe: selectedSex,
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
            <Text style={styles.stepTitle}>1. Quel compagnon proposez-vous?</Text>
            <View style={styles.grid}>
              {ANIMALS.map((animal) => (
                <TouchableOpacity
                  key={animal}
                  style={[
                    styles.choice,
                    selectedAnimal === animal && styles.choiceSelected,
                  ]}
                  onPress={() => {
                    setSelectedAnimal(animal);
                    setStep(2);
                  }}
                >
                  <Text style={styles.choiceText}>{animal}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 2: Category */}
        {step >= 2 && selectedAnimal && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>2. Quelle catégorie?</Text>
            <View style={styles.grid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.choice,
                    selectedCategory === cat && styles.choiceSelected,
                  ]}
                  onPress={() => {
                    setSelectedCategory(cat);
                    setStep(3);
                  }}
                >
                  <Text style={styles.choiceText}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 3: Sex */}
        {step >= 3 && selectedCategory && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>3. Sexe du compagnon?</Text>
            <View style={styles.grid}>
              {SEXES.map((sex) => (
                <TouchableOpacity
                  key={sex}
                  style={[
                    styles.choice,
                    selectedSex === sex && styles.choiceSelected,
                  ]}
                  onPress={() => {
                    setSelectedSex(sex);
                    setStep(4);
                  }}
                >
                  <Text style={styles.choiceText}>{sex}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Step 4: Preference */}
        {step >= 4 && selectedSex && (
          <View style={styles.step}>
            <Text style={styles.stepTitle}>4. Quelle préférence pour l&apos;Adoptant?</Text>
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
