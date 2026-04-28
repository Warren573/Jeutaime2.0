import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { salonsData } from '../data/salonsData';
import { useStore } from '../store/useStore';

const { width } = Dimensions.get('window');

export default function SalonsListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const screenBg = useStore(s => s.screenBackgrounds?.['salons'] ?? '#FFF8E7');
  const currentUser = useStore(s => s.currentUser);
  const canEnterSalon = currentUser?.canEnterSalon ?? true;

  const handleSalonPress = (salon: typeof salonsData[0]) => {
    if (!canEnterSalon) {
      Alert.alert(
        'Profil incomplet',
        'Complète ta bio et tes préférences pour entrer dans les salons.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Compléter mon profil', onPress: () => router.push('/edit-profile') },
        ],
      );
      return;
    }
    router.push(`/salon/${salon.id}`);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={8}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>👥 Salons</Text>
        <Text style={styles.headerSubtitle}>Rejoignez une discussion</Text>
      </View>

      {/* Gate banner */}
      {!canEnterSalon && (
        <View style={styles.gateBanner}>
          <Text style={styles.gateBannerText}>
            Complète ta bio et tes préférences pour entrer dans les salons.
          </Text>
          <TouchableOpacity onPress={() => router.push('/edit-profile')}>
            <Text style={styles.gateBannerBtnText}>Compléter mon profil →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Liste des salons */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {salonsData.map((salon) => (
          <TouchableOpacity
            key={salon.id}
            style={[styles.salonCard, !canEnterSalon && { opacity: 0.5 }]}
            onPress={() => handleSalonPress(salon)}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={salon.gradient}
              style={styles.salonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.salonContent}>
                <Text style={styles.salonIcon}>{salon.icon}</Text>
                <View style={styles.salonInfo}>
                  <Text style={styles.salonName}>{salon.name}</Text>
                  <Text style={styles.salonDesc}>{salon.desc}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
                    <View style={[styles.specialBadge, { backgroundColor: salon.layout === 'vertical' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.18)' }]}>
                      <Text style={[styles.specialBadgeText, { color: '#FFF' }]}>
                        {salon.layout === 'vertical' ? '💬 Conversation' : '👥 Groupe'}
                      </Text>
                    </View>
                  </View>
                </View>
                <View style={styles.salonStats}>
                  <View style={styles.participantsBadge}>
                    <Text style={styles.participantsCount}>
                      {salon.participants.filter(p => p.online).length}
                    </Text>
                    <Text style={styles.participantsLabel}>en ligne</Text>
                  </View>
                  <Text style={styles.arrowIcon}>→</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  backButton: {
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  backText: {
    fontSize: 15,
    color: '#667eea',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A2818',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  salonCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  salonGradient: {
    padding: 16,
  },
  salonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  salonIcon: {
    fontSize: 40,
    marginRight: 14,
  },
  salonInfo: {
    flex: 1,
  },
  salonName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  salonDesc: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 4,
  },
  specialBadge: {
    backgroundColor: 'rgba(255,215,0,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  specialBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#3A2818',
  },
  salonStats: {
    alignItems: 'center',
  },
  participantsBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    alignItems: 'center',
  },
  participantsCount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  participantsLabel: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.8)',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#FFF',
    marginTop: 8,
    fontWeight: '700',
  },
  gateBanner: {
    backgroundColor: '#FFF3CD',
    borderRadius: 12,
    margin: 16,
    marginBottom: 0,
    padding: 14,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  gateBannerText: {
    fontSize: 14,
    color: '#856404',
    marginBottom: 10,
    lineHeight: 20,
  },
  gateBannerBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
  },
});
