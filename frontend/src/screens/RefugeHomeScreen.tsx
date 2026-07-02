import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

export function RefugeHomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Refuge 🏠</Text>
        <Text style={styles.subtitle}>Partagez une semaine avec quelqu&apos;un</Text>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.button, styles.buttonAdopte]}
            onPress={() => router.push("/refuge/adopte")}
          >
            <Text style={styles.buttonEmoji}>🎭</Text>
            <Text style={styles.buttonTitle}>Être adopté</Text>
            <Text style={styles.buttonDesc}>
              Proposez votre refuge et cachez vos actions
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonAdoptant]}
            onPress={() => router.push("/refuge/adoptant")}
          >
            <Text style={styles.buttonEmoji}>🔍</Text>
            <Text style={styles.buttonTitle}>Adopter</Text>
            <Text style={styles.buttonDesc}>
              Trouvez un refuge et devinez les actions
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>Comment ça marche ?</Text>
          <Text style={styles.infoText}>
            • L&apos;Adopté propose un refuge et choisit 2 actions par jour{"\n"}
            • L&apos;Adoptant tente de deviner les actions{"\n"}
            • La semaine se déroule sur 7 jours
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 8,
    color: "#333",
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 40,
    color: "#666",
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 40,
  },
  button: {
    padding: 24,
    borderRadius: 12,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonAdopte: {
    backgroundColor: "#FFE5B4",
  },
  buttonAdoptant: {
    backgroundColor: "#B4D7FF",
  },
  buttonEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  buttonTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 4,
    color: "#333",
  },
  buttonDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  infoBox: {
    backgroundColor: "white",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#4CAF50",
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#333",
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#666",
  },
});
