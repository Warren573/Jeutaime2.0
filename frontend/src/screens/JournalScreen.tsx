import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { getCommunityStats, type CommunityStatsDTO } from '../api/stats';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

interface ComplimentRecord {
  id: string;
  userName: string;
  count: number;
}

interface GiftRecord {
  id: string;
  userName: string;
  count: number;
}

interface TopProfile {
  id: string;
  pseudo: string;
  avatar?: string;
  score: number;
}

const mockCompliments: ComplimentRecord[] = [
  { id: '1', userName: 'Marie', count: 5 },
  { id: '2', userName: 'Accueche', count: 3 },
];

const mockGifts: GiftRecord[] = [
  { id: '1', userName: 'Fincus', count: 5 },
  { id: '2', userName: 'Marie', count: 4 },
];

const mockTopProfiles: TopProfile[] = [
  { id: '1', pseudo: 'Alex', score: 2850 },
  { id: '2', pseudo: 'Jordan', score: 2620 },
  { id: '3', pseudo: 'Casey', score: 2480 },
];

const formatNumber = (n: number) => n.toLocaleString('fr-FR');

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const screenBg = useStore(s => s.screenBackgrounds?.['journal'] ?? '#F4EFE1');
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState<CommunityStatsDTO | null>(null);

  const loadStats = () => {
    getCommunityStats()
      .then(setStats)
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A2818" />
        }
      >
        {/* ── Masthead ─────────────────────────────────────────────────────── */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadTitle}>JOURNAL</Text>
          <View style={styles.mastheadRule} />
          <Text style={styles.mastheadSubtitle}>Actualités de la communauté</Text>
          <View style={styles.mastheadRule} />
        </View>

        {/* ── Multi-column layout ───────────────────────────────────────────── */}
        <View style={styles.columnsContainer}>
          {/* Left Column */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>DERNIÈRES ACTIONS</Text>
            <Text style={styles.columnSubtitle}>DIX NOUVEAUX CONTACTS EN 24 HEURES</Text>
            <Text style={styles.columnContent}>
              Dix nouveaux reçevoir compliments récemment à l&apos;app ils communes évidemment jour jenvityjourss jours en onglots assistent tomreumet une élongue engla de resertgaisant une recleczio neroli
            </Text>
          </View>

          <View style={styles.columnDivider} />

          {/* Middle Column */}
          <View style={styles.column}>
            <Text style={styles.columnTitle}>TOURNOI DE SCRABBLE:</Text>
            <Text style={styles.columnSubtitle}>LES INSCRIPTIONS CONTINUENT</Text>
            <View style={styles.sectionSeparator} />

            <Text style={[styles.columnTitle, { marginTop: 12 }]}>COMPLIMENTS</Text>
            {mockCompliments.map((compliment) => (
              <View key={compliment.id} style={styles.complimentRow}>
                <Text style={styles.complimentText}>
                  {compliment.userName} reçoit {compliment.count} comp
                </Text>
                <Text style={styles.complimentText}>pliments récemment</Text>
              </View>
            ))}
          </View>

          <View style={styles.columnDivider} />

          {/* Right Column */}
          <View style={styles.column}>
            <View style={styles.columnPlaceholder} />

            <View style={styles.complimentsBox}>
              <Text style={styles.complimentsBoxIcon}>❤️</Text>
            </View>

            <Text style={[styles.columnTitle, { marginTop: 16 }]}>TOP PROFILS</Text>
            {mockTopProfiles.map((profile) => (
              <View key={profile.id} style={styles.profileRow}>
                <View style={styles.profileAvatar} />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{profile.pseudo}</Text>
                  <Text style={styles.profileScore}>{profile.score} pts</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionRule} />

        {/* ── Bottom sections ──────────────────────────────────────────────── */}
        <View style={styles.bottomGrid}>
          {/* Left: Gifts */}
          <View style={styles.bottomSection}>
            <Text style={styles.bottomTitle}>LES CADEAUX DU JOUR</Text>
            {mockGifts.map((gift) => (
              <View key={gift.id} style={styles.giftRow}>
                <Text style={styles.giftText}>
                  {gift.userName} reçoit {gift.count} compliments récemment
                </Text>
              </View>
            ))}
            <View style={styles.giftPlaceholder} />
          </View>

          <View style={styles.bottomDivider} />

          {/* Right: Stats */}
          <View style={styles.bottomSection}>
            <Text style={styles.bottomTitle}>STATISTIQUES</Text>
            <View style={styles.statsContent}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats ? formatNumber(stats.matchesToday) : '—'}</Text>
                <Text style={styles.statLabel}>Matchs</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats ? formatNumber(stats.lettersSent) : '—'}</Text>
                <Text style={styles.statLabel}>Lettres</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{stats ? formatNumber(stats.giftsSent) : '—'}</Text>
                <Text style={styles.statLabel}>Cadeaux</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const INK = '#2A2118';
const INK_SOFT = '#5C4B3A';

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingBottom: 100 },

  // ── Masthead ─────────────────────────────────────────────────────────────
  masthead: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  mastheadTitle: {
    fontSize: 48,
    fontWeight: '900',
    fontFamily: SERIF,
    color: INK,
    letterSpacing: 2,
    textAlign: 'center',
  },
  mastheadRule: {
    height: 2,
    backgroundColor: INK,
    width: '100%',
    marginVertical: 8,
  },
  mastheadSubtitle: {
    fontSize: 16,
    fontFamily: SERIF,
    color: INK,
    letterSpacing: 1,
    textAlign: 'center',
  },

  // ── Multi-column layout ───────────────────────────────────────────────────
  columnsContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    gap: 0,
  },
  column: {
    flex: 1,
    paddingHorizontal: 12,
  },
  columnDivider: {
    width: 1.5,
    backgroundColor: INK,
    marginHorizontal: 8,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: SERIF,
    color: INK,
    lineHeight: 22,
    marginBottom: 8,
  },
  columnSubtitle: {
    fontSize: 14,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
    lineHeight: 18,
    marginBottom: 10,
  },
  columnContent: {
    fontSize: 13,
    fontFamily: SERIF,
    color: INK_SOFT,
    lineHeight: 19,
  },
  columnPlaceholder: {
    height: 60,
    backgroundColor: '#E8E0D0',
    borderRadius: 4,
    marginBottom: 12,
  },
  sectionSeparator: {
    height: 1,
    backgroundColor: INK,
    marginVertical: 10,
  },
  complimentRow: {
    marginBottom: 8,
  },
  complimentText: {
    fontSize: 13,
    fontFamily: SERIF,
    color: INK,
    lineHeight: 18,
  },
  complimentsBox: {
    width: 60,
    height: 60,
    borderWidth: 2,
    borderColor: INK,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginVertical: 12,
  },
  complimentsBoxIcon: {
    fontSize: 32,
  },

  // ── Top Profiles ──────────────────────────────────────────────────────────
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  profileAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#CCC',
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 12,
    fontWeight: '600',
    fontFamily: SERIF,
    color: INK,
  },
  profileScore: {
    fontSize: 11,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 2,
  },

  // ── Separator ─────────────────────────────────────────────────────────────
  sectionRule: {
    height: 1,
    backgroundColor: INK,
    marginVertical: 16,
  },

  // ── Bottom Grid ───────────────────────────────────────────────────────────
  bottomGrid: {
    flexDirection: 'row',
    gap: 0,
  },
  bottomSection: {
    flex: 1,
    paddingHorizontal: 12,
  },
  bottomDivider: {
    width: 1.5,
    backgroundColor: INK,
    marginHorizontal: 8,
  },
  bottomTitle: {
    fontSize: 16,
    fontWeight: '900',
    fontFamily: SERIF,
    color: INK,
    lineHeight: 22,
    marginBottom: 10,
  },
  giftRow: {
    marginBottom: 8,
  },
  giftText: {
    fontSize: 13,
    fontFamily: SERIF,
    color: INK,
    lineHeight: 18,
  },
  giftPlaceholder: {
    height: 40,
    backgroundColor: '#E8E0D0',
    borderRadius: 4,
    marginTop: 12,
  },
  statsContent: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
  },
  statLabel: {
    fontSize: 11,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 4,
    textAlign: 'center',
  },
});
