import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { refugeApi, RefugeSession } from "../api/refuge-api";

export function RefugeAdoptantScreen() {
  const router = useRouter();
  const [refuges, setRefuges] = useState<RefugeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adopting, setAdopting] = useState<string | null>(null);

  const loadRefuges = async () => {
    try {
      const data = await refugeApi.getAvailable();
      setRefuges(data);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors du chargement"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRefuges();
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      loadRefuges();
    }, [])
  );

  const handleAdopt = async (refugeSessionId: string) => {
    setAdopting(refugeSessionId);
    try {
      const session = await refugeApi.adopt(refugeSessionId);
      Alert.alert("Succès", "Refuge adopté ! La session commence maintenant.", [
        {
          text: "OK",
          onPress: () => {
            router.push(`/refuge/session?sessionId=${session.id}`);
          },
        },
      ]);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors de l'adoption"
      );
    } finally {
      setAdopting(null);
    }
  };

  const renderRefugeCard = ({ item }: { item: RefugeSession }) => {
    const timeLeft = new Date(item.endsAt || "").getTime() - Date.now();
    const hoursLeft = Math.floor(timeLeft / (1000 * 60 * 60));

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.animalName}>
              {item.animalType} {item.animalCategory}
            </Text>
            <Text style={styles.animalMeta}>
              {item.animalSexe === "Mâle" ? "♂️" : "♀️"} •{" "}
              {item.acceptedSexe === "HOMME_FEMME"
                ? "Tous"
                : item.acceptedSexe === "HOMME"
                  ? "Hommes"
                  : "Femmes"}
            </Text>
          </View>
          <Text style={styles.timer}>⏱️ {hoursLeft}h</Text>
        </View>

        <Text style={styles.adoptePseudo}>
          Par: Adopté #{item.adopteId.substring(0, 8)}
        </Text>

        <TouchableOpacity
          style={[
            styles.adoptButton,
            adopting === item.id && styles.adoptButtonDisabled,
          ]}
          onPress={() => handleAdopt(item.id)}
          disabled={adopting === item.id}
        >
          {adopting === item.id ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.adoptButtonText}>Adopter 💚</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Chargement des refuges...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Refuges Disponibles 🔍</Text>
        <Text style={styles.subtitle}>
          {refuges.length} refuge{refuges.length !== 1 ? "s" : ""}
        </Text>
      </View>

      {refuges.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>Aucun refuge disponible</Text>
          <Text style={styles.emptyText}>
            Revenez plus tard pour trouver un refuge à adopter !
          </Text>
        </View>
      ) : (
        <FlatList
          data={refuges}
          keyExtractor={(item) => item.id}
          renderItem={renderRefugeCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadRefuges} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "white",
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#999",
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  listContent: {
    padding: 12,
  },
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  animalName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  animalMeta: {
    fontSize: 14,
    color: "#666",
  },
  timer: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FF6B6B",
  },
  adoptePseudo: {
    fontSize: 13,
    color: "#999",
    marginBottom: 12,
  },
  adoptButton: {
    backgroundColor: "#2196F3",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  adoptButtonDisabled: {
    opacity: 0.6,
  },
  adoptButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
});
