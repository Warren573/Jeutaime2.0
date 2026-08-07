import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Dimensions, ScrollView, Modal } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useStore } from "../store/useStore";
import { BouncyButton } from "../components/BouncyButton";
import { AppBackButton } from "../components/AppBackButton";
import { BackgroundPicker } from "../components/BackgroundPicker";
import { RefugeRevealPhase } from "../components/RefugeRevealPhase";
import { RefugeDayResultIcon } from "../components/RefugeDayResultIcon";
import { AnimalIllustration } from "../components/AnimalIllustration";
import { ACTION_LABELS, BACKEND_ACTION_LABELS, BACKEND_ACTION_ICONS, type RefugeActionType } from "../data/refugeActions";
import { getAnimalLabel, isRefugeAnimal } from "../data/refugeAnimals";
import { getBackgroundGradientStyle, DEFAULT_REFUGE_BACKGROUND } from "../data/refugeBackgrounds";
import { useRefugeDailyChoices } from "../hooks/useRefugeDailyChoices";
import { useRefugeSession } from "../hooks/useRefugeSession";
import { formatAnimalAge } from "../modules/refuge/refugeAgeDisplay";

const screenHeight = Dimensions.get("window").height;

const getResponsiveValues = () => {
  if (screenHeight < 700) {
    return { animalSize: 220 };
  } else if (screenHeight < 800) {
    return { animalSize: 260 };
  }
  return { animalSize: 300 };
};

export function RefugeMainScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const sessionId = sessionIdProp;
  const { currentUser } = useStore();
  const currentUserId = currentUser?.id ?? null;
  const { animalSize } = getResponsiveValues();
  const {
    selectedMyActions,
    selectedGuessActions,
    toggleMyAction,
    toggleGuessAction,
    resetDay,
  } = useRefugeDailyChoices();
  const refugeSession = useRefugeSession(sessionId);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBackgroundPicker, setShowBackgroundPicker] = useState(false);

  const handleRevealDecision = async (decision: "ACCEPT" | "REFUSE") => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    await refugeSession.submitRevealConsent(decision);
    setIsSubmitting(false);
  };

  const handleAdopteSubmit = async () => {
    if (selectedMyActions.length !== 2 || isSubmitting) return;
    setIsSubmitting(true);
    const success = await refugeSession.submitDailyChoice(selectedMyActions);
    setIsSubmitting(false);
    if (success) resetDay();
  };

  const adoptantSubmitted = refugeSession.adoptantSubmittedToday;

  useEffect(() => {
    resetDay();
  }, [refugeSession.currentDay, resetDay]);

  const isWaitingForAdoptant = refugeSession.status === "WAITING_FOR_ADOPTANT" || refugeSession.status === "CREATION";
  const gauges = { happiness: 75, hunger: 45, energy: 60, cleanliness: 80 };
  const hearts = refugeSession.hearts;
  const companionAnimal = refugeSession.companion?.animalType;
  const actions: RefugeActionType[] = ["feed", "play", "pet", "wash"];

  const handleAdoptantSubmit = async () => {
    if (!refugeSession.adopteSubmittedToday || refugeSession.adoptantSubmittedToday || selectedGuessActions.length !== 2 || isSubmitting) return;
    setIsSubmitting(true);
    await refugeSession.submitGuess(selectedGuessActions);
    setIsSubmitting(false);
  };

  if (refugeSession.isLoading) {
    return <SafeAreaView style={[styles.container, styles.centerState]}><Text style={styles.loadingState}>Chargement...</Text></SafeAreaView>;
  }

  if (!sessionId || refugeSession.status === "ABANDONED") {
    return (
      <SafeAreaView style={[styles.container, styles.centerState]}>
        <Text style={styles.error}>Session terminée ou invalide</Text>
        <BouncyButton style={styles.button} onPress={() => router.replace("/refuge")}>
          <Text style={styles.buttonText}>Retour au refuge</Text>
        </BouncyButton>
      </SafeAreaView>
    );
  }

  if (refugeSession.status === "REVEALED") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <AppBackButton onPress={() => router.replace('/(tabs)/social')} />
          <View style={styles.headerContent}><Text style={styles.headerTitle}>Refuge terminé</Text></View>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
          <View style={styles.finalSummaryRow}>
            {refugeSession.dailyResults.map((r) => <RefugeDayResultIcon key={r.dayNumber} status={r.status} symbol={r.symbol} size={20} />)}
          </View>
          <RefugeRevealPhase
            sessionId={sessionId}
            currentUserId={currentUserId}
            status={refugeSession.status}
            reveal={refugeSession.reveal ?? { available: true, myDecision: "ACCEPT", otherDecided: true, revealedAt: null }}
            otherProfile={refugeSession.otherProfile}
            isSubmitting={isSubmitting}
            onDecision={handleRevealDecision}
            onViewProfile={(userId) => router.push(`/profile/${userId}` as never)}
            onExit={() => router.replace('/(tabs)/social')}
            animalType={refugeSession.companion?.animalType}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1, pointerEvents: showBackgroundPicker ? "none" : "auto" }}>
        <View style={styles.header}>
          <AppBackButton onPress={() => router.back()} />
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{refugeSession.role === "adopte" ? "Mon refuge" : "Mon compagnon"}</Text>
            {refugeSession.companion && (
              <Text style={styles.headerSubtitle}>{getAnimalLabel(refugeSession.companion.animalType)} • {formatAnimalAge(refugeSession.companion.animalAgeMonths)}</Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.heartsContainer}>
          {hearts.map((heart, idx) => <Text key={idx} style={styles.heart}>{heart}</Text>)}
        </View>

        <View style={[styles.refugeZone, getBackgroundGradientStyle(refugeSession.companion?.background)]}>
          <View style={styles.companionWrapper}>
            {isRefugeAnimal(companionAnimal) && <AnimalIllustration animal={companionAnimal} size={animalSize} />}
            <View style={[styles.groundShadow, { width: animalSize * 0.6 }]} />
          </View>
          <BouncyButton style={styles.backgroundSelectorButton} disabled={refugeSession.role === "adoptant"} onPress={() => setShowBackgroundPicker(true)}>
            <Text style={[styles.backgroundSelectorText, refugeSession.role === "adoptant" && { opacity: 0.5 }]}>🎨</Text>
          </BouncyButton>
        </View>

        <View style={styles.gaugesContainer}>
          <View style={styles.gaugeRow}>
            <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>❤️ Bonheur</Text><View style={styles.gaugeBar}><View style={[styles.gaugeFill, styles.gaugeFillHappiness, { width: `${gauges.happiness}%` }]} /></View></View>
            <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>🍖 Faim</Text><View style={styles.gaugeBar}><View style={[styles.gaugeFill, styles.gaugeFillHunger, { width: `${gauges.hunger}%` }]} /></View></View>
          </View>
          <View style={[styles.gaugeRow, { marginBottom: 0 }]}>
            <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>⚡ Énergie</Text><View style={styles.gaugeBar}><View style={[styles.gaugeFill, styles.gaugeFillEnergy, { width: `${gauges.energy}%` }]} /></View></View>
            <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>🧼 Propreté</Text><View style={styles.gaugeBar}><View style={[styles.gaugeFill, styles.gaugeFillCleanliness, { width: `${gauges.cleanliness}%` }]} /></View></View>
          </View>
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer}>
          {refugeSession.todayResult && (
            <View style={styles.todayResultContainer}>
              <Text style={styles.resultEmoji}>{refugeSession.todayResult.emoji}</Text>
              <Text style={styles.resultMessage}>{refugeSession.todayResult.message}{refugeSession.todayResult.reward > 0 && <Text style={styles.rewardText}>  +{refugeSession.todayResult.reward} pièces chacun</Text>}</Text>
            </View>
          )}

          {refugeSession.reveal?.available && (
            <RefugeRevealPhase
              sessionId={sessionId}
              currentUserId={currentUserId}
              status={refugeSession.status}
              reveal={refugeSession.reveal}
              otherProfile={refugeSession.otherProfile}
              isSubmitting={isSubmitting}
              onDecision={handleRevealDecision}
              onViewProfile={(userId) => router.push(`/profile/${userId}` as never)}
              onExit={() => router.replace('/(tabs)/social')}
              animalType={refugeSession.companion?.animalType}
            />
          )}

          {refugeSession.role === "adopte" && (
            <View style={styles.adopteCard}>
              {isWaitingForAdoptant ? (
                <><Text style={styles.questionText}>En attente d&apos;un adoptant...</Text><Text style={styles.loadingText}>Ton compagnon apparaîtra dans la liste des refuges disponibles. Le jeu commence dès qu&apos;il est adopté.</Text></>
              ) : (
                <>
                  <Text style={styles.questionText}>Que fait-on aujourd&apos;hui ?</Text>
                  {refugeSession.adopteSubmittedToday && refugeSession.todayActions ? (
                    <View style={styles.adoptActionsDisplay}>
                      <View style={styles.actionDisplay}><Text style={styles.actionDisplayIcon}>{BACKEND_ACTION_ICONS[refugeSession.todayActions.action1] ?? "🐾"}</Text><Text style={styles.actionDisplayLabel}>{BACKEND_ACTION_LABELS[refugeSession.todayActions.action1] ?? refugeSession.todayActions.action1}</Text></View>
                      <Text style={styles.actionSeparator}>et</Text>
                      <View style={styles.actionDisplay}><Text style={styles.actionDisplayIcon}>{BACKEND_ACTION_ICONS[refugeSession.todayActions.action2] ?? "🐾"}</Text><Text style={styles.actionDisplayLabel}>{BACKEND_ACTION_LABELS[refugeSession.todayActions.action2] ?? refugeSession.todayActions.action2}</Text></View>
                    </View>
                  ) : (
                    <View style={styles.actionGrid}>
                      {actions.map(action => (
                        <BouncyButton key={action} style={[styles.actionButton, selectedMyActions.includes(action) && styles.actionButtonSelected]} onPress={() => toggleMyAction(action)} disabled={selectedMyActions.length === 2 && !selectedMyActions.includes(action)}>
                          <Text style={styles.actionIcon}>{action === "feed" ? "🍖" : action === "play" ? "🎾" : action === "pet" ? "🤗" : "🧼"}</Text>
                          <Text style={[styles.actionLabel, selectedMyActions.includes(action) && styles.actionLabelSelected]}>{ACTION_LABELS[action]}</Text>
                        </BouncyButton>
                      ))}
                    </View>
                  )}
                  {!refugeSession.adopteSubmittedToday && selectedMyActions.length === 2 && (
                    <BouncyButton style={styles.validateButton} onPress={handleAdopteSubmit} disabled={isSubmitting}><Text style={styles.validateButtonText}>{isSubmitting ? "Envoi..." : "Valider"}</Text></BouncyButton>
                  )}
                </>
              )}
            </View>
          )}

          {refugeSession.role === "adoptant" && !isWaitingForAdoptant && (
            <View style={styles.adoptantCard}>
              {!refugeSession.adopteSubmittedToday ? (
                <><Text style={styles.questionText}>En attente des choix de ton compagnon…</Text><Text style={styles.loadingText}>Dès que l&apos;adopté aura choisi ses 2 actions, tu pourras faire tes propositions.</Text></>
              ) : (
                <>
                  <Text style={styles.questionText}>Que veut-il faire aujourd&apos;hui ?</Text>
                  <View style={styles.actionGrid}>
                    {actions.map(action => (
                      <BouncyButton key={action} style={[styles.actionButton, selectedGuessActions.includes(action) && styles.actionButtonSelected, adoptantSubmitted && styles.actionButtonDisabled]} onPress={() => !adoptantSubmitted && toggleGuessAction(action)} disabled={adoptantSubmitted || (selectedGuessActions.length === 2 && !selectedGuessActions.includes(action))}>
                        <Text style={styles.actionIcon}>{action === "feed" ? "🍖" : action === "play" ? "🎾" : action === "pet" ? "🤗" : "🧼"}</Text>
                        <Text style={[styles.actionLabel, selectedGuessActions.includes(action) && styles.actionLabelSelected]}>{ACTION_LABELS[action]}</Text>
                      </BouncyButton>
                    ))}
                  </View>
                  {adoptantSubmitted ? (
                    <View style={styles.submittedMessage}><Text style={styles.submittedMessageText}>Choix enregistré</Text></View>
                  ) : selectedGuessActions.length === 2 ? (
                    <BouncyButton style={styles.validateButton} onPress={handleAdoptantSubmit} disabled={isSubmitting}><Text style={styles.validateButtonText}>{isSubmitting ? "Envoi..." : "Valider"}</Text></BouncyButton>
                  ) : null}
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>

      <Modal visible={showBackgroundPicker} transparent animationType="slide" onRequestClose={() => setShowBackgroundPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personnaliser le refuge</Text>
              <BouncyButton style={styles.modalCloseButton} onPress={() => setShowBackgroundPicker(false)}><Text style={styles.modalCloseText}>✕</Text></BouncyButton>
            </View>
            <BackgroundPicker
              currentBackground={refugeSession.companion?.background ?? DEFAULT_REFUGE_BACKGROUND}
              onSelectBackground={async (background) => {
                const success = await refugeSession.changeBackground(background);
                if (success) setShowBackgroundPicker(false);
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
  container: { flex: 1, backgroundColor: "#F6F0E7" },
  centerState: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  loadingState: { fontSize: 15, color: "#765C3D", fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 62, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: "rgba(250,246,239,0.96)", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(112,82,48,0.20)" },
  headerContent: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontWeight: "800", color: "#302417", letterSpacing: 0.1 },
  headerSubtitle: { fontSize: 12, fontWeight: "500", color: "#8A7255", marginTop: 2 },
  headerSpacer: { width: 72 },
  heartsContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 7, marginHorizontal: 20, marginTop: 10, marginBottom: 9, paddingVertical: 7, paddingHorizontal: 14, backgroundColor: "rgba(255,252,247,0.78)", borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)" },
  heart: { fontSize: 24 },
  refugeZone: { flex: 0.5, maxHeight: 350, marginHorizontal: 16, marginBottom: 11, alignItems: "center", justifyContent: "center", position: "relative", minHeight: 280, overflow: "hidden", borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(101,72,42,0.18)", shadowColor: "#3D2B19", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.11, shadowRadius: 14, elevation: 4 },
  companionWrapper: { alignItems: "center", justifyContent: "center", position: "relative" },
  groundShadow: { height: 10, borderRadius: 999, backgroundColor: "rgba(49,35,22,0.10)", marginTop: -7, marginBottom: 8 },
  backgroundSelectorButton: { position: "absolute", top: 12, right: 12, width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,252,247,0.90)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(110,80,47,0.22)", justifyContent: "center", alignItems: "center", shadowColor: "#3D2B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  backgroundSelectorText: { fontSize: 21 },
  gaugesContainer: { backgroundColor: "rgba(255,252,247,0.90)", borderRadius: 18, paddingVertical: 12, paddingHorizontal: 15, marginHorizontal: 16, marginBottom: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)", shadowColor: "#3D2B19", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 7, elevation: 1 },
  gaugeRow: { flexDirection: "row", gap: 14, marginBottom: 10 },
  gaugeItem: { flex: 1, flexDirection: "column", gap: 5 },
  gaugeLabel: { fontSize: 11, color: "#6E573D", fontWeight: "600" },
  gaugeBar: { height: 5, backgroundColor: "rgba(117,91,64,0.14)", borderRadius: 999, overflow: "hidden" },
  gaugeFill: { height: "100%", borderRadius: 999 },
  gaugeFillHappiness: { backgroundColor: "#C8788C" },
  gaugeFillHunger: { backgroundColor: "#BD8357" },
  gaugeFillEnergy: { backgroundColor: "#B89A45" },
  gaugeFillCleanliness: { backgroundColor: "#7298A0" },
  contentScroll: { flex: 1 },
  contentContainer: { paddingHorizontal: 16, paddingTop: 7, paddingBottom: 30 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginBottom: 16 },
  actionButton: { width: "48%", minHeight: 70, paddingVertical: 11, paddingHorizontal: 8, backgroundColor: "#F4EBDD", borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(130,94,56,0.22)" },
  actionButtonSelected: { backgroundColor: "#8C3A46", borderColor: "#78303B" },
  actionButtonDisabled: { opacity: 0.52 },
  actionIcon: { fontSize: 24, marginBottom: 5 },
  actionLabel: { fontSize: 12, fontWeight: "700", color: "#3A2B1C", textAlign: "center" },
  actionLabelSelected: { color: "#FFFDF9" },
  adopteCard: { paddingVertical: 19, paddingHorizontal: 16, backgroundColor: "rgba(255,252,247,0.92)", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)", shadowColor: "#3D2B19", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 9, elevation: 2 },
  questionText: { fontSize: 15, fontWeight: "800", color: "#302417", textAlign: "center", marginBottom: 17 },
  adoptActionsDisplay: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 14 },
  actionDisplay: { alignItems: "center", justifyContent: "center", minWidth: 90, paddingVertical: 12, paddingHorizontal: 11, backgroundColor: "#F4EBDD", borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.16)" },
  actionDisplayIcon: { fontSize: 29, marginBottom: 6 },
  actionDisplayLabel: { fontSize: 13, fontWeight: "700", color: "#302417" },
  actionSeparator: { fontSize: 14, fontWeight: "600", color: "#8A7255" },
  loadingText: { fontSize: 13, lineHeight: 20, color: "#846D52", fontStyle: "italic", textAlign: "center" },
  adoptantCard: { paddingVertical: 19, paddingHorizontal: 16, backgroundColor: "rgba(255,252,247,0.92)", borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)", shadowColor: "#3D2B19", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 9, elevation: 2 },
  validateButton: { minWidth: 150, paddingVertical: 13, paddingHorizontal: 25, backgroundColor: "#8C3A46", borderRadius: 15, alignItems: "center", justifyContent: "center", shadowColor: "#4C1D25", shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.15, shadowRadius: 6, elevation: 3, alignSelf: "center" },
  validateButtonText: { fontSize: 14, fontWeight: "800", color: "#FFFDF9" },
  submittedMessage: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#EEF4EA", borderRadius: 13, borderWidth: StyleSheet.hairlineWidth, borderColor: "#C8D9C1", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 12 },
  submittedMessageText: { fontSize: 13, fontWeight: "700", color: "#52734C" },
  error: { fontSize: 16, color: "#963E50", textAlign: "center", marginBottom: 16, fontWeight: "700" },
  button: { paddingVertical: 13, paddingHorizontal: 24, backgroundColor: "#8C3A46", borderRadius: 15, alignItems: "center", alignSelf: "center" },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#FFFDF9" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(33,23,14,0.42)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FCF8F2", borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 32, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)", shadowColor: "#2E2014", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(122,88,51,0.18)" },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#302417" },
  modalCloseButton: { width: 36, height: 36, borderRadius: 18, justifyContent: "center", alignItems: "center", backgroundColor: "#F0E7DA", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.16)" },
  modalCloseText: { fontSize: 18, color: "#80694E", fontWeight: "700" },
  finalSummaryRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 11, marginBottom: 11, backgroundColor: "rgba(255,252,247,0.92)", borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)" },
  todayResultContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 10, paddingHorizontal: 13, marginBottom: 11, backgroundColor: "rgba(255,252,247,0.92)", borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.18)" },
  resultEmoji: { fontSize: 18 },
  resultMessage: { flexShrink: 1, fontSize: 13, fontWeight: "600", color: "#4A3928", textAlign: "center" },
  rewardText: { fontSize: 13, fontWeight: "800", color: "#9E6A1E" },
});