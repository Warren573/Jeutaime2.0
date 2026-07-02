import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

const ANIMAL_PREFERENCES = ["Chat", "Chien", "Lapin", "Hamster", "Oiseau"];

const ANIMAL_EMOJIS: Record<string, string> = {
  Chat: "🐱",
  Chien: "🐕",
  Lapin: "🐰",
  Hamster: "🐹",
  Oiseau: "🦜",
};

export function RefugeAdoptantStep1() {
  const router = useRouter();
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);

  const handleToggleAnimal = (animal: string) => {
    if (selectedAnimals.includes(animal)) {
      setSelectedAnimals(selectedAnimals.filter(a => a !== animal));
    } else {
      setSelectedAnimals([...selectedAnimals, animal]);
    }
  };

  const handleContinue = () => {
    if (selectedAnimals.length > 0) {
      useStore.setState({ adoptantPreferences: selectedAnimals });
      router.push("/refuge/adoptant/step2");
    }
  };

  const isValid = selectedAnimals.length > 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>Étape 1/4</Text>

        <Text style={styles.title}>Votre refuge idéal</Text>
        <Text style={styles.subtitle}>
          Quelles créatures vous attirent le plus ?
        </Text>

        <Text style={styles.hint}>
          Sélectionnez au moins une créature qui vous intéresse.
        </Text>

        {/* Animal grid */}
        <View style={styles.grid}>
          {ANIMAL_PREFERENCES.map(animal => {
            const isSelected = selectedAnimals.includes(animal);
            return (
              <TouchableOpacity
                key={animal}
                style={[
                  styles.animalCard,
                  isSelected && styles.animalCardSelected,
                ]}
                onPress={() => handleToggleAnimal(animal)}
              >
                <Text style={styles.emoji}>{ANIMAL_EMOJIS[animal]}</Text>
                <Text style={styles.animalLabel}>{animal}</Text>
                {isSelected && <Text style={styles.checkmark}>✓</Text>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Info section */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoText}>
            Le Refuge vous met en contact avec quelqu&apos;un qui accueille une créature pendant 7 jours. Vous pourrez correspondre, partager des moments, et peut-être trouver votre compagnie.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, !isValid && styles.ctaButtonDisabled]}
          onPress={handleContinue}
          disabled={!isValid}
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
    marginBottom: 8,
  },
  hint: {
    fontSize: 13,
    color: "#999",
    fontStyle: "italic",
    marginBottom: 32,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 32,
  },
  animalCard: {
    width: "30%",
    aspectRatio: 1,
    backgroundColor: "white",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#EEE",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  animalCardSelected: {
    borderColor: "#FF9800",
    backgroundColor: "#FFF9F0",
    shadowOpacity: 0.1,
  },
  emoji: {
    fontSize: 40,
    marginBottom: 8,
  },
  animalLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2D1F0E",
    textAlign: "center",
  },
  checkmark: {
    position: "absolute",
    top: 8,
    right: 8,
    fontSize: 18,
    color: "#FF9800",
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "rgba(255, 184, 180, 0.1)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#B4D7FF",
    padding: 16,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#2D1F0E",
    lineHeight: 20,
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
    backgroundColor: "#B4D7FF",
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
});
