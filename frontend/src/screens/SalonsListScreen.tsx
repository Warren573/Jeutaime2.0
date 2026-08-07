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
        <Text style={styles.headerKicker}>JEUTAIME</Text>
        <Text style={styles.headerTitle}>Salons</Text>
        <Text style={styles.headerSubtitle}>Choisissez l'ambiance qui vous ressemble.</Text>
      </View>

      {currentSessionId && currentSalonName && currentSalonKind && (
        <View style={styles.activeSalonBanner}>
          <View style={styles.activeSalonHeading}>
            <View style={styles.activeDot} />
            <Text style={styles.activeSalonLabel}>SALON ACTIF</Text>
          </View>
          <Text style={styles.activeSalonText}>{currentSalonName}</Text>
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
              <Text style={styles.leaveButtonListText}>Quitter</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {!canEnterSalon && (
        <View style={styles.gateBanner}>
          <Text style={styles.gateBannerTitle}>Profil à compléter</Text>
          <Text style={styles.gateBannerText}>Complète ta bio et tes préférences pour entrer dans les salons.</Text>
          <TouchableOpacity onPress={() => router.push('/edit-profile')}><Text style={styles.gateBannerBtnText}>Compléter mon profil →</Text></TouchableOpacity>
        </View>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {salonsData.map((salon) => {
          const bgImage = getSalonCardImage(salon.id);
          const cardContent = (
            <View style={styles.salonContent}>
              <View style={styles.salonIconWrap}><Text style={styles.salonIcon}>{salon.icon}</Text></View>
              <View style={styles.salonInfo}>
                <Text style={styles.salonName}>{salon.name}</Text>
                <Text style={styles.salonDesc}>{salon.desc}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.specialBadge}>
                    <Text style={styles.specialBadgeText}>{salon.layout === 'vertical' ? '💬 Conversation' : '👥 Groupe'}</Text>
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
            <TouchableOpacity key={salon.id} style={[styles.salonCard, !canEnterSalon && styles.salonCardDisabled]} onPress={() => handleSalonPress(salon)} activeOpacity={0.82}>
              {bgImage ? (
                <ImageBackground source={bgImage} style={[styles.salonBanner, { height: bannerHeight }]} resizeMode="cover">
                  <View style={[StyleSheet.absoluteFill, styles.imageOverlay]} />
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
  header: { paddingHorizontal: 18, paddingTop: 12, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: '#E6D6C2', backgroundColor: 'rgba(255,248,231,0.92)' },
  backButton: { marginBottom: 10 },
  headerKicker: { fontSize: 10, fontWeight: '800', letterSpacing: 2.4, color: '#9B704A', marginBottom: 5 },
  headerTitle: { fontSize: 29, lineHeight: 34, fontWeight: '900', color: '#2F1E15', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 14, lineHeight: 20, color: '#806149', marginTop: 5 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 108 },
  salonCard: { marginBottom: 14, borderRadius: 18, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(91,58,29,0.16)', shadowColor: '#4B2D18', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5, backgroundColor: '#F4E7D6' },
  salonCardDisabled: { opacity: 0.48 },
  salonGradient: { padding: 16, minHeight: 118, justifyContent: 'center' },
  salonBanner: { width: '100%', padding: 15, justifyContent: 'center', overflow: 'hidden' },
  imageOverlay: { backgroundColor: 'rgba(28,16,8,0.38)' },
  salonContent: { flexDirection: 'row', alignItems: 'center' },
  salonIconWrap: { width: 48, height: 48, borderRadius: 15, marginRight: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,248,231,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' },
  salonIcon: { fontSize: 29 },
  salonInfo: { flex: 1, minWidth: 0 },
  salonName: { fontSize: 18, lineHeight: 22, fontWeight: '800', color: '#FFF9EF', textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2 },
  salonDesc: { fontSize: 12.5, lineHeight: 17, color: 'rgba(255,249,239,0.9)', marginTop: 3 },
  badgeRow: { flexDirection: 'row', marginTop: 7 },
  specialBadge: { backgroundColor: 'rgba(255,248,231,0.18)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  specialBadgeText: { fontSize: 10, fontWeight: '700', color: '#FFF9EF' },
  salonStats: { alignItems: 'center', marginLeft: 10 },
  participantsBadge: { minWidth: 52, backgroundColor: 'rgba(255,248,231,0.18)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 13, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  participantsCount: { fontSize: 17, lineHeight: 19, fontWeight: '800', color: '#FFF9EF' },
  participantsLabel: { fontSize: 9.5, color: 'rgba(255,249,239,0.82)', marginTop: 1 },
  arrowIcon: { fontSize: 19, color: '#FFF9EF', marginTop: 6, fontWeight: '700' },
  gateBanner: { backgroundColor: '#F8EEDB', borderRadius: 16, marginHorizontal: 16, marginTop: 14, padding: 15, borderWidth: 1, borderColor: '#DFC9A8' },
  gateBannerTitle: { fontSize: 13, fontWeight: '800', color: '#5C3E28', marginBottom: 4 },
  gateBannerText: { fontSize: 13, color: '#74563D', marginBottom: 9, lineHeight: 19 },
  gateBannerBtnText: { fontSize: 13, fontWeight: '800', color: '#8B2E3C' },
  activeSalonBanner: { backgroundColor: '#F7EEDD', borderRadius: 16, marginHorizontal: 16, marginTop: 14, padding: 15, borderWidth: 1, borderColor: '#D8C1A0', shadowColor: '#4B2D18', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 5, elevation: 2 },
  activeSalonHeading: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  activeDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#5F8A5E', marginRight: 7 },
  activeSalonLabel: { fontSize: 10, fontWeight: '800', letterSpacing: 1.4, color: '#7B6048' },
  activeSalonText: { fontSize: 16, fontWeight: '800', color: '#352319', marginBottom: 13 },
  activeSalonButtons: { flexDirection: 'row', gap: 9 },
  returnButton: { flex: 1, backgroundColor: '#8B2E3C', minHeight: 44, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  returnButtonText: { fontSize: 13, fontWeight: '800', color: '#FFF8E7' },
  leaveButtonList: { minWidth: 88, minHeight: 44, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F2E4D3', borderWidth: 1, borderColor: '#D8BFA6' },
  leaveButtonListText: { fontSize: 13, fontWeight: '700', color: '#7A3941' },
});
