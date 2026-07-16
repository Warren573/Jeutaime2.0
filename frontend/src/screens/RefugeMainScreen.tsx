import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, Animated, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useStore } from "../store/useStore";
import { BouncyButton } from "../components/BouncyButton";
import { BackgroundPicker } from "../components/BackgroundPicker";
import { RefugeDevTimeTravel } from "../components/RefugeDevTimeTravel";
import { RefugeActionGrid } from "../components/RefugeActionGrid";
import { RefugeRevealPhase } from "../components/RefugeRevealPhase";
import { AnimalIllustration, type RefugeAction } from "../components/AnimalIllustration";
import { BACKEND_ACTION_LABELS, BACKEND_ACTION_ICONS } from "../data/refugeActions";
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
    return { animalSize: 165, zoneMinHeight: 175, zoneMaxHeight: 210 };
  } else if (screenHeight < 800) {
    return { animalSize: 210, zoneMinHeight: 215, zoneMaxHeight: 260 };
  }
  return { animalSize: 245, zoneMinHeight: 230, zoneMaxHeight: 300 };
};

/**
 * Écran principal d'une session Refuge active.
 * Affiche: 7 cœurs, refuge + compagnon, 4 jauges, 4 actions.
 * Gère le cycle 7 jours avec évaluation et dévoilement des profils.
 */
export function RefugeMainScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const sessionId = sessionIdProp;

  const { currentAction, isActing, triggerAction } = useRefugeAction();
  const { logAction } = useRefugeActionLog();
  const { animalSize, zoneMinHeight, zoneMaxHeight } = getResponsiveValues();
  const {
    selectedMyActions,
    selectedGuessActions,
    toggleMyAction,
    toggleGuessAction,
    resetDay,
  } = useRefugeDailyChoices();

  // Charger la vraie session du serveur
  const refugeSession = useRefugeSession(sessionId);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [heartPulse, setHeartPulse] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  const handleAdopteSubmit = async () => {
    if (selectedMyActions.length !== 2 || isSubmitting) return;

    setIsSubmitting(true);
    const success = await refugeSession.submitDailyChoice(selectedMyActions);
    setIsSubmitting(false);

    if (success) {
      resetDay();
    }
  };

  // L'état "tentative soumise" vient du serveur : il survit au rechargement
  const adoptantSubmitted = refugeSession.todaySubmitted;

  // Repartir d'une sélection vide quand le jour change (minuit ou panneau DEV)
  useEffect(() => {
    resetDay();
  }, [refugeSession.currentDay, resetDay]);

  const isWaitingForAdoptant = refugeSession.status === "WAITING_FOR_ADOPTANT" || refugeSession.status === "CREATION";

  // Jauges — valeurs du backend
  const gauges = {
    happiness: 75,
    hunger: 45,
    energy: 60,
    cleanliness: 80,
  };

  // Cœurs depuis le serveur
  const hearts = refugeSession.hearts;

  const handleAdoptantSubmit = async () => {
    if (selectedGuessActions.length !== 2 || isSubmitting) return;

    // Soumettre la tentative de l'Adoptant au serveur (POST /refuge/guess).
    // Après le jour 7, le serveur expose reveal.available : la phase finale
    // de consentement s'affiche alors — aucune révélation automatique.
    setIsSubmitting(true);
    await refugeSession.submitGuess(selectedGuessActions);
    setIsSubmitting(false);
  };

  const handleRevealDecision = async (decision: "ACCEPT" | "REFUSE") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await refugeSession.submitRevealConsent(decision);
    setIsSubmitting(false);
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
          onPress={() => router.replace("/(tabs)/social")}
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
          onPress={() => router.replace('/(tabs)/social')}
        >
          <Text style={styles.backText}>← Retour</Text>
        </BouncyButton>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>
            {refugeSession.role === "adopte" ? "Mon refuge" : "Mon compagnon"}
          </Text>
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
          { minHeight: zoneMinHeight, maxHeight: zoneMaxHeight },
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
          disabled={refugeSession.role === "adoptant"}
          onPress={() => setShowBackgroundPicker(true)}
        >
          <Text style={[styles.backgroundSelectorText, refugeSession.role === "adoptant" && { opacity: 0.5 }]}>🎨</Text>
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
        {/* Résultat quotidien — bandeau compact juste au-dessus des actions */}
        {refugeSession.todayResult && (
          <View style={styles.todayResultContainer}>
            <Text style={styles.resultEmoji}>{refugeSession.todayResult.emoji}</Text>
            <Text style={styles.resultMessage}>
              {refugeSession.todayResult.message}
              {refugeSession.todayResult.reward > 0 && (
                <Text style={styles.rewardText}>  +{refugeSession.todayResult.reward} pièces chacun</Text>
              )}
            </Text>
          </View>
        )}

        {/* PHASE FINALE: jour 7 terminé → consentement mutuel au dévoilement.
            L'état vient exclusivement du serveur (reveal.available). */}
        {refugeSession.reveal?.available && (
          <RefugeRevealPhase
            status={refugeSession.status}
            reveal={refugeSession.reveal}
            hearts={hearts}
            otherProfile={refugeSession.otherProfile}
            isSubmitting={isSubmitting}
            onDecision={handleRevealDecision}
            onExit={() => router.replace('/(tabs)/social')}
          />
        )}

        {/* ADOPTÉ: Display today's server-generated actions (read-only) */}
        {!refugeSession.reveal?.available && refugeSession.role === "adopte" && (
          <View style={styles.adopteCard}>
            {isWaitingForAdoptant ? (
              <>
                <Text style={styles.questionText}>En attente d&apos;un adoptant...</Text>
                <Text style={styles.loadingText}>
                  Ton compagnon apparaîtra dans la liste des refuges disponibles.
                  Le jeu commence dès qu&apos;il est adopté.
                </Text>
              </>
            ) : (
              <>
                <Text style={styles.questionText}>Que fait-on aujourd&apos;hui ?</Text>
                {refugeSession.adopteSubmittedToday && refugeSession.todayActions ? (
                  <View style={styles.adoptActionsDisplay}>
                    <View style={styles.actionDisplay}>
                      <Text style={styles.actionDisplayIcon}>
                        {BACKEND_ACTION_ICONS[refugeSession.todayActions.action1] ?? "🐾"}
                      </Text>
                      <Text style={styles.actionDisplayLabel}>
                        {BACKEND_ACTION_LABELS[refugeSession.todayActions.action1] ?? refugeSession.todayActions.action1}
                      </Text>
                    </View>
                    <Text style={styles.actionSeparator}>et</Text>
                    <View style={styles.actionDisplay}>
                      <Text style={styles.actionDisplayIcon}>
                        {BACKEND_ACTION_ICONS[refugeSession.todayActions.action2] ?? "🐾"}
                      </Text>
                      <Text style={styles.actionDisplayLabel}>
                        {BACKEND_ACTION_LABELS[refugeSession.todayActions.action2] ?? refugeSession.todayActions.action2}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <RefugeActionGrid
                    selectedActions={selectedMyActions}
                    onToggleAction={toggleMyAction}
                  />
                )}
                {!refugeSession.adopteSubmittedToday && selectedMyActions.length === 2 && (
                  <BouncyButton
                    style={styles.validateButton}
                    onPress={handleAdopteSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.validateButtonText}>
                      {isSubmitting ? "Envoi..." : "Valider"}
                    </Text>
                  </BouncyButton>
                )}
              </>
            )}
          </View>
        )}

        {/* ADOPTANT: Guess today's two actions */}
        {!refugeSession.reveal?.available && refugeSession.role === "adoptant" && !isWaitingForAdoptant && (
          <View style={styles.adoptantCard}>
            <Text style={styles.questionText}>Que veut-il faire aujourd&apos;hui ?</Text>

            {!refugeSession.adopteSubmittedToday && !adoptantSubmitted ? (
              <Text style={styles.loadingText}>
                Ton compagnon n&apos;a pas encore choisi ses actions du jour.
                Reviens un peu plus tard pour tenter de les deviner.
              </Text>
            ) : (
            <>
            <RefugeActionGrid
              selectedActions={selectedGuessActions}
              onToggleAction={toggleGuessAction}
              disabled={false}
              submitted={adoptantSubmitted}
            />

            {adoptantSubmitted ? (
              <View style={styles.submittedMessage}>
                <Text style={styles.submittedMessageText}>Choix enregistré</Text>
              </View>
            ) : (
              <>
                {selectedGuessActions.length === 2 && (
                  <BouncyButton
                    style={styles.validateButton}
                    onPress={handleAdoptantSubmit}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.validateButtonText}>
                      {isSubmitting ? "Envoi..." : "Valider"}
                    </Text>
                  </BouncyButton>
                )}
              </>
            )}
            </>
            )}
          </View>
        )}

        <RefugeDevTimeTravel
          sessionId={sessionId}
          currentDay={refugeSession.currentDay}
          onDayChanged={() => refugeSession.fetchSessionStatus()}
          onSessionReset={() => router.replace('/(tabs)/social')}
        />
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
    paddingVertical: 8,
  },
  heart: {
    fontSize: 28,
  },
  heartPulse: {
    // Pulse animation handled via Animated in component
    transform: [{ scale: 1 }],
  },

  /* Résultat quotidien — simple bandeau d'information, pas une grande carte */
  todayResultContainer: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 8,
  },
  resultEmoji: {
    fontSize: 18,
  },
  resultMessage: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
  },
  rewardText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#CC8A00",
  },

  /* Refuge Zone — min/maxHeight injectés dynamiquement (responsive) */
  refugeZone: {
    flex: 0.4,
    marginHorizontal: 12,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
    position: "relative" as const,
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
    marginBottom: 8,
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
    paddingTop: 4,
    paddingBottom: 12,
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

  /* ADOPTÉ - Display Actions */
  adopteCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0E5D8",
  },
  questionText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#2D1F0E",
    textAlign: "center",
    marginBottom: 12,
  },
  adoptActionsDisplay: {
    flexDirection: "row" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  actionDisplay: {
    alignItems: "center",
    justifyContent: "center",
  },
  actionDisplayIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  actionDisplayLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#2D1F0E",
  },
  actionSeparator: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8B6F47",
  },
  loadingText: {
    fontSize: 13,
    color: "#8B6F47",
    fontStyle: "italic",
  },

  /* ADOPTANT - carte (la grille d'actions est le composant partagé RefugeActionGrid) */
  adoptantCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#F0E5D8",
  },
  validateButton: {
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
  validateButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2D1F0E",
  },
  submittedMessage: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: "rgba(76, 175, 80, 0.1)",
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginTop: 12,
  },
  submittedMessageText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4CAF50",
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
