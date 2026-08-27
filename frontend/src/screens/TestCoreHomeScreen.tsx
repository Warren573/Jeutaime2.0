import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

type TestRoute = {
  label: string;
  route: string;
  description: string;
};

const TEST_ROUTES: TestRoute[] = [
  { label: "Découvrir / Profils", route: "/profiles", description: "Tester découverte, Smile, Grimace et profils." },
  { label: "Lettres", route: "/letters", description: "Tester échanges, alternance et limites." },
  { label: "Salons", route: "/salons-list", description: "Tester entrée, participants et interactions." },
  { label: "Bouteille à la mer", route: "/bottles-main", description: "Tester envoi, réception et réponses." },
  { label: "Refuge", route: "/refuge", description: "Tester le parcours Refuge de bout en bout." },
  { label: "Offrandes", route: "/offerings", description: "Tester envoi, réception et pièces." },
  { label: "Profil", route: "/profile", description: "Tester lecture et modification du profil." },
  { label: "Paramètres", route: "/settings", description: "Tester les réglages fonctionnels." },
];

export default function TestCoreHomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>JEUTAIME TEST</Text>
      <Text style={styles.subtitle}>Version basique — validation du moteur</Text>

      <View style={styles.warning}>
        <Text style={styles.warningTitle}>ENVIRONNEMENT DE TEST</Text>
        <Text style={styles.warningText}>
          Cette branche sert à tester les fonctions sans travailler le design. Ne pas connecter à la base de production.
        </Text>
      </View>

      <View style={styles.statusBox}>
        <Text style={styles.sectionTitle}>Objectif</Text>
        <Text style={styles.text}>Vérifier chaque mécanique de bout en bout avant de remettre le design final.</Text>
      </View>

      <Text style={styles.sectionTitle}>Modules à tester</Text>
      {TEST_ROUTES.map((item) => (
        <Pressable
          key={item.route}
          accessibilityRole="button"
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
          onPress={() => router.push(item.route as never)}
        >
          <Text style={styles.buttonTitle}>{item.label}</Text>
          <Text style={styles.buttonText}>{item.description}</Text>
        </Pressable>
      ))}

      <View style={styles.footerBox}>
        <Text style={styles.sectionTitle}>Règle de cette version</Text>
        <Text style={styles.text}>1. Fonctionnel d'abord.</Text>
        <Text style={styles.text}>2. Données fictives uniquement.</Text>
        <Text style={styles.text}>3. Aucun travail esthétique ici.</Text>
        <Text style={styles.text}>4. Une correction n'arrive sur main qu'après validation.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 48,
    backgroundColor: "#FFFFFF",
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111111",
  },
  subtitle: {
    fontSize: 16,
    color: "#444444",
    marginBottom: 8,
  },
  warning: {
    borderWidth: 2,
    borderColor: "#111111",
    padding: 14,
    backgroundColor: "#F1F1F1",
  },
  warningTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
    color: "#111111",
  },
  warningText: {
    fontSize: 14,
    lineHeight: 20,
    color: "#222222",
  },
  statusBox: {
    borderWidth: 1,
    borderColor: "#BBBBBB",
    padding: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111111",
    marginTop: 4,
  },
  text: {
    fontSize: 15,
    lineHeight: 22,
    color: "#222222",
  },
  button: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: "#777777",
    padding: 14,
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  buttonPressed: {
    backgroundColor: "#E8E8E8",
  },
  buttonTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  buttonText: {
    fontSize: 13,
    lineHeight: 18,
    color: "#555555",
    marginTop: 4,
  },
  footerBox: {
    borderTopWidth: 1,
    borderTopColor: "#BBBBBB",
    paddingTop: 12,
    marginTop: 8,
    gap: 3,
  },
});
