import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

const ANIMALS = ["Chat", "Chien", "Lapin", "Hamster", "Oiseau"];
const ANIMAL_EMOJIS: Record<string, string> = {
  Chat: "🐱",
  Chien: "🐕",
  Lapin: "🐰",
  Hamster: "🐹",
  Oiseau: "🦜",
};

export function RefugeAdopteStep1() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleSwipe = (direction: "left" | "right") => {
    if (direction === "right" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (direction === "left" && currentIndex < ANIMALS.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSelect = () => {
    // Store selected animal and go to step2
    useStore.setState({ selectedAnimal: ANIMALS[currentIndex] });
    router.push("/refuge/adopte/step2");
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>Étape 1/4</Text>

        <Text style={styles.title}>Choisissez votre masque</Text>
        <Text style={styles.subtitle}>Quel animal voulez-vous incarner ?</Text>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <View style={styles.animalCard}>
            <Text style={styles.animalEmoji}>{ANIMAL_EMOJIS[ANIMALS[currentIndex]]}</Text>
            <Text style={styles.animalName}>{ANIMALS[currentIndex]}</Text>
          </View>

          {/* Navigation dots */}
          <View style={styles.dotsContainer}>
            {ANIMALS.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.dot,
                  index === currentIndex ? styles.dotActive : styles.dotInactive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Swipe hint */}
        <Text style={styles.hint}>Glissez pour découvrir d&apos;autres créatures</Text>

        {/* Navigation buttons */}
        <View style={styles.navButtons}>
          <TouchableOpacity
            style={[styles.navButton, !currentIndex && styles.navButtonDisabled]}
            onPress={() => handleSwipe("right")}
            disabled={currentIndex === 0}
          >
            <Text style={styles.navButtonText}>← Précédent</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.navButton,
              currentIndex === ANIMALS.length - 1 && styles.navButtonDisabled,
            ]}
            onPress={() => handleSwipe("left")}
            disabled={currentIndex === ANIMALS.length - 1}
          >
            <Text style={styles.navButtonText}>Suivant →</Text>
          </TouchableOpacity>
        </View>

        {/* CTA */}
        <TouchableOpacity style={styles.ctaButton} onPress={handleSelect}>
          <Text style={styles.ctaButtonText}>Je serai ce {ANIMALS[currentIndex].toLowerCase()}</Text>
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
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "space-between",
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
  carouselContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 24,
  },
  animalCard: {
    width: 200,
    height: 240,
    backgroundColor: "white",
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  animalEmoji: {
    fontSize: 80,
    marginBottom: 12,
  },
  animalName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotActive: {
    backgroundColor: "#FF9800",
    width: 24,
  },
  dotInactive: {
    backgroundColor: "#DDD",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
  },
  navButtons: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  navButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F0F0F0",
    borderRadius: 8,
    alignItems: "center",
  },
  navButtonDisabled: {
    opacity: 0.4,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1F0E",
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
  ctaButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
  },
});
