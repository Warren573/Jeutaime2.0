import { router } from "expo-router";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

const items = [
  ["Salons", "/salons-list"],
  ["Refuge", "/refuge"],
  ["Bouteille à la mer", "/bottles-main"],
] as const;

export default function SocialPage() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Social</Text>
      <View style={styles.list}>
        {items.map(([label, route]) => (
          <Pressable key={route} style={styles.row} onPress={() => router.push(route as never)}>
            <Text style={styles.label}>{label}</Text>
            <Text>›</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#fff" },
  title: { fontSize: 26, fontWeight: "700", marginBottom: 20 },
  list: { borderWidth: 1, borderColor: "#bbb" },
  row: { minHeight: 58, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: "#ddd", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  label: { fontSize: 16 },
});
