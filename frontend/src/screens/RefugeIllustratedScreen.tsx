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
import { ACTION_LABELS, type RefugeActionType } from '../data/refugeActions';
import { useRefugeDailyChoices } from '../hooks/useRefugeDailyChoices';
import { useRefugeSession } from '../hooks/useRefugeSession';

const ACTIONS: RefugeActionType[] = ['feed', 'pet', 'wash', 'play'];

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
  const artHeight = artWidth * (1037 / 480);
  const animalSize = Math.min(245, artWidth * 0.52);
  const currentDay = Math.min(Math.max(refuge.currentDay || 1, 1), 7);
  const isWaiting = refuge.status === 'WAITING_FOR_ADOPTANT' || refuge.status === 'CREATION';
  const selected = refuge.role === 'adoptant' ? selectedGuessActions : selectedMyActions;

  useEffect(() => {
    resetDay();
  }, [refuge.currentDay, resetDay]);

  const handleAction = (action: RefugeActionType) => {
    if (isWaiting || isSubmitting) return;
    if (refuge.role === 'adoptant') {
      if (refuge.adoptantSubmittedToday || !refuge.adopteSubmittedToday) return;
      toggleGuessAction(action);
      return;
    }
    if (refuge.role === 'adopte' && !refuge.adopteSubmittedToday) toggleMyAction(action);
  };

  const submit = async () => {
    if (isSubmitting || selected.length !== 2) return;
    setIsSubmitting(true);
    try {
      if (refuge.role === 'adoptant') {
        await refuge.submitGuess(selectedGuessActions);
      } else {
        const ok = await refuge.submitDailyChoice(selectedMyActions);
        if (ok) resetDay();
      }
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
        ? 'Que veut-il faire aujourd’hui ?'
        : 'Ton compagnon réfléchit encore…'
      : refuge.adopteSubmittedToday
        ? 'Tes choix sont notés pour aujourd’hui'
        : 'Que fait-on aujourd’hui ?';

  const statusBody = isWaiting
    ? 'Ton compagnon apparaîtra dans la liste des refuges disponibles. Le jeu commence dès qu’il est adopté.'
    : refuge.role === 'adoptant'
      ? refuge.adopteSubmittedToday
        ? 'Choisis les deux gestes qui lui ressemblent le plus.'
        : 'Dès qu’il aura choisi ses deux moments, tu pourras essayer de les deviner.'
      : refuge.adopteSubmittedToday
        ? 'Il ne reste plus qu’à attendre la réponse de ton compagnon.'
        : 'Choisis deux petits moments à partager.';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={[styles.artFrame, { width: artWidth, height: artHeight }]}> 
          <ImageBackground
            source={{ uri: REFUGE_BACKGROUND_DATA_URI }}
            resizeMode="cover"
            style={StyleSheet.absoluteFill}
            imageStyle={styles.artImage}
          />

          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Retour"
            style={styles.backHotspot}
            onPress={() => router.back()}
          />

          <View style={styles.calendarOverlay} pointerEvents="none">
            {Array.from({ length: 7 }, (_, index) => {
              const day = index + 1;
              const done = day < currentDay;
              const today = day === currentDay;
              return (
                <View key={day} style={styles.calendarDay}>
                  <Text style={[styles.calendarNumber, today && styles.calendarNumberToday]}>{day}</Text>
                  <Text style={[styles.calendarMark, done && styles.calendarMarkDone]}>{done ? '♥' : today ? '•' : '·'}</Text>
                </View>
              );
            })}
          </View>

          <View style={[styles.animalLayer, { top: artHeight * 0.33 }]} pointerEvents="none">
            {isRefugeAnimal(refuge.companion?.animalType) && (
              <AnimalIllustration animal={refuge.companion.animalType} size={animalSize} />
            )}
          </View>

          <View style={styles.linkOverlay} pointerEvents="none">
            <Text style={styles.linkLabel}>LIEN</Text>
            <View style={styles.linkHearts}>
              {(refuge.hearts ?? []).map((heart, index) => (
                <Text key={index} style={styles.linkHeart}>{heart}</Text>
              ))}
            </View>
          </View>

          {ACTIONS.map((action, index) => {
            const isSelected = selected.includes(action);
            const left = `${3 + index * 24.1}%` as const;
            return (
              <TouchableOpacity
                key={action}
                accessibilityRole="button"
                accessibilityLabel={ACTION_LABELS[action]}
                activeOpacity={0.72}
                onPress={() => handleAction(action)}
                disabled={isWaiting || refuge.adopteSubmittedToday && refuge.role === 'adopte' || refuge.adoptantSubmittedToday && refuge.role === 'adoptant'}
                style={[
                  styles.actionHotspot,
                  { left },
                  isSelected && styles.actionHotspotSelected,
                ]}
              />
            );
          })}

          <View style={styles.statusOverlay}>
            <Text style={styles.statusTitle}>{statusTitle}</Text>
            <Text style={styles.statusBody}>{statusBody}</Text>
            {!isWaiting && selected.length === 2 && !refuge.adopteSubmittedToday && refuge.role === 'adopte' && (
              <TouchableOpacity style={styles.validateButton} onPress={submit} disabled={isSubmitting}>
                <Text style={styles.validateText}>{isSubmitting ? 'Envoi…' : 'Valider'}</Text>
              </TouchableOpacity>
            )}
            {!isWaiting && selected.length === 2 && refuge.role === 'adoptant' && refuge.adopteSubmittedToday && !refuge.adoptantSubmittedToday && (
              <TouchableOpacity style={styles.validateButton} onPress={submit} disabled={isSubmitting}>
                <Text style={styles.validateText}>{isSubmitting ? 'Envoi…' : 'Valider'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#2B1A10' },
  scrollContent: { alignItems: 'center', backgroundColor: '#2B1A10', paddingBottom: 16 },
  artFrame: { position: 'relative', overflow: 'hidden', backgroundColor: '#D8C3A3' },
  artImage: { width: '100%', height: '100%' },
  backHotspot: { position: 'absolute', top: '2.4%', left: '2%', width: '24%', height: '6.5%' },
  calendarOverlay: {
    position: 'absolute', top: '18.2%', left: '31.3%', width: '39%', height: '6%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: 'rgba(236,219,190,0.92)', paddingHorizontal: 4,
  },
  calendarDay: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  calendarNumber: { fontSize: 10, color: '#4B2E24', fontWeight: '700' },
  calendarNumberToday: { color: '#8C3A46', fontWeight: '900' },
  calendarMark: { fontSize: 12, color: '#7F6F59', lineHeight: 13 },
  calendarMarkDone: { color: '#8C3A46' },
  animalLayer: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 4 },
  linkOverlay: {
    position: 'absolute', top: '56.6%', left: '25.5%', width: '52.5%', height: '5.1%',
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(239,220,190,0.94)', paddingHorizontal: 6,
  },
  linkLabel: { fontSize: 11, color: '#4C3425', fontWeight: '800', marginRight: 7 },
  linkHearts: { flexDirection: 'row', gap: 2 },
  linkHeart: { fontSize: 15 },
  actionHotspot: {
    position: 'absolute', top: '71.3%', width: '20.8%', height: '12.6%',
    borderWidth: 0, borderRadius: 8,
  },
  actionHotspotSelected: {
    borderWidth: 3, borderColor: '#8C3A46', backgroundColor: 'rgba(140,58,70,0.12)',
  },
  statusOverlay: {
    position: 'absolute', top: '84.7%', left: '4.5%', width: '91%', minHeight: '10.5%',
    backgroundColor: 'rgba(238,218,187,0.96)', alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18, paddingVertical: 7,
  },
  statusTitle: { fontSize: 17, fontWeight: '700', color: '#7A2F3B', textAlign: 'center', marginBottom: 4 },
  statusBody: { fontSize: 10.5, lineHeight: 14, color: '#4D3426', textAlign: 'center' },
  validateButton: { marginTop: 6, backgroundColor: '#8C3A46', paddingHorizontal: 22, paddingVertical: 7, borderRadius: 4 },
  validateText: { color: '#FFF8EE', fontWeight: '800', fontSize: 12 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F4E9D5', padding: 24 },
  loadingText: { marginTop: 10, color: '#6D5035' },
  error: { color: '#8C3A46', fontWeight: '700', marginBottom: 16 },
  fallbackButton: { backgroundColor: '#8C3A46', paddingHorizontal: 20, paddingVertical: 12 },
  fallbackButtonText: { color: '#FFF', fontWeight: '700' },
  revealContainer: { flex: 1, backgroundColor: '#F4E9D5' },
  revealBack: { paddingHorizontal: 18, paddingVertical: 12 },
  revealBackText: { color: '#8C3A46', fontSize: 17, fontWeight: '700' },
  revealContent: { padding: 16, paddingBottom: 40 },
});
