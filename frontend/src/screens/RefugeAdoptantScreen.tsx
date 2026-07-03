import React, { useState, useRef, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, PanResponder, Animated, Dimensions } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const ANIMALS_AVAILABLE = [
  { id: 1, name: "Chat", emoji: "🐱", age: "8 semaines" },
  { id: 2, name: "Chien", emoji: "🐕", age: "6 mois" },
  { id: 3, name: "Lapin", emoji: "🐰", age: "4 semaines" },
  { id: 4, name: "Hamster", emoji: "🐹", age: "12 semaines" },
  { id: 5, name: "Oiseau", emoji: "🦜", age: "1 an" },
];

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export function RefugeAdoptantScreen() {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const pan = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan.x }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (e, { dx }) => {
        if (dx > 50 && currentIndex > 0) {
          setCurrentIndex(currentIndex - 1);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        } else if (dx < -50 && currentIndex < ANIMALS_AVAILABLE.length - 1) {
          setCurrentIndex(currentIndex + 1);
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        } else {
          Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

  const handleAdopt = () => {
    const animal = ANIMALS_AVAILABLE[currentIndex];
    // TODO: Call API to adopt animal
    // For now, go back to refuge home
    router.replace("/refuge");
  };

  const animal = ANIMALS_AVAILABLE[currentIndex];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Une créature vous attend</Text>
        <Text style={styles.subtitle}>
          {currentIndex + 1} / {ANIMALS_AVAILABLE.length}
        </Text>
      </View>

      <Animated.View
        style={[
          styles.cardContainer,
          { transform: [{ translateX: pan.x }] },
        ]}
        {...panResponder.panHandlers}
      >
        <View style={styles.card}>
          <Text style={styles.emoji}>{animal.emoji}</Text>
          <Text style={styles.animalName}>{animal.name}</Text>
          <Text style={styles.animalAge}>{animal.age}</Text>
        </View>
      </Animated.View>

      <Text style={styles.hint}>Glissez pour découvrir d&apos;autres créatures</Text>

      <View style={styles.dotsContainer}>
        {ANIMALS_AVAILABLE.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.dotActive : styles.dotInactive,
            ]}
          />
        ))}
      </View>

      <TouchableOpacity style={styles.adoptButton} onPress={handleAdopt}>
        <Text style={styles.adoptButtonText}>Adopter ce {animal.name.toLowerCase()}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
    padding: 20,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "900",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#8B6F47",
  },
  cardContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    width: 220,
    height: 280,
    backgroundColor: "white",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  emoji: {
    fontSize: 100,
    marginBottom: 16,
  },
  animalName: {
    fontSize: 24,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  animalAge: {
    fontSize: 14,
    color: "#FF9800",
    fontWeight: "600",
  },
  hint: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    fontStyle: "italic",
    marginBottom: 24,
  },
  dotsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginBottom: 24,
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
  adoptButton: {
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
  adoptButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
  },
});
