import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";

const ANIMAL_EMOJIS: Record<string, string> = {
  Chat: "🐱",
  Chien: "🐕",
  Lapin: "🐰",
  Hamster: "🐹",
  Oiseau: "🦜",
};

const generateRandomAge = () => {
  const minDays = 21;
  const maxDays = 15 * 365;
  const randomDays = Math.floor(Math.random() * (maxDays - minDays + 1)) + minDays;

  if (randomDays < 365) {
    const weeks = Math.floor(randomDays / 7);
    return { display: `${weeks} semaines`, days: randomDays };
  } else {
    const years = Math.floor(randomDays / 365);
    return { display: `${years} ans`, days: randomDays };
  }
};

export function RefugeAdopteStep2() {
  const router = useRouter();
  const { selectedAnimal } = useStore();
  const [age, setAge] = useState<{ display: string; days: number } | null>(null);
  const [isRevealing, setIsRevealing] = useState(true);
  const scaleAnim = React.useRef(new Animated.Value(0)).current;
  const opacityAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      const randomAge = generateRandomAge();
      setAge(randomAge);
      setIsRevealing(false);

      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    return () => clearTimeout(timer);
  }, [scaleAnim, opacityAnim]);

  const handleConfirm = () => {
    if (age) {
      useStore.setState({ selectedAge: age.display });
      router.push("/refuge/adopte/step3");
    }
  };

  if (!selectedAnimal) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>No animal selected</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.step}>Étape 2/4</Text>

        <Text style={styles.title}>Le destin se dessine</Text>
        <Text style={styles.subtitle}>Découvrez l&apos;âge de votre créature</Text>

        <View style={styles.revealContainer}>
          <Text style={styles.animalEmoji}>{ANIMAL_EMOJIS[selectedAnimal]}</Text>
          <Text style={styles.selectedAnimal}>{selectedAnimal}</Text>

          {isRevealing && (
            <View style={styles.revealingState}>
              <Text style={styles.revealingDots}>●</Text>
            </View>
          )}

          {age && !isRevealing && (
            <Animated.View
              style={[
                styles.ageDisplay,
                {
                  transform: [{ scale: scaleAnim }],
                  opacity: opacityAnim,
                },
              ]}
            >
              <Text style={styles.ageLabel}>Âge du refuge</Text>
              <Text style={styles.ageValue}>{age.display}</Text>
            </Animated.View>
          )}
        </View>

        <Text style={styles.destinyText}>
          Cet âge n&apos;est pas un hasard. Le Refuge l&apos;a choisi pour vous.
        </Text>

        <TouchableOpacity
          style={[styles.ctaButton, isRevealing && styles.ctaButtonDisabled]}
          onPress={handleConfirm}
          disabled={isRevealing}
        >
          <Text style={styles.ctaButtonText}>C&apos;est celui-ci</Text>
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
  revealContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },
  animalEmoji: {
    fontSize: 100,
  },
  selectedAnimal: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  revealingState: {
    height: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  revealingDots: {
    fontSize: 32,
    color: "#FF9800",
    fontWeight: "700",
  },
  ageDisplay: {
    alignItems: "center",
    gap: 8,
  },
  ageLabel: {
    fontSize: 12,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 1,
  },
  ageValue: {
    fontSize: 48,
    fontWeight: "900",
    color: "#FF9800",
  },
  destinyText: {
    fontSize: 14,
    color: "#8B6F47",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 16,
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
