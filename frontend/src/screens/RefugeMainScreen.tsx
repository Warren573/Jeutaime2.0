import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, Animated, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "../store/useStore";
import { BouncyButton } from "../components/BouncyButton";
import { BackgroundPicker } from "../components/BackgroundPicker";
import { AnimalIllustration, type RefugeAction } from "../components/AnimalIllustration";
import { ACTION_LABELS } from "../data/refugeActions";
import { getBackgroundGradientStyle } from "../data/refugeBackgrounds";
import { useRefugeAction } from "../hooks/useRefugeAction";
import { useRefugeActionLog } from "../hooks/useRefugeActionLog";
import { useRefugeDay } from "../hooks/useRefugeDay";
import { useRefugeDailyChoices } from "../hooks/useRefugeDailyChoices";
import { useRefugeSession } from "../hooks/useRefugeSession";
import { formatAnimalAge } from "../modules/refuge/refugeAgeDisplay";

const screenHeight = Dimensions.get("window").height;
const screenWidth = Dimensions.get("window").width;

const getResponsiveValues = () => {
  if (screenHeight < 700) {
    return { animalSize: 220 };
  } else if (screenHeight < 800) {
    return { animalSize: 260 };
  }
  return { animalSize: 300 };
};

/**
 * Écran principal d'une session Refuge active.
 * Affiche: 7 cœurs, refuge + compagnon, 4 jauges, 4 actions.
 * Gère le cycle 7 jours avec évaluation et dévoilement des profils.
 */
export function RefugeMainScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === "string" ? params.sessionId : null;

  const { currentAction, isActing, triggerAction } = useRefugeAction();
  const { logAction } = useRefugeActionLog();
  const { animalSize } = getResponsiveValues();
  const {
    selectedGuessActions,
    toggleGuessAction,
  } = useRefugeDailyChoices();

  // Charger la vraie session du serveur
  const refugeSession = useRefugeSession(sessionId);

  const [actionsDone, setActionsDone] = useState<RefugeAction[]>([]);
  const [phase, setPhase] = useState<"playing" | "guessing" | "submitted">("playing");
  const [heartPulse, setHeartPulse] = useState(false);
  const [otherUserProfile, setOtherUserProfile] = useState<any>(null);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  // Jauges — valeurs du backend
  const gauges = {
    happiness: 75,
    hunger: 45,
    energy: 60,
    cleanliness: 80,
  };

  // Cœurs depuis le serveur
  const hearts = refugeSession.hearts;

  const actions: RefugeAction[] = ["feed", "play", "pet", "wash"];

  const handleActionPress = (action: RefugeAction) => {
    if (
      actionsDone.includes(action) ||
      actionsDone.length >= 2 ||
      !refugeSession.canAttemptToday
    ) {
      return;
    }

    logAction(action);
    triggerAction(action);

    const newActionsDone = [...actionsDone, action];
    setActionsDone(newActionsDone);

    if (newActionsDone.length === 2) {
      setHeartPulse(true);
      setTimeout(() => {
        setPhase("guessing");
        setHeartPulse(false);
      }, 2500);
    }
  };

  const handleTerminateDay = async () => {
    if (selectedGuessActions.length !== 2) return;

    // Soumettre les actions et les devins au serveur
    const success = await refugeSession.submitAttempt(
      actionsDone,
      selectedGuessActions as string[]
    );

    if (success) {
      setPhase("submitted");

      // Si c'est le jour 7, préparer la révélation
      if (refugeSession.currentDay === 7) {
        setTimeout(async () => {
          const revealed = await refugeSession.revealProfiles();
          if (revealed) {
            setOtherUserProfile(revealed.otherUserProfile);
            // Naviguer vers l'écran de révélation des profils
            router.push({
              pathname: "/refuge/profile-reveal",
              params: { profile: JSON.stringify(revealed.otherUserProfile) },
            });
          }
        }, 2000);
      }
    }
  };

  if (refugeSession.isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Chargement...</Text>
      </SafeAreaView>
    );
  }

  if (!sessionId || refugeSession.status === "ABANDONED") {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.error}>Session terminée ou invalide</Text>
        <BouncyButton
          style={styles.button}
          onPress={() => router.replace("/refuge")}
        >
          <Text style={styles.buttonText}>Retour</Text>
        </BouncyButton>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, pointerEvents: showBackgroundPicker ? "none" : "auto" }}>
      {/* Header */}
      <View style={styles.header}>
        <BouncyButton
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backText}>← Retour</Text>
        </BouncyButton>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>Mon compagnon</Text>
          {refugeSession.companion && (
            <Text style={styles.headerSubtitle}>
              {refugeSession.companion.animalType} • {formatAnimalAge(refugeSession.companion.animalAgeMonths)}
            </Text>
          )}
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {/* 7 Cœurs */}
      <View style={styles.heartsContainer}>
        {hearts.map((heart, idx) => (
          <Text
            key={idx}
            style={[
              styles.heart,
              heartPulse && idx === refugeSession.currentDay - 1 && styles.heartPulse,
            ]}
          >
            {heart}
          </Text>
        ))}
      </View>

      {/* Refuge Zone with Companion */}
      <View
        style={[
          styles.refugeZone,
          getBackgroundGradientStyle(refugeSession.companion?.background || 'default'),
        ]}
      >
        {/* Companion with Shadow */}
        <View style={styles.companionWrapper}>
          {refugeSession.companion?.animalType && (
            <AnimalIllustration
              animal={refugeSession.companion.animalType as any}
              size={animalSize}
              action={currentAction}
              isActing={isActing}
            />
          )}
          {/* Ground Shadow */}
          <View style={[styles.groundShadow, { width: animalSize * 0.6 }]} />
        </View>

        {/* Background Selector Button */}
        <BouncyButton
          style={styles.backgroundSelectorButton}
          onPress={() => setShowBackgroundPicker(true)}
        >
          <Text style={styles.backgroundSelectorText}>🎨</Text>
        </BouncyButton>
      </View>

      {/* Jauges */}
      <View style={styles.gaugesContainer}>
        <View style={styles.gaugeRow}>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>❤️ Bonheur</Text>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeFill, styles.gaugeFillHappiness, { width: `${gauges.happiness}%` }]} />
            </View>
          </View>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>🍖 Faim</Text>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeFill, styles.gaugeFillHunger, { width: `${gauges.hunger}%` }]} />
            </View>
          </View>
        </View>
        <View style={styles.gaugeRow}>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>⚡ Énergie</Text>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeFill, styles.gaugeFillEnergy, { width: `${gauges.energy}%` }]} />
            </View>
          </View>
          <View style={styles.gaugeItem}>
            <Text style={styles.gaugeLabel}>🧼 Propreté</Text>
            <View style={styles.gaugeBar}>
              <View style={[styles.gaugeFill, styles.gaugeFillCleanliness, { width: `${gauges.cleanliness}%` }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Content Area */}
      <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
        {phase === "playing" && (
          <View style={styles.actionsGrid}>
            {actions.map(action => (
              <BouncyButton
                key={action}
                style={[
                  styles.actionButton,
                  actionsDone.includes(action) && styles.actionButtonLocked,
                  isActing && action === currentAction && styles.actionButtonActive,
                ]}
                onPress={() => handleActionPress(action)}
                disabled={actionsDone.includes(action) || isActing || !refugeSession.canAttemptToday}
              >
                <Text style={styles.actionIcon}>
                  {action === "feed" ? "🍖" : action === "play" ? "🎾" : action === "pet" ? "🤗" : "🧼"}
                </Text>
                <Text
                  style={[
                    styles.actionLabel,
                    isActing && action === currentAction && styles.actionLabelActive,
                  ]}
                >
                  {ACTION_LABELS[action]}
                </Text>
              </BouncyButton>
            ))}
          </View>
        )}

        {phase === "guessing" && (
          <View style={styles.guessingCard}>
            <Text style={styles.guessTitle}>À ton avis, qu&apos;a choisi l&apos;autre ?</Text>

            <View style={styles.guessActionsGrid}>
              {actions.map(action => (
                <BouncyButton
                  key={action}
                  style={[
                    styles.guessButton,
                    selectedGuessActions.includes(action) && styles.guessButtonSelected,
                  ]}
                  onPress={() => toggleGuessAction(action)}
                >
                  <Text
                    style={[
                      styles.guessButtonText,
                      selectedGuessActions.includes(action) && styles.guessButtonTextSelected,
                    ]}
                  >
                    {ACTION_LABELS[action]}
                  </Text>
                </BouncyButton>
              ))}
            </View>

            {selectedGuessActions.length === 2 && (
              <BouncyButton
                style={styles.terminateButton}
                onPress={handleTerminateDay}
              >
                <Text style={styles.terminateButtonText}>Terminer ma journée</Text>
              </BouncyButton>
            )}
          </View>
        )}

        {phase === "submitted" && (
          <View style={styles.submittedCard}>
            <Text style={styles.submittedTitle}>Journée terminée.</Text>
            <Text style={styles.submittedSubtitle}>À demain.</Text>
          </View>
        )}
      </ScrollView>
      </View>

      {/* Background Picker Modal */}
      <Modal
        visible={showBackgroundPicker}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBackgroundPicker(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personnaliser le refuge</Text>
              <BouncyButton
                style={styles.modalCloseButton}
                onPress={() => setShowBackgroundPicker(false)}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </BouncyButton>
            </View>

            <BackgroundPicker
              currentBackground={refugeSession.companion?.background || 'default'}
              onSelectBackground={async (background) => {
                const success = await refugeSession.changeBackground(background);
                if (success) {
                  setShowBackgroundPicker(false);
                }
              }}
              isLoading={refugeSession.isLoading}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFF8E7",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B6F47",
  },
  headerContent: {
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  headerSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#8B6F47",
    marginTop: 2,
  },
  headerSpacer: {
    width: 40,
  },

  /* 7 Cœurs */
  heartsContainer: {
    flexDirection: "row" as const,
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  heart: {
    fontSize: 28,
  },
  heartPulse: {
    // Pulse animation handled via Animated in component
    transform: [{ scale: 1 }],
  },

  /* Refuge Zone */
  refugeZone: {
    flex: 0.5,
    maxHeight: 350,
    marginHorizontal: 12,
    marginBottom: 12,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
    minHeight: 280,
    overflow: "hidden" as const,
    borderRadius: 12,
  },
  companionWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
  },
  groundShadow: {
    height: 12,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
    marginTop: -8,
    marginBottom: 8,
  },
  backgroundSelectorButton: {
    position: "absolute" as const,
    top: 12,
    right: 12,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  backgroundSelectorText: {
    fontSize: 24,
  },

  /* Jauges */
  gaugesContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginHorizontal: 12,
    marginBottom: 12,
  },
  gaugeRow: {
    flexDirection: "row" as const,
    gap: 8,
    marginBottom: 8,
  },
  gaugeItem: {
    flex: 1,
    flexDirection: "column" as const,
    gap: 3,
  },
  gaugeLabel: {
    fontSize: 11,
    color: "#8B6F47",
    fontWeight: "500",
  },
  gaugeBar: {
    height: 4,
    backgroundColor: "#E0D5C8",
    borderRadius: 2,
    overflow: "hidden",
  },
  gaugeFill: {
    height: "100%",
    borderRadius: 2,
  },
  gaugeFillHappiness: {
    backgroundColor: "#FF6B9D",
  },
  gaugeFillHunger: {
    backgroundColor: "#E8A76A",
  },
  gaugeFillEnergy: {
    backgroundColor: "#FFD700",
  },
  gaugeFillCleanliness: {
    backgroundColor: "#87CEEB",
  },

  /* Scroll Content */
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 12,
    paddingVertical: 12,
  },

  /* Actions Grid */
  actionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: 8,
  },
  actionButton: {
    width: (screenWidth - 44) / 2,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#FFE5B4",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  actionButtonLocked: {
    opacity: 0.5,
  },
  actionButtonActive: {
    backgroundColor: "#FF9800",
    shadowOpacity: 0.12,
    elevation: 4,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 2,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2D1F0E",
    textAlign: "center",
  },
  actionLabelActive: {
    color: "#FFFFFF",
  },

  /* Guessing Phase */
  guessingCard: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0E5D8",
  },
  guessTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D1F0E",
    textAlign: "center",
    marginBottom: 16,
  },
  guessActionsGrid: {
    flexDirection: "row" as const,
    flexWrap: "wrap" as const,
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 16,
  },
  guessButton: {
    width: (screenWidth - 52) / 2,
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: "#E8D5C4",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "transparent",
  },
  guessButtonSelected: {
    backgroundColor: "#FF9800",
    borderColor: "#FF7500",
  },
  guessButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2D1F0E",
    textAlign: "center",
  },
  guessButtonTextSelected: {
    color: "#FFFFFF",
  },
  terminateButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "#FFD700",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
    alignSelf: "center",
  },
  terminateButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D1F0E",
  },

  /* Submitted Phase */
  submittedCard: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  submittedTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#2D1F0E",
    textAlign: "center",
    marginBottom: 8,
  },
  submittedSubtitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B6F47",
    textAlign: "center",
  },

  /* Error State */
  error: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginBottom: 16,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#FFE5B4",
    borderRadius: 8,
    alignItems: "center",
    alignSelf: "center",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#2D1F0E",
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF8E7",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: "row" as const,
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F0E5D8",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(240, 235, 225, 0.5)",
  },
  modalCloseText: {
    fontSize: 18,
    color: "#8B6F47",
    fontWeight: "600",
  },
});
