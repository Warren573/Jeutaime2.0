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
import { LinearGradient } from "expo-linear-gradient";
import { refugeApi, RefugeSession } from "../api/refuge-api";
import { useStore } from "../store/useStore";
import { BackgroundPicker } from "../modules/refuge/components/BackgroundPicker";
import { BACKGROUND_DEFINITIONS } from "../modules/refuge/refugeBackgrounds";

interface SessionWithMetadata extends RefugeSession {
  currentDay?: number;
  timeRemaining?: string;
  isActive?: boolean;
  isCompleted?: boolean;
}

export function RefugeSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { currentUser } = useStore();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;

  console.log("=== REFUGESESSIONSCREEN RENDER ===");
  console.log("📍 Screen: RefugeSessionScreen");
  console.log("📋 Raw params:", params);
  console.log("🎫 Parsed sessionId:", sessionId);
  console.log("👤 currentUser:", { userId: currentUser?.id, username: currentUser?.pseudo });

  const [session, setSession] = useState<SessionWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [backgroundModalVisible, setBackgroundModalVisible] = useState(false);
  const [updatingBackground, setUpdatingBackground] = useState(false);

  const loadSession = async () => {
    console.log("🔄 loadSession() called");
    try {
      if (!sessionId) {
        console.log("❌ NO SESSION ID - throwing error");
        throw new Error("Session ID manquant - redirection vers l'onboarding");
      }
      console.log("📡 Calling refugeApi.getSession()...");
      const data = await refugeApi.getSession(sessionId);
      console.log("✅ Session loaded successfully:", data);
      console.log("🔍 Session data type:", typeof data);
      console.log("🔍 Session.background:", data?.background, "type:", typeof data?.background);
      console.log("🔍 Session.pet:", data?.pet, "type:", typeof data?.pet);
      console.log("🔍 Session.owner:", data?.owner, "type:", typeof data?.owner);
      console.log("🔍 Session.animalType:", data?.animalType, "type:", typeof data?.animalType);
      console.log("🔍 Session.status:", data?.status, "type:", typeof data?.status);
      console.log("🔍 All session keys:", data ? Object.keys(data) : "NO DATA");
      setSession(data as SessionWithMetadata);
      console.log("✅ setSession() called with:", data);
    } catch (error) {
      console.error("❌ ERROR in loadSession():", error);
      console.log("📍 Route CHOSEN (on error):", "/refuge/adopte/step1");
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors du chargement"
      );
      router.push("/refuge/adopte/step1");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateBackground = async (background: string) => {
    if (!session) return;
    try {
      setUpdatingBackground(true);
      const updated = await refugeApi.updateBackground(session.id, background);
      setSession({ ...session, ...updated } as SessionWithMetadata);
      setBackgroundModalVisible(false);
    } catch (error) {
      Alert.alert(
        "Erreur",
        error instanceof Error ? error.message : "Erreur lors de la mise à jour"
      );
    } finally {
      setUpdatingBackground(false);
    }
  };

  useEffect(() => {
    loadSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  if (loading || !session) {
    console.log("📍 RENDER: Loading or no session - showing spinner");
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
        </View>
      </SafeAreaView>
    );
  }

  console.log("📍 RENDER: Session exists, preparing UI");
  console.log("✅ Session at render:", session);
  console.log("✅ session.background value:", session?.background);
  console.log("✅ session.animalType value:", session?.animalType);
  console.log("✅ session.status value:", session?.status);

  const isAdopte = currentUser?.id === session?.adopteId;
  const isAdoptant = currentUser?.id === session?.adoptantId;
  const statusText = session?.status === "ACTIVE" ? "Active" : session?.status;
  const animalSexEmoji = session?.animalSexe === "Mâle" ? "♂️" : "♀️";

  console.log("✅ Computed values - isAdopte:", isAdopte, "isAdoptant:", isAdoptant);

  if (!session?.background) {
    console.warn("⚠️ WARNING: session.background is undefined or null");
  }

  const backgroundDef =
    BACKGROUND_DEFINITIONS[session?.background as keyof typeof BACKGROUND_DEFINITIONS] ||
    BACKGROUND_DEFINITIONS.FORET;

  console.log("✅ backgroundDef:", backgroundDef?.name || "DEFAULT");
  console.log("📍 ABOUT TO RENDER: Main JSX");

  console.log("📍 Rendering LinearGradient...");
  return (
    <LinearGradient
      colors={backgroundDef.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeAreaContainer}>
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.animalEmoji}>
              {(() => {
                console.log("📍 In animalEmoji ternary - session.animalType:", session?.animalType);
                return session?.animalType === "Chat"
                  ? "🐱"
                  : session?.animalType === "Chien"
                    ? "🐕"
                    : session?.animalType === "Lapin"
                      ? "🐰"
                      : session?.animalType === "Hamster"
                        ? "🐹"
                        : "🦜";
              })()}
            </Text>
            <Text style={styles.title}>
              {(() => {
                console.log("📍 In title - session.animalType:", session?.animalType, "animalSexEmoji:", animalSexEmoji);
                return `${session?.animalType} ${animalSexEmoji}`;
              })()}
            </Text>
            <Text style={styles.subtitle}>
              {(() => {
                console.log("📍 In subtitle - session.animalCategory:", session?.animalCategory);
                return session?.animalCategory;
              })()}
            </Text>
          </View>
          <View style={styles.headerRight}>
            {isAdopte && (
              <TouchableOpacity
                style={styles.backgroundButton}
                onPress={() => setBackgroundModalVisible(true)}
              >
                <Text style={styles.backgroundButtonText}>🎨</Text>
              </TouchableOpacity>
            )}
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{statusText}</Text>
            </View>
          </View>
        </View>

        {/* Session Info */}
        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Jour courant</Text>
            <Text style={styles.infoValue}>
              {(() => {
                console.log("📍 currentDay - value:", session?.currentDay, "type:", typeof session?.currentDay);
                return `${session?.currentDay || 1}/7`;
              })()}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Votre rôle</Text>
            <Text style={styles.infoValue}>
              {(() => {
                console.log("📍 roleValue - isAdopte:", isAdopte, "isAdoptant:", isAdoptant);
                return isAdopte ? "🎭 Adopté" : isAdoptant ? "🔍 Adoptant" : "Spectateur";
              })()}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Accepte</Text>
            <Text style={styles.infoValue}>
              {(() => {
                console.log("📍 acceptedSexe - value:", session?.acceptedSexe, "type:", typeof session?.acceptedSexe);
                return session?.acceptedSexe === "HOMME_FEMME"
                  ? "Tous"
                  : session?.acceptedSexe === "HOMME"
                    ? "Hommes"
                    : "Femmes";
              })()}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoLabel}>Temps restant</Text>
            <Text style={styles.infoValue}>
              {(() => {
                console.log("📍 timeRemaining - value:", session?.timeRemaining, "type:", typeof session?.timeRemaining);
                return session?.timeRemaining || "7j";
              })()}
            </Text>
          </View>
        </View>

        {/* Role-specific Info */}
        {(() => {
          console.log("📍 Before role-specific render - isAdopte:", isAdopte, "isAdoptant:", isAdoptant);
          return null;
        })()}
        {isAdopte && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>🎭 Vous êtes l&apos;Adopté</Text>
            <Text style={styles.roleCardText}>
              Vous proposez ce refuge et cachez vos 2 actions chaque jour.
              L&apos;Adoptant tentera de deviner vos actions.
            </Text>
          </View>
        )}

        {isAdoptant && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>🔍 Vous êtes l&apos;Adoptant</Text>
            <Text style={styles.roleCardText}>
              Vous avez adopté ce refuge. Chaque jour, l&apos;Adopté choisit 2
              actions - vous devez les deviner !
            </Text>
          </View>
        )}

        {!isAdopte && !isAdoptant && (
          <View style={styles.roleCard}>
            <Text style={styles.roleCardTitle}>👁️ Mode Spectateur</Text>
            <Text style={styles.roleCardText}>
              Vous regardez cette session, mais n&apos;êtes ni l&apos;Adopté ni
              l&apos;Adoptant.
            </Text>
          </View>
        )}

        {/* Coming Soon */}
        <View style={styles.comingSoonCard}>
          <Text style={styles.comingSoonTitle}>⏳ Prochainement</Text>
          <Text style={styles.comingSoonText}>
            • Jeu quotidien (actions et devinettes){"\n"}
            • Révélation et scoring{"\n"}
            • Notifications
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

      {(() => {
        console.log("📍 Before BackgroundPicker - session.background:", session?.background, "type:", typeof session?.background);
        return null;
      })()}
      <BackgroundPicker
        visible={backgroundModalVisible}
        currentBackground={session?.background || "FORET"}
        onSelect={handleUpdateBackground}
        onClose={() => setBackgroundModalVisible(false)}
        isLoading={updatingBackground}
      />
      {(() => {
        console.log("✅ RENDER COMPLETED SUCCESSFULLY");
        return null;
      })()}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeAreaContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
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
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 12,
  },
  backgroundButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8F5E9",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundButtonText: {
    fontSize: 24,
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
    marginBottom: 40,
  },
  backButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
