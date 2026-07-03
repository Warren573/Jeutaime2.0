import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ImageBackground } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export function RefugeHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ImageBackground
        source={require("../assets/refuge-bg.png")}
        style={styles.background}
        imageStyle={{ opacity: 0.1 }}
      >
        <View style={styles.content}>
          <View style={styles.header}>
            <Text style={styles.emoji}>🏠</Text>
            <Text style={styles.title}>Le Refuge</Text>
            <Text style={styles.subtitle}>Une semaine. Une créature. Une aventure.</Text>
          </View>

          <View style={styles.description}>
            <Text style={styles.descriptionText}>
              Bienvenue au Refuge. Un endroit où les créatures attendent une maison, et où les cœurs cherchent une compagnie.
            </Text>
          </View>

          <View style={styles.choices}>
            <TouchableOpacity
              style={[styles.button, styles.buttonAccueillir]}
              onPress={() => router.push("/refuge/adopte/step1")}
            >
              <Text style={styles.buttonIcon}>🎭</Text>
              <Text style={styles.buttonTitle}>Accueillir une créature</Text>
              <Text style={styles.buttonDesc}>Proposez votre maison pendant 7 jours</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.buttonChercher]}
              onPress={() => router.push("/refuge/adoptant")}
            >
              <Text style={styles.buttonIcon}>🔍</Text>
              <Text style={styles.buttonTitle}>Adopter une créature</Text>
              <Text style={styles.buttonDesc}>Découvrez une créature et adoptez-la</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  background: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  emoji: {
    fontSize: 64,
    marginBottom: 12,
  },
  title: {
    fontSize: 36,
    fontWeight: "900",
    color: "#2D1F0E",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#8B6F47",
    fontStyle: "italic",
    textAlign: "center",
  },
  description: {
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 40,
  },
  descriptionText: {
    fontSize: 14,
    color: "#2D1F0E",
    lineHeight: 20,
    textAlign: "center",
  },
  choices: {
    gap: 16,
  },
  button: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderRadius: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonAccueillir: {
    backgroundColor: "#FFE5B4",
  },
  buttonChercher: {
    backgroundColor: "#B4D7FF",
  },
  buttonIcon: {
    fontSize: 40,
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  buttonDesc: {
    fontSize: 12,
    color: "#8B6F47",
    textAlign: "center",
  },
});
