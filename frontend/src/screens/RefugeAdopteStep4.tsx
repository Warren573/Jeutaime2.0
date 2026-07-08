import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { refugeApi } from "../api/refuge-api";

const ANIMAL_EMOJIS: Record<string, string> = {
  Chat: "🐱",
  Chien: "🐕",
  Lapin: "🐰",
  Hamster: "🐹",
  Oiseau: "🦜",
};

const HOUSING_LABELS: Record<string, string> = {
  apartment: "Appartement",
  house: "Maison",
  farm: "Ferme",
};

export function RefugeAdopteStep4() {
  const router = useRouter();
  const { selectedAnimal, selectedAge, refugeHousingType, refugeNotes } = useStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      const refugeSession = await refugeApi.propose({
        animalType: selectedAnimal.toUpperCase(),
        animalCategory: "SIMPLE",
        animalSexe: "NEUTRE",
        acceptedSexe: "HOMME_FEMME",
      });

      useStore.setState({
        selectedAnimal: null,
        selectedAge: null,
        refugeHousingType: null,
        refugeNotes: "",
      });

      router.push(`/refuge?sessionId=${refugeSession.id}`);
    } catch (error: any) {
      Alert.alert("Erreur", error?.message || "Impossible de créer le refuge");
      setIsSubmitting(false);
    }
  };

  if (!selectedAnimal || !selectedAge || !refugeHousingType) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Missing required data</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.step}>Étape 4/4</Text>

        <Text style={styles.title}>Presque prêt</Text>
        <Text style={styles.subtitle}>Vérifiez les détails de votre engagement</Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summarySection}>
            <Text style={styles.sectionLabel}>Votre créature</Text>
            <View style={styles.animalRow}>
              <Text style={styles.animalEmoji}>{ANIMAL_EMOJIS[selectedAnimal]}</Text>
              <View style={styles.animalInfo}>
                <Text style={styles.animalName}>{selectedAnimal}</Text>
                <Text style={styles.animalAge}>{selectedAge}</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.summarySection}>
            <Text style={styles.sectionLabel}>Votre engagement</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Durée</Text>
              <Text style={styles.detailValue}>7 jours</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Type de logement</Text>
              <Text style={styles.detailValue}>{HOUSING_LABELS[refugeHousingType]}</Text>
            </View>
          </View>

          {refugeNotes && (
            <>
              <View style={styles.divider} />
              <View style={styles.summarySection}>
                <Text style={styles.sectionLabel}>Votre message</Text>
                <Text style={styles.notesDisplay}>{refugeNotes}</Text>
              </View>
            </>
          )}
        </View>

        {/* Promise text */}
        <View style={styles.promiseContainer}>
          <Text style={styles.promiseTitle}>Votre promesse</Text>
          <Text style={styles.promiseText}>
            Je m&apos;engage à accueillir cette créature pendant 7 jours, à la nourrir, à jouer avec elle, et à la traiter avec bienveillance. Je sais que ce temps l&apos;adorera.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.ctaButton, isSubmitting && styles.ctaButtonDisabled]}
          onPress={handleConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#2D1F0E" />
          ) : (
            <Text style={styles.ctaButtonText}>Commencer l&apos;aventure</Text>
          )}
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
  summaryCard: {
    backgroundColor: "white",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  summarySection: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 11,
    color: "#999",
    fontWeight: "600",
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  animalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  animalEmoji: {
    fontSize: 56,
  },
  animalInfo: {
    flex: 1,
  },
  animalName: {
    fontSize: 22,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 4,
  },
  animalAge: {
    fontSize: 16,
    color: "#FF9800",
    fontWeight: "600",
  },
  divider: {
    height: 1,
    backgroundColor: "#EEE",
    marginVertical: 12,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: "#8B6F47",
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1F0E",
  },
  notesDisplay: {
    fontSize: 14,
    color: "#2D1F0E",
    lineHeight: 20,
    fontStyle: "italic",
  },
  promiseContainer: {
    backgroundColor: "rgba(255, 184, 180, 0.15)",
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
    padding: 16,
  },
  promiseTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2D1F0E",
    marginBottom: 8,
  },
  promiseText: {
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
