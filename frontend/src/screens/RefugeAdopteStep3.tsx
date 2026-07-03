import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

const HOUSING_OPTIONS = [
  { id: "apartment", label: "Appartement", emoji: "🏢" },
  { id: "house", label: "Maison", emoji: "🏠" },
  { id: "farm", label: "Ferme", emoji: "🌾" },
];

const ANIMAL_EMOJIS: Record<string, string> = {
  Chat: "🐱",
  Chien: "🐕",
  Lapin: "🐰",
  Hamster: "🐹",
  Oiseau: "🦜",
};

export function RefugeAdopteStep3() {
  const router = useRouter();
  const { selectedAnimal, selectedAge } = useStore();
  const [selectedHousing, setSelectedHousing] = useState<string | null>(null);
  const [notes, setNotes] = useState("");

  const handleContinue = () => {
    if (selectedHousing) {
      useStore.setState({
        refugeHousingType: selectedHousing,
        refugeNotes: notes,
      });
      router.push("/refuge/adopte/step4");
    }
  };

  if (!selectedAnimal || !selectedAge) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Missing animal or age data</Text>
      </SafeAreaView>
    );
  }

  const isFormValid = selectedHousing !== null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>Étape 3/4</Text>

        <Text style={styles.title}>Préparez votre maison</Text>
        <Text style={styles.subtitle}>
          Où votre créature vivra-t-elle pendant 7 jours ?
        </Text>

        {/* Animal recap */}
        <View style={styles.recapCard}>
          <Text style={styles.recapEmoji}>{ANIMAL_EMOJIS[selectedAnimal]}</Text>
          <View style={styles.recapText}>
            <Text style={styles.recapAnimal}>{selectedAnimal}</Text>
            <Text style={styles.recapAge}>{selectedAge}</Text>
          </View>
        </View>

        {/* Housing options */}
        <View style={styles.optionsContainer}>
          <Text style={styles.optionsLabel}>Type de logement</Text>
          {HOUSING_OPTIONS.map(option => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionButton,
                selectedHousing === option.id && styles.optionButtonSelected,
              ]}
              onPress={() => setSelectedHousing(option.id)}
            >
              <Text style={styles.optionEmoji}>{option.emoji}</Text>
              <Text style={styles.optionLabel}>{option.label}</Text>
              {selectedHousing === option.id && (
                <Text style={styles.checkmark}>✓</Text>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Notes section */}
        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Quelques mots (optionnel)</Text>
          <Text style={styles.notesHint}>
            Parlez-nous de votre espace, de vos habitudes...
          </Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Écrivez ici..."
            placeholderTextColor="#CCC"
            value={notes}
            onChangeText={setNotes}
            multiline
            maxLength={200}
          />
          <Text style={styles.charCount}>{notes.length}/200</Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, !isFormValid && styles.ctaButtonDisabled]}
          onPress={handleContinue}
          disabled={!isFormValid}
        >
          <Text style={styles.ctaButtonText}>Continuer</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 120,
  },
  step: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B6F47",
    marginBottom: 32,
  },
  recapCard: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 32,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  recapEmoji: {
    fontSize: 48,
  },
  recapText: {
    flex: 1,
  },
  recapAnimal: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  recapAge: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "600",
  },
  optionsContainer: {
    marginBottom: 32,
  },
  optionsLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    gap: 12,
  },
  optionButtonSelected: {
    borderColor: "#FF9800",
    backgroundColor: "#FFF9F0",
  },
  optionEmoji: {
    fontSize: 28,
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#2D1F0E",
    flex: 1,
  },
  checkmark: {
    fontSize: 20,
    color: "#FF9800",
    fontWeight: "700",
  },
  notesContainer: {
    marginBottom: 32,
  },
  notesLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 8,
    textTransform: "uppercase",
  },
  notesHint: {
    fontSize: 13,
    color: "#8B6F47",
    marginBottom: 12,
  },
  notesInput: {
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEE",
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 14,
    color: "#2D1F0E",
    textAlignVertical: "top",
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: "#CCC",
    marginTop: 8,
    textAlign: "right",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: "#FFF8E7",
    borderTopWidth: 1,
    borderTopColor: "#EEE",
  },
  ctaButton: {
    backgroundColor: "#FFE5B4",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ctaButtonDisabled: {
    opacity: 0.5,
  },
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
  },
});
