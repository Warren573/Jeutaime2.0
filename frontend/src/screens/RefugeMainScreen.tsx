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
  if (screenHeight < 700) return { animalSize: 205 };
  if (screenHeight < 800) return { animalSize: 235 };
  return { animalSize: 270 };
};

const ACTION_ICONS: Record<RefugeActionType, string> = {
  feed: "🍖",
  play: "🎾",
  pet: "🤗",
  wash: "🧼",
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
  const currentDay = Math.min(Math.max(refugeSession.currentDay || 1, 1), 7);

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
          <View style={styles.headerContent}>
            <Text style={styles.headerEyebrow}>LES 7 JOURS SONT ÉCOULÉS</Text>
            <Text style={styles.headerTitle}>Refuge terminé</Text>
          </View>
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
            <Text style={styles.headerEyebrow}>REFUGE TEMPORAIRE</Text>
            <Text style={styles.headerTitle}>Prenez soin l’un de l’autre</Text>
            {refugeSession.companion && (
              <Text style={styles.headerSubtitle}>{getAnimalLabel(refugeSession.companion.animalType)} · {formatAnimalAge(refugeSession.companion.animalAgeMonths)}</Text>
            )}
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView style={styles.contentScroll} contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.shelterFrame}>
            <View style={[styles.shelterWall, getBackgroundGradientStyle(refugeSession.companion?.background)]}>
              <View style={styles.wallWash} />
              <View style={styles.woodBeamTop} />
              <View style={styles.woodBeamLeft} />
              <View style={styles.woodBeamRight} />

              <View style={styles.shelfGroup} pointerEvents="none">
                <View style={styles.shelfObjectTall} />
                <View style={styles.shelfObjectShort} />
                <View style={styles.shelfPlank} />
              </View>

              <View style={styles.lampGroup} pointerEvents="none">
                <View style={styles.lampGlow} />
                <View style={styles.lampShade} />
                <View style={styles.lampStem} />
              </View>

              <View style={styles.dayNotebook}>
                <Text style={styles.notebookPin}>•</Text>
                <Text style={styles.notebookTitle}>Nos 7 jours</Text>
                <View style={styles.dayMarksRow}>
                  {Array.from({ length: 7 }, (_, index) => {
                    const day = index + 1;
                    const result = refugeSession.dailyResults.find((item) => item.dayNumber === day);
                    const isPast = day < currentDay;
                    const isToday = day === currentDay;
                    return (
                      <View key={day} style={[styles.dayMark, isToday && styles.dayMarkToday, isPast && styles.dayMarkPast]}>
                        {result ? (
                          <RefugeDayResultIcon status={result.status} symbol={result.symbol} size={16} />
                        ) : (
                          <Text style={[styles.dayMarkText, isToday && styles.dayMarkTextToday]}>{day}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
                <Text style={styles.notebookCaption}>Jour {currentDay} sur 7</Text>
              </View>

              <View style={styles.companionArea}>
                <View style={styles.blanketBack} />
                <View style={styles.companionWrapper}>
                  {isRefugeAnimal(companionAnimal) && <AnimalIllustration animal={companionAnimal} size={animalSize} />}
                  <View style={[styles.groundShadow, { width: animalSize * 0.58 }]} />
                </View>
                <View style={styles.foodBowl} pointerEvents="none">
                  <View style={styles.foodBowlLip} />
                </View>
                <View style={styles.crate} pointerEvents="none">
                  <View style={styles.crateSlat} />
                  <View style={[styles.crateSlat, styles.crateSlatMiddle]} />
                </View>
              </View>

              <BouncyButton style={styles.backgroundSelectorButton} disabled={refugeSession.role === "adoptant"} onPress={() => setShowBackgroundPicker(true)}>
                <Text style={[styles.backgroundSelectorText, refugeSession.role === "adoptant" && styles.disabledText]}>✎</Text>
              </BouncyButton>
            </View>

            <View style={styles.heartRibbon}>
              <Text style={styles.heartRibbonLabel}>LIEN</Text>
              <View style={styles.heartsContainer}>
                {hearts.map((heart, idx) => <Text key={idx} style={styles.heart}>{heart}</Text>)}
              </View>
            </View>
          </View>

          <View style={styles.notePaper}>
            <Text style={styles.notePaperTitle}>Comment va le refuge ?</Text>
            <View style={styles.gaugeRow}>
              <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>♡ Bonheur</Text><View style={styles.gaugeTrack}><View style={[styles.gaugeFill, styles.gaugeFillHappiness, { width: `${gauges.happiness}%` }]} /></View></View>
              <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>♨ Faim</Text><View style={styles.gaugeTrack}><View style={[styles.gaugeFill, styles.gaugeFillHunger, { width: `${gauges.hunger}%` }]} /></View></View>
            </View>
            <View style={styles.gaugeRow}>
              <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>⌁ Énergie</Text><View style={styles.gaugeTrack}><View style={[styles.gaugeFill, styles.gaugeFillEnergy, { width: `${gauges.energy}%` }]} /></View></View>
              <View style={styles.gaugeItem}><Text style={styles.gaugeLabel}>✦ Propreté</Text><View style={styles.gaugeTrack}><View style={[styles.gaugeFill, styles.gaugeFillCleanliness, { width: `${gauges.cleanliness}%` }]} /></View></View>
            </View>
          </View>

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
            <View style={styles.dailyPaper}>
              <View style={styles.paperTape} />
              <Text style={styles.dailyPaperKicker}>LE PETIT RITUEL DU JOUR</Text>
              {isWaitingForAdoptant ? (
                <>
                  <Text style={styles.questionText}>En attente d’un adoptant...</Text>
                  <Text style={styles.loadingText}>Ton compagnon attend ici au chaud. Le jeu commencera dès qu’il aura trouvé quelqu’un pour l’accompagner.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.questionText}>Que fait-on aujourd’hui ?</Text>
                  <Text style={styles.questionHint}>Choisis deux petits moments à partager.</Text>
                  {refugeSession.adopteSubmittedToday && refugeSession.todayActions ? (
                    <View style={styles.adoptActionsDisplay}>
                      <View style={styles.actionDisplay}><Text style={styles.actionDisplayIcon}>{BACKEND_ACTION_ICONS[refugeSession.todayActions.action1] ?? "🐾"}</Text><Text style={styles.actionDisplayLabel}>{BACKEND_ACTION_LABELS[refugeSession.todayActions.action1] ?? refugeSession.todayActions.action1}</Text></View>
                      <Text style={styles.actionSeparator}>+</Text>
                      <View style={styles.actionDisplay}><Text style={styles.actionDisplayIcon}>{BACKEND_ACTION_ICONS[refugeSession.todayActions.action2] ?? "🐾"}</Text><Text style={styles.actionDisplayLabel}>{BACKEND_ACTION_LABELS[refugeSession.todayActions.action2] ?? refugeSession.todayActions.action2}</Text></View>
                    </View>
                  ) : (
                    <View style={styles.actionGrid}>
                      {actions.map(action => (
                        <BouncyButton key={action} style={[styles.actionTag, selectedMyActions.includes(action) && styles.actionTagSelected]} onPress={() => toggleMyAction(action)} disabled={selectedMyActions.length === 2 && !selectedMyActions.includes(action)}>
                          <Text style={styles.actionIcon}>{ACTION_ICONS[action]}</Text>
                          <Text style={[styles.actionLabel, selectedMyActions.includes(action) && styles.actionLabelSelected]}>{ACTION_LABELS[action]}</Text>
                        </BouncyButton>
                      ))}
                    </View>
                  )}
                  {!refugeSession.adopteSubmittedToday && selectedMyActions.length === 2 && (
                    <BouncyButton style={styles.validateButton} onPress={handleAdopteSubmit} disabled={isSubmitting}><Text style={styles.validateButtonText}>{isSubmitting ? "Envoi..." : "Noter ces deux moments"}</Text></BouncyButton>
                  )}
                </>
              )}
            </View>
          )}

          {refugeSession.role === "adoptant" && !isWaitingForAdoptant && (
            <View style={styles.dailyPaper}>
              <View style={styles.paperTape} />
              <Text style={styles.dailyPaperKicker}>À TOI DE LE DEVINER</Text>
              {!refugeSession.adopteSubmittedToday ? (
                <>
                  <Text style={styles.questionText}>Ton compagnon réfléchit encore…</Text>
                  <Text style={styles.loadingText}>Dès qu’il aura choisi ses deux moments du jour, tu pourras essayer de les deviner.</Text>
                </>
              ) : (
                <>
                  <Text style={styles.questionText}>Que veut-il faire aujourd’hui ?</Text>
                  <Text style={styles.questionHint}>Choisis les deux gestes qui lui ressemblent le plus.</Text>
                  <View style={styles.actionGrid}>
                    {actions.map(action => (
                      <BouncyButton key={action} style={[styles.actionTag, selectedGuessActions.includes(action) && styles.actionTagSelected, adoptantSubmitted && styles.actionTagDisabled]} onPress={() => !adoptantSubmitted && toggleGuessAction(action)} disabled={adoptantSubmitted || (selectedGuessActions.length === 2 && !selectedGuessActions.includes(action))}>
                        <Text style={styles.actionIcon}>{ACTION_ICONS[action]}</Text>
                        <Text style={[styles.actionLabel, selectedGuessActions.includes(action) && styles.actionLabelSelected]}>{ACTION_LABELS[action]}</Text>
                      </BouncyButton>
                    ))}
                  </View>
                  {adoptantSubmitted ? (
                    <View style={styles.submittedMessage}><Text style={styles.submittedMessageText}>Choix noté pour aujourd’hui</Text></View>
                  ) : selectedGuessActions.length === 2 ? (
                    <BouncyButton style={styles.validateButton} onPress={handleAdoptantSubmit} disabled={isSubmitting}><Text style={styles.validateButtonText}>{isSubmitting ? "Envoi..." : "Noter mes réponses"}</Text></BouncyButton>
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
              <View>
                <Text style={styles.modalKicker}>LE PETIT ABRI</Text>
                <Text style={styles.modalTitle}>Changer l’ambiance</Text>
              </View>
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
  container: { flex: 1, backgroundColor: "#EFE6D7" },
  centerState: { alignItems: "center", justifyContent: "center", paddingHorizontal: 24 },
  loadingState: { fontSize: 15, color: "#765C3D", fontWeight: "600" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", minHeight: 76, paddingHorizontal: 16, paddingVertical: 9, backgroundColor: "#F5EEDF", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(91,61,34,0.23)" },
  headerContent: { flex: 1, alignItems: "center", paddingHorizontal: 6 },
  headerEyebrow: { fontSize: 9, fontWeight: "900", letterSpacing: 1.8, color: "#8C3A46", marginBottom: 3 },
  headerTitle: { fontSize: 17, fontWeight: "800", color: "#302417", letterSpacing: 0.1 },
  headerSubtitle: { fontSize: 11, fontWeight: "500", color: "#8A7255", marginTop: 3 },
  headerSpacer: { width: 54 },
  contentScroll: { flex: 1 },
  contentContainer: { paddingHorizontal: 14, paddingTop: 13, paddingBottom: 34 },

  shelterFrame: { marginBottom: 15, position: "relative" },
  shelterWall: { minHeight: 390, borderRadius: 8, overflow: "hidden", position: "relative", borderWidth: 1, borderColor: "rgba(77,49,27,0.28)", shadowColor: "#402A18", shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.13, shadowRadius: 10, elevation: 4 },
  wallWash: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(219,194,158,0.30)" },
  woodBeamTop: { position: "absolute", left: 0, right: 0, top: 0, height: 16, backgroundColor: "rgba(91,59,33,0.42)", borderBottomWidth: 1, borderBottomColor: "rgba(66,42,22,0.24)" },
  woodBeamLeft: { position: "absolute", left: 0, top: 0, bottom: 0, width: 11, backgroundColor: "rgba(91,59,33,0.30)" },
  woodBeamRight: { position: "absolute", right: 0, top: 0, bottom: 0, width: 11, backgroundColor: "rgba(91,59,33,0.30)" },
  shelfGroup: { position: "absolute", top: 60, left: 25, width: 86, height: 52 },
  shelfPlank: { position: "absolute", left: 0, right: 0, bottom: 4, height: 7, borderRadius: 2, backgroundColor: "rgba(90,58,31,0.72)" },
  shelfObjectTall: { position: "absolute", left: 12, bottom: 11, width: 15, height: 29, borderRadius: 2, backgroundColor: "rgba(117,73,52,0.48)", transform: [{ rotate: "-3deg" }] },
  shelfObjectShort: { position: "absolute", left: 31, bottom: 11, width: 22, height: 20, borderRadius: 2, backgroundColor: "rgba(190,164,125,0.72)" },
  lampGroup: { position: "absolute", top: 46, right: 25, width: 65, height: 75, alignItems: "center" },
  lampGlow: { position: "absolute", top: -7, width: 66, height: 66, borderRadius: 33, backgroundColor: "rgba(235,197,115,0.18)" },
  lampShade: { width: 38, height: 25, borderTopLeftRadius: 18, borderTopRightRadius: 18, borderBottomLeftRadius: 5, borderBottomRightRadius: 5, backgroundColor: "rgba(211,178,112,0.74)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(100,65,35,0.25)" },
  lampStem: { width: 3, height: 38, backgroundColor: "rgba(77,51,32,0.58)" },

  dayNotebook: { position: "absolute", zIndex: 5, top: 35, alignSelf: "center", width: 174, paddingTop: 15, paddingBottom: 10, paddingHorizontal: 11, backgroundColor: "rgba(250,244,228,0.96)", borderRadius: 3, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(95,68,38,0.30)", transform: [{ rotate: "-1deg" }], shadowColor: "#4B321E", shadowOffset: { width: 1, height: 3 }, shadowOpacity: 0.10, shadowRadius: 5, elevation: 2 },
  notebookPin: { position: "absolute", top: -10, alignSelf: "center", fontSize: 25, color: "#7A3942", lineHeight: 25 },
  notebookTitle: { fontSize: 12, fontWeight: "800", color: "#44301F", textAlign: "center", marginBottom: 9 },
  dayMarksRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  dayMark: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(101,75,47,0.25)", backgroundColor: "rgba(255,252,243,0.78)" },
  dayMarkToday: { backgroundColor: "#8C3A46", borderColor: "#8C3A46", transform: [{ scale: 1.14 }] },
  dayMarkPast: { backgroundColor: "rgba(219,204,177,0.65)" },
  dayMarkText: { fontSize: 9, fontWeight: "700", color: "#6B563D" },
  dayMarkTextToday: { color: "#FFF9F0" },
  notebookCaption: { fontSize: 9, fontWeight: "600", color: "#8A7255", textAlign: "right", marginTop: 7, fontStyle: "italic" },

  companionArea: { flex: 1, minHeight: 390, alignItems: "center", justifyContent: "flex-end", paddingBottom: 21, paddingTop: 125, position: "relative" },
  companionWrapper: { alignItems: "center", justifyContent: "flex-end", position: "relative", zIndex: 3 },
  blanketBack: { position: "absolute", bottom: 24, alignSelf: "center", width: 245, height: 62, borderTopLeftRadius: 105, borderTopRightRadius: 105, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: "rgba(129,70,71,0.25)", borderWidth: 1, borderColor: "rgba(99,56,54,0.16)", transform: [{ rotate: "-2deg" }] },
  groundShadow: { height: 9, borderRadius: 999, backgroundColor: "rgba(49,35,22,0.12)", marginTop: -8 },
  foodBowl: { position: "absolute", left: 37, bottom: 27, width: 54, height: 21, borderBottomLeftRadius: 18, borderBottomRightRadius: 18, backgroundColor: "rgba(121,78,49,0.63)", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(72,46,29,0.35)" },
  foodBowlLip: { position: "absolute", left: -4, right: -4, top: -3, height: 6, borderRadius: 5, backgroundColor: "rgba(150,104,67,0.78)" },
  crate: { position: "absolute", right: 27, bottom: 22, width: 62, height: 49, borderWidth: 4, borderColor: "rgba(93,59,30,0.52)", backgroundColor: "rgba(173,128,78,0.24)", transform: [{ rotate: "2deg" }] },
  crateSlat: { position: "absolute", left: 4, right: 4, top: 11, height: 4, backgroundColor: "rgba(93,59,30,0.42)" },
  crateSlatMiddle: { top: 26 },
  backgroundSelectorButton: { position: "absolute", zIndex: 8, right: 21, top: 128, width: 35, height: 35, borderRadius: 3, backgroundColor: "rgba(248,239,218,0.94)", borderWidth: 1, borderColor: "rgba(103,73,43,0.28)", justifyContent: "center", alignItems: "center", transform: [{ rotate: "2deg" }] },
  backgroundSelectorText: { fontSize: 17, fontWeight: "800", color: "#6D5035" },
  disabledText: { opacity: 0.38 },

  heartRibbon: { minHeight: 46, marginHorizontal: 19, marginTop: -12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "#F7EFDE", borderWidth: 1, borderColor: "rgba(91,61,34,0.21)", shadowColor: "#49311C", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2, transform: [{ rotate: "-0.6deg" }] },
  heartRibbonLabel: { fontSize: 9, fontWeight: "900", letterSpacing: 1.5, color: "#7B6650", marginRight: 11 },
  heartsContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 5 },
  heart: { fontSize: 20 },

  notePaper: { marginHorizontal: 3, marginBottom: 14, paddingTop: 17, paddingBottom: 13, paddingHorizontal: 16, backgroundColor: "#F8F1E3", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(103,74,43,0.26)", shadowColor: "#49311C", shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.07, shadowRadius: 4, elevation: 1, transform: [{ rotate: "0.4deg" }] },
  notePaperTitle: { fontSize: 11, fontWeight: "800", color: "#54402D", marginBottom: 12, fontStyle: "italic" },
  gaugeRow: { flexDirection: "row", gap: 17, marginBottom: 10 },
  gaugeItem: { flex: 1, gap: 5 },
  gaugeLabel: { fontSize: 10, color: "#66503A", fontWeight: "700" },
  gaugeTrack: { height: 4, backgroundColor: "rgba(117,91,64,0.14)", borderRadius: 1, overflow: "hidden" },
  gaugeFill: { height: "100%" },
  gaugeFillHappiness: { backgroundColor: "#A45662" },
  gaugeFillHunger: { backgroundColor: "#A97048" },
  gaugeFillEnergy: { backgroundColor: "#9C8440" },
  gaugeFillCleanliness: { backgroundColor: "#6F8A89" },

  todayResultContainer: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 14, marginHorizontal: 3, marginBottom: 14, backgroundColor: "rgba(248,241,227,0.92)", borderLeftWidth: 3, borderLeftColor: "#8C3A46", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(103,74,43,0.20)" },
  resultEmoji: { fontSize: 18 },
  resultMessage: { flexShrink: 1, fontSize: 12, lineHeight: 17, fontWeight: "600", color: "#4A3928", textAlign: "center" },
  rewardText: { fontSize: 12, fontWeight: "800", color: "#9E6A1E" },

  dailyPaper: { marginTop: 2, marginHorizontal: 3, paddingTop: 27, paddingBottom: 22, paddingHorizontal: 17, backgroundColor: "#FCF6E9", borderWidth: 1, borderColor: "rgba(109,77,43,0.24)", shadowColor: "#49311C", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.09, shadowRadius: 7, elevation: 2, position: "relative", transform: [{ rotate: "-0.3deg" }] },
  paperTape: { position: "absolute", top: -8, alignSelf: "center", width: 79, height: 18, backgroundColor: "rgba(213,194,158,0.67)", transform: [{ rotate: "1deg" }] },
  dailyPaperKicker: { fontSize: 9, fontWeight: "900", letterSpacing: 1.7, color: "#8C3A46", textAlign: "center", marginBottom: 8 },
  questionText: { fontSize: 17, fontWeight: "800", color: "#302417", textAlign: "center", marginBottom: 5 },
  questionHint: { fontSize: 11, lineHeight: 16, fontWeight: "500", color: "#8A7255", textAlign: "center", marginBottom: 17, fontStyle: "italic" },
  loadingText: { fontSize: 13, lineHeight: 20, color: "#846D52", fontStyle: "italic", textAlign: "center", marginTop: 8 },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: 10, marginTop: 12, marginBottom: 17 },
  actionTag: { width: "48%", minHeight: 68, paddingVertical: 10, paddingHorizontal: 8, backgroundColor: "#EFE2C9", borderRadius: 3, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(123,86,51,0.29)", shadowColor: "#4E351F", shadowOffset: { width: 1, height: 2 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  actionTagSelected: { backgroundColor: "#8C3A46", borderColor: "#78303B", transform: [{ rotate: "-1deg" }] },
  actionTagDisabled: { opacity: 0.48 },
  actionIcon: { fontSize: 23, marginBottom: 5 },
  actionLabel: { fontSize: 12, fontWeight: "800", color: "#3A2B1C", textAlign: "center" },
  actionLabelSelected: { color: "#FFF9EF" },
  adoptActionsDisplay: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, marginTop: 15 },
  actionDisplay: { alignItems: "center", justifyContent: "center", minWidth: 98, paddingVertical: 12, paddingHorizontal: 11, backgroundColor: "#EFE2C9", borderRadius: 3, borderWidth: 1, borderColor: "rgba(123,86,51,0.23)" },
  actionDisplayIcon: { fontSize: 28, marginBottom: 6 },
  actionDisplayLabel: { fontSize: 12, fontWeight: "800", color: "#302417" },
  actionSeparator: { fontSize: 18, fontWeight: "500", color: "#8A7255" },
  validateButton: { minWidth: 188, paddingVertical: 13, paddingHorizontal: 24, backgroundColor: "#8C3A46", borderRadius: 3, alignItems: "center", justifyContent: "center", shadowColor: "#4C1D25", shadowOffset: { width: 1, height: 3 }, shadowOpacity: 0.14, shadowRadius: 4, elevation: 2, alignSelf: "center" },
  validateButtonText: { fontSize: 13, fontWeight: "800", color: "#FFF9EF" },
  submittedMessage: { paddingVertical: 10, paddingHorizontal: 20, backgroundColor: "#E8E9D9", borderWidth: 1, borderColor: "#C6C6AA", alignItems: "center", justifyContent: "center", alignSelf: "center", marginTop: 12 },
  submittedMessageText: { fontSize: 12, fontWeight: "700", color: "#5C694C" },

  error: { fontSize: 16, color: "#963E50", textAlign: "center", marginBottom: 16, fontWeight: "700" },
  button: { paddingVertical: 13, paddingHorizontal: 24, backgroundColor: "#8C3A46", borderRadius: 3, alignItems: "center", alignSelf: "center" },
  buttonText: { fontSize: 14, fontWeight: "700", color: "#FFFDF9" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(33,23,14,0.46)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#F6EEDD", borderTopLeftRadius: 18, borderTopRightRadius: 18, paddingBottom: 32, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.22)", shadowColor: "#2E2014", shadowOffset: { width: 0, height: -5 }, shadowOpacity: 0.10, shadowRadius: 14, elevation: 8 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(122,88,51,0.18)" },
  modalKicker: { fontSize: 9, letterSpacing: 1.5, fontWeight: "900", color: "#8C3A46", marginBottom: 2 },
  modalTitle: { fontSize: 17, fontWeight: "800", color: "#302417" },
  modalCloseButton: { width: 36, height: 36, borderRadius: 3, justifyContent: "center", alignItems: "center", backgroundColor: "#E9DDC8", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.20)" },
  modalCloseText: { fontSize: 17, color: "#80694E", fontWeight: "700" },
  finalSummaryRow: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6, paddingVertical: 12, marginBottom: 12, backgroundColor: "#F8F1E3", borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(122,88,51,0.20)" },
});