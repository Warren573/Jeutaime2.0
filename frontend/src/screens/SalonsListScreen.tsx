import React, { useEffect, useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { salonsData } from '../data/salonsData';
import { getSalonCardImage } from '../data/salonBackgroundImages';
import { useStore } from '../store/useStore';
import { getCurrentSalonSession, leaveSession, getSalonCounters } from '../api/salons';
import ConfirmationModal from '../components/ConfirmationModal';
import { AppBackButton } from '../components/AppBackButton';

const { width } = Dimensions.get('window');

const KIND_TO_SLUG: Record<string, string> = {
  'PISCINE': 'piscine',
  'CAFE_DE_PARIS': 'cafe_paris',
  'ILE_PIRATES': 'pirates',
  'THEATRE': 'theatre',
  'BAR_COCKTAILS': 'cocktails',
  'METAL': 'metal',
  'PSY': 'psy',
};

export default function SalonsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const bannerHeight = (screenWidth - 32) / 3;
  const screenBg = useStore(s => s.screenBackgrounds?.['salons'] ?? '#FFF8E7');
  const currentUser = useStore(s => s.currentUser);
  const canEnterSalon = currentUser?.canEnterSalon ?? true;
  const { currentSessionId, currentSalonKind, currentSalonName, setCurrentSalonSession, clearCurrentSalonSession, isAuthenticated } = useStore();

  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [salonCounters, setSalonCounters] = useState<Record<string, number>>({});

  const loadSalonCounters = useCallback(async () => {
    try {
      console.log('[COUNTERS] Loading counters from backend...');
      const backendCounters = await getSalonCounters();
      const counters: Record<string, number> = {};
      for (const salon of salonsData) {
        const salonKind = Object.entries(KIND_TO_SLUG).find(([_, slug]) => slug === salon.id)?.[0];
        if (!salonKind) {
          counters[salon.id] = 0;
          continue;
        }
        counters[salon.id] = backendCounters[salonKind] ?? 0;
      }
      setSalonCounters(counters);
    } catch (e) {
      console.error('[COUNTERS] Failed to load counters:', e);
      const fallback: Record<string, number> = {};
      for (const salon of salonsData) fallback[salon.id] = 0;
      setSalonCounters(fallback);
    }
  }, []);

  const loadCurrentSession = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const session = await getCurrentSalonSession();
      if (session) {
        setCurrentSalonSession(session.sessionId, session.salonKind, session.salonId, session.salonName);
      } else {
        setCurrentSalonSession('', '', '', '');
      }
    } catch (e) {
      console.error('Failed to load current session:', e);
    }
  }, [isAuthenticated, setCurrentSalonSession]);

  useEffect(() => { loadCurrentSession(); }, [loadCurrentSession]);
  useFocusEffect(useCallback(() => { loadCurrentSession(); }, [loadCurrentSession]));
  useEffect(() => { loadSalonCounters(); }, [loadSalonCounters]);
  useFocusEffect(useCallback(() => { loadSalonCounters(); }, [loadSalonCounters]));
  useEffect(() => {
    const interval = setInterval(() => loadSalonCounters(), 5000);
    return () => clearInterval(interval);
  }, [loadSalonCounters]);

  const handleLeaveSession = async () => {
    if (!currentSessionId) return;
    try {
      await leaveSession(currentSessionId);
      clearCurrentSalonSession();
      await loadCurrentSession();
      await loadSalonCounters();
      setShowLeaveModal(false);
    } catch (e) {
      console.error('[LEAVE-FROM-LIST] Error:', e);
      Alert.alert('Erreur', 'Impossible de quitter le salon. Veuillez réessayer.');
    }
  };

  const handleSalonPress = (salon: typeof salonsData[0]) => {
    if (!canEnterSalon) {
      Alert.alert('Profil incomplet', 'Complète ta bio et tes préférences pour entrer dans les salons.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Compléter mon profil', onPress: () => router.push('/edit-profile') },
      ]);
      return;
    }

    if (currentSessionId && currentSalonKind) {
      const currentSlug = KIND_TO_SLUG[currentSalonKind];
      if (currentSlug === salon.id) {
        router.push(`/salon/${salon.id}`);
        return;
      }
      Alert.alert('Salon actif', `Vous êtes actuellement dans ${currentSalonName}. Quittez ce salon avant d'en rejoindre un autre.`, [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Retourner à mon salon', onPress: () => router.push(`/salon/${currentSlug}`) },
      ]);
      return;
    }

    router.push(`/salon/${salon.id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>👥 Salons</Text>
        <Text style={styles.headerSubtitle}>Rejoignez une discussion</Text>
      </View>

      {currentSessionId && currentSalonName && currentSalonKind && (
        <View style={styles.activeSalonBanner}>
          <Text style={styles.activeSalonText}>🟢 Vous êtes actuellement dans : <Text style={{ fontWeight: '700' }}>{currentSalonName}</Text></Text>
          <View style={styles.activeSalonButtons}>
            <TouchableOpacity
              onPress={() => {
                let slug = KIND_TO_SLUG[currentSalonKind];
                if (!slug) {
                  const salonByName = salonsData.find(s => s.name.toLowerCase() === currentSalonName.toLowerCase());
                  slug = salonByName?.id;
                }
                if (slug) router.push(`/salon/${slug}`);
              }}
              style={styles.returnButton}
            >
              <Text style={styles.returnButtonText}>Retourner au salon</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setShowLeaveModal(true)} style={styles.leaveButtonList}>
              <Text style={styles.leaveButtonListText}>Quitter le salon</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!canEnterSalon && (
        <View style={styles.gateBanner}>
          <Text style={styles.gateBannerText}>Complète ta bio et tes préférences pour entrer dans les salons.</Text>
          <TouchableOpacity onPress={() => router.push('/edit-profile')}><Text style={styles.gateBannerBtnText}>Compléter mon profil →</Text></TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {salonsData.map((salon) => {
          const bgImage = getSalonCardImage(salon.id);
          const cardContent = (
            <View style={styles.salonContent}>
              <Text style={styles.salonIcon}>{salon.icon}</Text>
              <View style={styles.salonInfo}>
                <Text style={styles.salonName}>{salon.name}</Text>
                <Text style={styles.salonDesc}>{salon.desc}</Text>
                <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                  <View style={[styles.specialBadge, { backgroundColor: salon.layout === 'vertical' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }]}>
                    <Text style={[styles.specialBadgeText, { color: '#FFF' }]}>{salon.layout === 'vertical' ? '💬 Conversation' : '👥 Groupe'}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.salonStats}>
                <View style={styles.participantsBadge}>
                  <Text style={styles.participantsCount}>{salonCounters[salon.id] ?? 0}</Text>
                  <Text style={styles.participantsLabel}>en ligne</Text>
                </View>
                <Text style={styles.arrowIcon}>→</Text>
              </View>
            </View>
          );

          return (
            <TouchableOpacity key={salon.id} style={[styles.salonCard, !canEnterSalon && { opacity: 0.5 }]} onPress={() => handleSalonPress(salon)} activeOpacity={0.8}>
              {bgImage ? (
                <ImageBackground source={bgImage} style={[styles.salonBanner, { height: bannerHeight }]} resizeMode="cover">
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.30)' }]} />
                  {cardContent}
                </ImageBackground>
              ) : (
                <LinearGradient colors={salon.gradient} style={styles.salonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>{cardContent}</LinearGradient>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ConfirmationModal visible={showLeaveModal} title="Quitter le salon ?" message="Vous pourrez rejoindre un autre salon après votre départ." cancelText="Annuler" confirmText="Quitter" onCancel={() => setShowLeaveModal(false)} onConfirm={handleLeaveSession} isDangerous={true} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backButton: { marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  salonCard: { marginBottom: 16, borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 6 },
  salonGradient: { padding: 16 },
  salonBanner: { width: '100%', padding: 16, justifyContent: 'center', overflow: 'hidden' },
  salonContent: { flexDirection: 'row', alignItems: 'center' },
  salonIcon: { fontSize: 40, marginRight: 14 },
  salonInfo: { flex: 1 },
  salonName: { fontSize: 18, fontWeight: '700', color: '#FFF', textShadowColor: 'rgba(0,0,0,0.3)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  salonDesc: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4 },
  specialBadge: { backgroundColor: 'rgba(255,215,0,0.9)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6 },
  specialBadgeText: { fontSize: 10, fontWeight: '700', color: '#3A2818' },
  salonStats: { alignItems: 'center' },
  participantsBadge: { backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, alignItems: 'center' },
  participantsCount: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  participantsLabel: { fontSize: 10, color: 'rgba(255,255,255,0.8)' },
  arrowIcon: { fontSize: 20, color: '#FFF', marginTop: 8, fontWeight: '700' },
  gateBanner: { backgroundColor: '#FFF3CD', borderRadius: 12, margin: 16, marginBottom: 0, padding: 14, borderWidth: 1, borderColor: '#FFEAA7' },
  gateBannerText: { fontSize: 14, color: '#856404', marginBottom: 10, lineHeight: 20 },
  gateBannerBtnText: { fontSize: 14, fontWeight: '700', color: '#856404' },
  activeSalonBanner: { backgroundColor: '#D4EDDA', borderRadius: 12, margin: 16, marginBottom: 12, padding: 16, borderWidth: 1, borderColor: '#C3E6CB' },
  activeSalonText: { fontSize: 14, fontWeight: '500', color: '#155724', marginBottom: 14, lineHeight: 20 },
  activeSalonButtons: { gap: 10 },
  returnButton: { backgroundColor: 'rgba(139,46,60,0.08)', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1.5, borderColor: '#8B2E3C', alignItems: 'center' },
  returnButtonText: { fontSize: 13, fontWeight: '600', color: '#8B2E3C' },
  leaveButtonList: { backgroundColor: '#E74C3C', paddingVertical: 11, paddingHorizontal: 14, borderRadius: 10, alignItems: 'center' },
  leaveButtonListText: { fontSize: 13, fontWeight: '600', color: '#FFF' },
});
