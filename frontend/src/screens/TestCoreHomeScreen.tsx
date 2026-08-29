import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const actions = [
  { label: "Découvrir", route: "/profiles" },
  { label: "Mes lettres", route: "/letters" },
  { label: "Salons", route: "/salons-list" },
  { label: "Bouteille à la mer", route: "/bottles-main" },
  { label: "Refuge", route: "/refuge" },
  { label: "Offrandes", route: "/offerings" },
] as const;

export default function TestCoreHomeScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>JeuTaime</Text>
      <Text style={styles.subtitle}>Accueil</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Que veux-tu faire ?</Text>
        {actions.map((item) => (
          <Pressable
            key={item.route}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
            onPress={() => router.push(item.route as never)}
          >
            <Text style={styles.rowText}>{item.label}</Text>
            <Text style={styles.arrow}>›</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.section}>
        <Pressable style={styles.row} onPress={() => router.push("/profile" as never)}>
          <Text style={styles.rowText}>Mon profil</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
        <Pressable style={styles.row} onPress={() => router.push("/settings" as never)}>
          <Text style={styles.rowText}>Paramètres</Text>
          <Text style={styles.arrow}>›</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 120,
    backgroundColor: "#FFFFFF",
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    color: "#111111",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 24,
    fontSize: 18,
    color: "#444444",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 8,
    fontSize: 16,
    fontWeight: "700",
    color: "#111111",
  },
  row: {
    minHeight: 58,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#CCCCCC",
    borderBottomWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
  },
  rowPressed: {
    backgroundColor: "#F3F3F3",
  },
  rowText: {
    fontSize: 16,
    color: "#111111",
  },
  arrow: {
    fontSize: 24,
    color: "#555555",
  },
});
