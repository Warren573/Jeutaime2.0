import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { REFUGE_BACKGROUND_DATA_URI } from '../assets/refugeBackgroundData';
import { useStore } from '../store/useStore';
import { AnimalIllustration } from '../components/AnimalIllustration';
import { RefugeRevealPhase } from '../components/RefugeRevealPhase';
import { isRefugeAnimal } from '../data/refugeAnimals';
import { type RefugeActionType } from '../data/refugeActions';
import { useRefugeDailyChoices } from '../hooks/useRefugeDailyChoices';
import { useRefugeSession } from '../hooks/useRefugeSession';

const ACTIONS: Array<{ key: RefugeActionType; title: string; subtitle: string; mark: string }> = [
  { key: 'feed', title: 'Nourrir', subtitle: 'Remplit son ventre', mark: '◉' },
  { key: 'pet', title: 'Câliner', subtitle: "Lui donner de l’affection", mark: '♡' },
  { key: 'wash', title: 'Nettoyer', subtitle: 'Prendre soin de sa propreté', mark: '✧' },
  { key: 'play', title: 'Jouer', subtitle: 'Partager un moment fun', mark: '◌' },
];

const GAUGES = [
  { label: 'Bonheur', mark: '♥', value: 72, tone: '#8C3542' },
  { label: 'Faim', mark: '◉', value: 54, tone: '#A55B20' },
  { label: 'Énergie', mark: 'ϟ', value: 61, tone: '#B8860B' },
  { label: 'Propreté', mark: '✦', value: 77, tone: '#4E7772' },
];

export function RefugeIllustratedScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { currentUser } = useStore();
  const currentUserId = currentUser?.id ?? null;
  const refuge = useRefugeSession(sessionIdProp);
  const {
    selectedMyActions,
    selectedGuessActions,
    toggleMyAction,
    toggleGuessAction,
    resetDay,
  } = useRefugeDailyChoices();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const artWidth = Math.min(width, 520);
  const artHeight = artWidth * 2.02;
  const animalSize = Math.min(220, artWidth * 0.48);
  const currentDay = Math.min(Math.max(refuge.currentDay || 1, 1), 7);
  const isWaiting = refuge.status === 'WAITING_FOR_ADOPTANT' || refuge.status === 'CREATION';
  const selected = refuge.role === 'adoptant' ? selectedGuessActions : selectedMyActions;
  const disabled = isWaiting || isSubmitting ||
    (refuge.role === 'adopte' && refuge.adopteSubmittedToday) ||
    (refuge.role === 'adoptant' && refuge.adoptantSubmittedToday);

  useEffect(() => {
    resetDay();
  }, [refuge.currentDay, resetDay]);

  const handleAction = (action: RefugeActionType) => {
    if (disabled) return;
    if (refuge.role === 'adoptant') {
      if (!refuge.adopteSubmittedToday) return;
      toggleGuessAction(action);
    } else if (refuge.role === 'adopte') {
      toggleMyAction(action);
    }
  };

  const submit = async () => {
    if (isSubmitting || selected.length !== 2) return;
    setIsSubmitting(true);
    try {
      if (refuge.role === 'adoptant') await refuge.submitGuess(selectedGuessActions);
      else await refuge.submitDailyChoice(selectedMyActions);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevealDecision = async (decision: 'ACCEPT' | 'REFUSE') => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await refuge.submitRevealConsent(decision);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (refuge.isLoading) {
    return (
      <SafeAreaView style={styles.loading}>
        <ActivityIndicator />
        <Text style={styles.loadingText}>Chargement du refuge…</Text>
      </SafeAreaView>
    );
  }

  if (!sessionIdProp || refuge.status === 'ABANDONED') {
    return (
      <SafeAreaView style={styles.loading}>
        <Text style={styles.error}>Session terminée ou invalide</Text>
        <TouchableOpacity style={styles.fallbackButton} onPress={() => router.replace('/refuge')}>
          <Text style={styles.fallbackButtonText}>Retour au refuge</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (refuge.status === 'REVEALED') {
    return (
      <SafeAreaView style={styles.revealContainer}>
        <TouchableOpacity style={styles.revealBack} onPress={() => router.replace('/(tabs)/social')}>
          <Text style={styles.revealBackText}>← Retour</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.revealContent}>
          <RefugeRevealPhase
            sessionId={sessionIdProp}
            currentUserId={currentUserId}
            status={refuge.status}
            reveal={refuge.reveal ?? { available: true, myDecision: 'ACCEPT', otherDecided: true, revealedAt: null }}
            otherProfile={refuge.otherProfile}
            isSubmitting={isSubmitting}
            onDecision={handleRevealDecision}
            onViewProfile={(userId) => router.push(`/profile/${userId}` as never)}
            onExit={() => router.replace('/(tabs)/social')}
            animalType={refuge.companion?.animalType}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const statusTitle = isWaiting
    ? "En attente d’un adoptant…"
    : refuge.role === 'adoptant'
      ? refuge.adopteSubmittedToday
        ? 'À toi de le deviner…'
        : 'Ton compagnon réfléchit encore…'
      : refuge.adopteSubmittedToday
        ? 'Tes choix sont notés pour aujourd’hui'
        : 'Le petit rituel du jour';

  const statusBody = isWaiting
    ? 'Ton compagnon apparaîtra dans la liste des refuges disponibles. Le jeu commence dès qu’il est adopté.'
    : refuge.role === 'adoptant'
      ? refuge.adopteSubmittedToday
        ? 'Choisis les deux gestes qui lui ressemblent le plus.'
        : 'Dès que ses choix sont faits, tu pourras essayer de les deviner.'
      : refuge.adopteSubmittedToday
        ? 'Il ne reste plus qu’à attendre la réponse de ton compagnon.'
        : 'Choisis deux petits moments à partager aujourd’hui.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.scene, { width: artWidth, height: artHeight }]}> 
          <ImageBackground
            source={{ uri: REFUGE_BACKGROUND_DATA_URI }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            imageStyle={styles.backgroundImage}
          />
          <View style={styles.warmVeil} pointerEvents="none" />

          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backText}>← Retour</Text>
          </TouchableOpacity>

          <View style={styles.titleArea} pointerEvents="none">
            <Text style={styles.title}>Mon refuge</Text>
            <View style={styles.titleOrnament}><View style={styles.ornamentLine} /><Text style={styles.ornamentHeart}>♥</Text><View style={styles.ornamentLine} /></View>
            <Text style={styles.subtitle}>Prenez soin l’un de l’autre pendant 7 jours</Text>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.ringsRow} pointerEvents="none">
              {Array.from({ length: 9 }, (_, i) => <View key={i} style={styles.ring} />)}
            </View>
            <Text style={styles.calendarTitle}>Nos 7 jours ensemble ♥</Text>
            <View style={styles.daysRow}>
              {Array.from({ length: 7 }, (_, index) => {
                const day = index + 1;
                const done = day < currentDay;
                const today = day === currentDay;
                return (
                  <View key={day} style={styles.dayCell}>
                    <Text style={[styles.dayNumber, today && styles.dayNumberToday]}>{day}</Text>
                    <Text style={[styles.dayMark, done && styles.dayDone, today && styles.dayToday]}>{done ? '♥' : today ? '◐' : '♡'}</Text>
                  </View>
                );
              })}
            </View>
            <Text style={styles.dayCaption}>Jour {currentDay} sur 7</Text>
          </View>

          <View style={styles.missionNote}>
            <View style={styles.tape} />
            <Text style={styles.missionTitle}>Petite mission{`\n`}du jour ♥</Text>
            <Text style={styles.missionText}>Faites-lui plaisir{`\n`}et gagnez des{`\n`}cœurs !</Text>
            <Text style={styles.missionHeart}>♡</Text>
          </View>

          <View style={styles.animalLayer} pointerEvents="none">
            {isRefugeAnimal(refuge.companion?.animalType) && (
              <AnimalIllustration animal={refuge.companion.animalType} size={animalSize} />
            )}
          </View>

          <View style={styles.linkStrip}>
            <Text style={styles.linkLabel}>LIEN</Text>
            <View style={styles.linkHearts}>
              {(refuge.hearts ?? ['🤍','🤍','🤍','🤍','🤍','🤍','🤍']).slice(0, 7).map((heart, index) => (
                <Text key={index} style={styles.linkHeart}>{heart === '❤️' ? '♥' : heart === '🤍' ? '♡' : heart}</Text>
              ))}
            </View>
          </View>

          <View style={styles.gaugePaper}>
            <Text style={styles.gaugeHeading}>Comment va le refuge ?</Text>
            <View style={styles.gaugeGrid}>
              {GAUGES.map((gauge) => (
                <View key={gauge.label} style={styles.gaugeItem}>
                  <View style={styles.gaugeLabelRow}>
                    <Text style={[styles.gaugeMark, { color: gauge.tone }]}>{gauge.mark}</Text>
                    <Text style={styles.gaugeLabel}>{gauge.label}</Text>
                  </View>
                  <View style={styles.track}><View style={[styles.fill, { width: `${gauge.value}%`, backgroundColor: gauge.tone }]} /></View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.actionsRow}>
            {ACTIONS.map((action) => {
              const active = selected.includes(action.key);
              return (
                <TouchableOpacity
                  key={action.key}
                  activeOpacity={0.82}
                  disabled={disabled}
                  onPress={() => handleAction(action.key)}
                  style={[styles.tag, active && styles.tagSelected, disabled && !isWaiting && styles.tagDisabled]}
                >
                  <View style={styles.tagHole} />
                  <View style={styles.tagString} />
                  <Text style={[styles.tagMark, active && styles.tagMarkSelected]}>{action.mark}</Text>
                  <Text style={styles.tagTitle}>{action.title}</Text>
                  <Text style={styles.tagSubtitle}>{action.subtitle}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.statusPaper}>
            <View style={styles.statusTape} />
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <Text style={styles.statusBody}>{statusBody}</Text>
            {!isWaiting && selected.length === 2 && !disabled && (
              <TouchableOpacity style={styles.validateButton} onPress={submit} disabled={isSubmitting}>
                <Text style={styles.validateText}>{isSubmitting ? 'Envoi…' : 'Valider mes 2 choix'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const parchment = '#E8CFA6';
const ink = '#4A2B1C';
const burgundy = '#8A2F3C';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#28170E' },
  scrollContent: { alignItems: 'center', backgroundColor: '#28170E', paddingBottom: 12 },
  scene: { position: 'relative', overflow: 'hidden', backgroundColor: '#7A5131' },
  backgroundImage: { opacity: 0.72 },
  warmVeil: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(90,45,15,0.10)' },

  backButton: { position: 'absolute', top: '3.2%', left: '4%', zIndex: 20, paddingVertical: 8, paddingHorizontal: 7 },
  backText: { color: burgundy, fontSize: 20, fontFamily: 'Georgia', fontWeight: '700', textShadowColor: 'rgba(255,240,210,.5)', textShadowRadius: 2 },
  titleArea: { position: 'absolute', top: '2.6%', left: '25%', width: '55%', alignItems: 'center', zIndex: 10 },
  title: { color: burgundy, fontFamily: 'Georgia', fontSize: 31, lineHeight: 36 },
  titleOrnament: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  ornamentLine: { height: 1, width: 35, backgroundColor: burgundy, opacity: .7 },
  ornamentHeart: { color: burgundy, fontSize: 13 },
  subtitle: { color: ink, fontFamily: 'Georgia', fontSize: 11, marginTop: 3, textAlign: 'center' },

  calendarCard: { position: 'absolute', top: '12.2%', left: '29%', width: '44%', height: '15.5%', backgroundColor: parchment, borderRadius: 4, borderWidth: 1, borderColor: '#AE8458', paddingHorizontal: 14, paddingTop: 23, shadowColor: '#231308', shadowOpacity: .34, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5, zIndex: 8 },
  ringsRow: { position: 'absolute', top: -9, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between' },
  ring: { width: 5, height: 19, borderRadius: 4, borderWidth: 2, borderColor: '#4A3525', backgroundColor: '#B78A57' },
  calendarTitle: { textAlign: 'center', color: ink, fontFamily: 'Georgia', fontSize: 16, marginBottom: 8 },
  daysRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayCell: { flex: 1, alignItems: 'center' },
  dayNumber: { color: ink, fontFamily: 'Georgia', fontSize: 14, fontWeight: '600' },
  dayNumberToday: { color: burgundy, fontWeight: '900' },
  dayMark: { color: '#9E876C', fontSize: 18, lineHeight: 22 },
  dayDone: { color: burgundy },
  dayToday: { color: burgundy },
  dayCaption: { color: '#6E4B32', fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 11, textAlign: 'right', marginTop: 4 },

  missionNote: { position: 'absolute', top: '12.2%', right: '3%', width: '20%', minHeight: '13.5%', backgroundColor: '#E5C693', paddingHorizontal: 7, paddingVertical: 15, transform: [{ rotate: '1.5deg' }], shadowColor: '#2D180B', shadowOpacity: .25, shadowRadius: 3, shadowOffset: { width: 1, height: 2 }, zIndex: 9 },
  tape: { position: 'absolute', top: -6, left: '34%', width: '33%', height: 13, backgroundColor: 'rgba(196,154,102,.72)', transform: [{ rotate: '-3deg' }] },
  missionTitle: { color: ink, textAlign: 'center', fontFamily: 'Georgia', fontWeight: '700', fontSize: 12, lineHeight: 16 },
  missionText: { color: ink, textAlign: 'center', fontFamily: 'Georgia', fontSize: 10, lineHeight: 14, marginTop: 8 },
  missionHeart: { color: burgundy, fontSize: 18, textAlign: 'center', marginTop: 2 },

  animalLayer: { position: 'absolute', top: '33.8%', left: 0, right: 0, alignItems: 'center', zIndex: 12 },

  linkStrip: { position: 'absolute', top: '52.8%', left: '20%', width: '60%', height: '5.1%', backgroundColor: parchment, borderWidth: 1, borderColor: '#B1875A', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, shadowColor: '#2B1609', shadowOpacity: .28, shadowRadius: 3, shadowOffset: { width: 0, height: 2 }, zIndex: 15 },
  linkLabel: { color: ink, fontFamily: 'Georgia', fontWeight: '700', fontSize: 14, marginRight: 10 },
  linkHearts: { flex: 1, flexDirection: 'row', justifyContent: 'space-between' },
  linkHeart: { color: burgundy, fontSize: 21 },

  gaugePaper: { position: 'absolute', top: '58.2%', left: '5%', width: '90%', height: '12.4%', backgroundColor: parchment, borderWidth: 1, borderColor: '#A8794A', paddingHorizontal: 16, paddingVertical: 10, zIndex: 14, shadowColor: '#2D1709', shadowOpacity: .28, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
  gaugeHeading: { color: ink, fontFamily: 'Georgia', fontWeight: '700', fontStyle: 'italic', fontSize: 13, marginBottom: 8 },
  gaugeGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gaugeItem: { width: '47%', marginBottom: 8 },
  gaugeLabelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 3 },
  gaugeMark: { fontSize: 15, marginRight: 5, fontWeight: '700' },
  gaugeLabel: { color: ink, fontFamily: 'Georgia', fontWeight: '700', fontSize: 11.5 },
  track: { height: 5, backgroundColor: 'rgba(100,70,45,.18)', borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },

  actionsRow: { position: 'absolute', top: '72.3%', left: '4%', width: '92%', height: '14.6%', flexDirection: 'row', justifyContent: 'space-between', zIndex: 16 },
  tag: { width: '22.3%', height: '100%', backgroundColor: '#E4C596', borderWidth: 1, borderColor: '#A77746', alignItems: 'center', paddingHorizontal: 5, paddingTop: 19, paddingBottom: 5, transform: [{ rotate: '-0.4deg' }], shadowColor: '#261407', shadowOpacity: .3, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  tagSelected: { borderWidth: 3, borderColor: burgundy, backgroundColor: '#EACBA0', transform: [{ scale: 1.025 }] },
  tagDisabled: { opacity: .72 },
  tagHole: { position: 'absolute', top: 6, width: 8, height: 8, borderRadius: 8, borderWidth: 2, borderColor: '#7A5332', backgroundColor: '#BA966A' },
  tagString: { position: 'absolute', top: -10, width: 2, height: 18, backgroundColor: '#6B4B30' },
  tagMark: { color: '#74412F', fontFamily: 'Georgia', fontSize: 25, lineHeight: 29, marginBottom: 3 },
  tagMarkSelected: { color: burgundy },
  tagTitle: { color: ink, fontFamily: 'Georgia', fontSize: 14, fontWeight: '700', textAlign: 'center' },
  tagSubtitle: { color: '#68442D', fontFamily: 'Georgia', fontSize: 8.5, lineHeight: 11, textAlign: 'center', marginTop: 4 },

  statusPaper: { position: 'absolute', top: '88%', left: '5%', width: '90%', minHeight: '9%', backgroundColor: '#E5C89A', borderWidth: 1, borderColor: '#A77548', paddingHorizontal: 18, paddingVertical: 15, alignItems: 'center', zIndex: 17, shadowColor: '#241208', shadowOpacity: .28, shadowRadius: 3, shadowOffset: { width: 0, height: 2 } },
  statusTape: { position: 'absolute', top: -7, width: 70, height: 14, backgroundColor: 'rgba(205,170,112,.76)' },
  statusTitle: { color: burgundy, fontFamily: 'Georgia', fontWeight: '700', fontSize: 18, textAlign: 'center', marginBottom: 7 },
  statusBody: { color: ink, fontFamily: 'Georgia', fontSize: 10.5, lineHeight: 14, textAlign: 'center' },
  validateButton: { marginTop: 8, backgroundColor: burgundy, paddingHorizontal: 18, paddingVertical: 8, borderRadius: 3 },
  validateText: { color: '#FFF2DE', fontFamily: 'Georgia', fontWeight: '700', fontSize: 11 },

  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E9D5', padding: 24 },
  loadingText: { marginTop: 10, color: '#6D5035' },
  error: { color: burgundy, fontWeight: '700', marginBottom: 16 },
  fallbackButton: { backgroundColor: burgundy, paddingHorizontal: 20, paddingVertical: 12 },
  fallbackButtonText: { color: '#FFF', fontWeight: '700' },
  revealContainer: { flex: 1, backgroundColor: '#F4E9D5' },
  revealBack: { paddingHorizontal: 18, paddingVertical: 12 },
  revealBackText: { color: burgundy, fontSize: 17, fontWeight: '700' },
  revealContent: { padding: 16, paddingBottom: 40 },
});
