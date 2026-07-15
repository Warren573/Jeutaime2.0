import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { refugeApi, RefugeSession } from "../api/refuge-api";
import { useStore } from "../store/useStore";
import { RefugeDevTimeTravel } from "../components/RefugeDevTimeTravel";

// Les métadonnées (currentDay, timeRemaining, ...) sont déjà déclarées sur RefugeSession
type SessionWithMetadata = RefugeSession;

export function RefugeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useStore();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  const [session, setSession] = useState<SessionWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSession = async () => {
    try {
      if (!sessionId) {
        throw new Error("Session ID manquant");
      }
      const data = await refugeApi.getSession(sessionId);
      setSession(data as SessionWithMetadata);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors du chargement"
      );
      router.push("/refuge");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading || !session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  const isAdopte = currentUser?.id === session.adopteId;
  const isAdoptant = currentUser?.id === session.adoptantId;
  const statusText = session.status === "ACTIVE" ? "Actif" : session.status;
  const animalSexEmoji = session.animalSexe === "Mâle" ? "♂️" : "♀️";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.animalEmoji}>
              {session.animalType === "Chat"
                ? "🐱"
                : session.animalType === "Chien"
                  ? "🐕"
                  : session.animalType === "Lapin"
                    ? "🐰"
                    : session.animalType === "Hamster"
                      ? "🐹"
                      : "🦜"}
            </Text>
            <Text style={styles.title}>
              {session.animalType} {animalSexEmoji}
            </Text>
            <Text style={styles.subtitle}>{session.animalCategory}</Text>
          </View>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>{statusText}</Text>
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Jour courant</Text>
            <Text style={styles.infoValue}>{session.currentDay || 1}/7</Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Votre rôle</Text>
            <Text style={styles.infoValue}>
              {isAdopte ? "🎭 Adopté" : isAdoptant ? "🔍 Adoptant" : "👁️ Spectateur"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Accepte</Text>
            <Text style={styles.infoValue}>
              {session.acceptedSexe === "HOMME_FEMME"
                ? "Tous"
                : session.acceptedSexe === "HOMME"
                  ? "Hommes"
                  : "Femmes"}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Temps restant</Text>
            <Text style={styles.infoValue}>
              {session.timeRemaining ? `${session.timeRemaining.days}j` : "7j"}
            </Text>
          </View>
        </View>

        {/* Role-specific Info */}
        {isAdopte && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>🎭 Vous êtes l'Adopté</Text>
            <Text style={styles.roleCardText}>
              Vous proposez ce refuge et cachez vos 2 actions chaque jour.
              L'Adoptant tentera de deviner vos actions.
            </Text>
          </View>
        )}

        {isAdoptant && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>🔍 Vous êtes l'Adoptant</Text>
            <Text style={styles.roleCardText}>
              Vous avez adopté ce refuge. Chaque jour, l'Adopté choisit 2
              actions - vous devez les deviner !
            </Text>
          </View>
        )}

        {!isAdopte && !isAdoptant && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>👁️ Mode Spectateur</Text>
            <Text style={styles.roleCardText}>
              Vous regardez cette session, mais n'êtes ni l'Adopté ni
              l'Adoptant.
            </Text>
          </View>
        )}

        {/* DEV Mode - Time Travel */}
        <RefugeDevTimeTravel
          sessionId={session.id}
          currentDay={session.currentDay || 1}
          onDayChanged={() => loadSession()}
        />

        {/* Coming Soon */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>⏳ Prochainement</Text>
          <Text style={styles.comingSoonText}>
            • Jeu quotidien (actions et devinettes){"\n"}
            • Révélation et scoring{"\n"}
            • Notifications{"\n"}
            • Sélection des fonds
          </Text>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F4ED",
  },
  scroll: {
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 16,
    marginTop: 16,
  },
  animalEmoji: {
    fontSize: 48,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 12,
  },
  infoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: "45%",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
  },
  roleCard: {
    backgroundColor: "#E3F2FD",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  roleCardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1565C0",
    marginBottom: 8,
  },
  roleCardText: {
    fontSize: 14,
    color: "#1565C0",
    lineHeight: 20,
  },
  comingSoonCard: {
    backgroundColor: "#FFF3E0",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    marginHorizontal: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#FF9800",
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#E65100",
    marginBottom: 8,
  },
  comingSoonText: {
    fontSize: 14,
    color: "#E65100",
    lineHeight: 20,
  },
  backButton: {
    backgroundColor: "#666",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 40,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
