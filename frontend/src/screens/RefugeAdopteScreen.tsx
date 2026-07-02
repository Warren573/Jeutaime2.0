import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { refugeApi } from "../api/refuge-api";

const ANIMALS = ["Chat", "Chien", "Lapin", "Hamster", "Oiseau"];
const CATEGORIES = ["Petit", "Moyen", "Grand"];
const SEXES = ["Mâle", "Femelle"];
const ACCEPTED_SEXES = ["Homme", "Femme", "Homme-Femme"];

interface FormState {
  animalType: string;
  animalCategory: string;
  animalSexe: string;
  acceptedSexe: string;
}

export function RefugeAdopteScreen() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>({
    animalType: "",
    animalCategory: "",
    animalSexe: "",
    acceptedSexe: "",
  });
  const [loading, setLoading] = useState(false);

  const isFormValid =
    form.animalType &&
    form.animalCategory &&
    form.animalSexe &&
    form.acceptedSexe;

  const handlePropose = async () => {
    if (!isFormValid) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await refugeApi.propose({
        animalType: form.animalType,
        animalCategory: form.animalCategory,
        animalSexe: form.animalSexe,
        acceptedSexe: form.acceptedSexe,
      });

      Alert.alert(
        "Succès",
        "Refuge proposé ! En attente d'un adoptant...",
        [
          {
            text: "OK",
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors de la proposition"
      );
    } finally {
      setLoading(false);
    }
  };

  const SelectionGroup = ({
    label,
    value,
    options,
    onSelect,
  }: {
    label: string;
    value: string;
    options: string[];
    onSelect: (option: string) => void;
  }) => (
    <View style={styles.group}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionGrid}>
        {options.map((option) => (
          <TouchableOpacity
            key={option}
            style={[
              styles.optionButton,
              value === option && styles.optionButtonSelected,
            ]}
            onPress={() => onSelect(option)}
          >
            <Text
              style={[
                styles.optionText,
                value === option && styles.optionTextSelected,
              ]}
            >
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Proposer un Refuge 🎭</Text>

        <SelectionGroup
          label="Quel animal ?"
          value={form.animalType}
          options={ANIMALS}
          onSelect={(animalType) => setForm({ ...form, animalType })}
        />

        <SelectionGroup
          label="Taille"
          value={form.animalCategory}
          options={CATEGORIES}
          onSelect={(animalCategory) => setForm({ ...form, animalCategory })}
        />

        <SelectionGroup
          label="Sexe de l'animal"
          value={form.animalSexe}
          options={SEXES}
          onSelect={(animalSexe) => setForm({ ...form, animalSexe })}
        />

        <SelectionGroup
          label="Qui peut adopter ?"
          value={form.acceptedSexe}
          options={ACCEPTED_SEXES}
          onSelect={(acceptedSexe) => setForm({ ...form, acceptedSexe })}
        />

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            💡 Vous proposerez un refuge pendant 7 jours. Chaque jour, vous
            choisirez 2 actions que votre animal peut faire.
          </Text>
        </View>

        <TouchableOpacity
          style={[
            styles.proposeButton,
            !isFormValid && styles.proposeButtonDisabled,
          ]}
          onPress={handlePropose}
          disabled={!isFormValid || loading}
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.proposeButtonText}>Proposer au Refuge</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#333",
  },
  group: {
    marginBottom: 28,
  },
  label: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#333",
  },
  optionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  optionButton: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "white",
    borderWidth: 2,
    borderColor: "#ddd",
    alignItems: "center",
  },
  optionButtonSelected: {
    backgroundColor: "#FFE5B4",
    borderColor: "#FF9800",
  },
  optionText: {
    fontSize: 14,
    color: "#666",
    fontWeight: "500",
  },
  optionTextSelected: {
    color: "#333",
    fontWeight: "700",
  },
  infoBox: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 8,
    marginBottom: 28,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  infoText: {
    fontSize: 14,
    color: "#1565C0",
    lineHeight: 20,
  },
  proposeButton: {
    backgroundColor: "#FF9800",
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 40,
  },
  proposeButtonDisabled: {
    opacity: 0.5,
  },
  proposeButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
