import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Platform,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { useStore } from '../store/useStore';
import { getCommunityStats, getDailyStats, getRefugeStats, type CommunityStatsDTO, type DailyStatsDTO, type RefugeStatsDTO } from '../api/stats';
import { getWeeklyProfileWinners, type WeeklyProfileWinnersDTO } from '../api/weeklyProfile';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

const todayHeadline = () =>
  new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const formatNumber = (n: number) => n.toLocaleString('fr-FR');

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { coins, points } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['journal'] ?? '#F4EFE1');
  const [refreshing, setRefreshing] = useState(false);
  const [communityStats, setCommunityStats] = useState<CommunityStatsDTO | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatsDTO | null>(null);
  const [refugeStats, setRefugeStats] = useState<RefugeStatsDTO | null>(null);
  const [weeklyWinners, setWeeklyWinners] = useState<WeeklyProfileWinnersDTO | null>(null);

  const loadAllData = async () => {
    try {
      const [commStats, dayStats, refStats, winners] = await Promise.all([
        getCommunityStats(),
        getDailyStats(),
        getRefugeStats(),
        getWeeklyProfileWinners(),
      ]);
      setCommunityStats(commStats);
      setDailyStats(dayStats);
      setRefugeStats(refStats);
      setWeeklyWinners(winners);
    } catch (error) {
      console.error('[JournalScreen] Error loading data:', error);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadAllData();
    setTimeout(() => setRefreshing(false), 600);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A2818" />
        }
      >
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <View style={styles.masthead}>
          <Text style={styles.kicker}>L'ÉDITION DU JOUR · GRATUIT</Text>
          <Text style={styles.mastheadTitle}>Le JeuTaime</Text>
          <Text style={styles.mastheadTagline}>Nouvelles du cœur & de la communauté</Text>
          <View style={styles.mastheadRuleThick} />
          <View style={styles.mastheadRuleThin} />
          <View style={styles.datelineRow}>
            <Text style={styles.dateline}>{todayHeadline()}</Text>
          </View>
        </View>

        {/* ── Encadré lecteur (à la une, en bref) ────────────────────────── */}
        <View style={styles.briefBox}>
          <Text style={styles.briefBoxTitle}>EN BREF</Text>
          <View style={styles.briefRow}>
            <View style={styles.briefItem}>
              <Text style={styles.briefValue}>{coins}</Text>
              <Text style={styles.briefLabel}>Pièces</Text>
            </View>
            <View style={styles.briefDivider} />
            <View style={styles.briefItem}>
              <Text style={styles.briefValue}>{points}</Text>
              <Text style={styles.briefLabel}>Points</Text>
            </View>
          </View>
        </View>

        {/* ── Gagnants de la semaine ──────────────────────────────────────── */}
        {weeklyWinners && (weeklyWinners.male || weeklyWinners.female) && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>GAGNANTS DE LA SEMAINE</Text>

            <View style={styles.winnersSection}>
              {weeklyWinners.female && (
                <View style={styles.winnerColumn}>
                  <TouchableOpacity
                    onPress={() => router.push(`/profiles?userId=${weeklyWinners.female!.id}`)}
                    style={styles.avatarWrapper}
                  >
                    <Avatar size={60} {...resolveAvatarConfig(weeklyWinners.female.id, weeklyWinners.female.avatarConfig, weeklyWinners.female.gender, 'JournalScreen').config} />
                  </TouchableOpacity>
                  <Text style={styles.winnerName}>{weeklyWinners.female.pseudo}</Text>
                  <Text style={styles.winnerVotes}>{weeklyWinners.female.totalVotes} votes</Text>
                </View>
              )}
              {weeklyWinners.male && (
                <View style={styles.winnerColumn}>
                  <TouchableOpacity
                    onPress={() => router.push(`/profiles?userId=${weeklyWinners.male!.id}`)}
                    style={styles.avatarWrapper}
                  >
                    <Avatar size={60} {...resolveAvatarConfig(weeklyWinners.male.id, weeklyWinners.male.avatarConfig, weeklyWinners.male.gender, 'JournalScreen').config} />
                  </TouchableOpacity>
                  <Text style={styles.winnerName}>{weeklyWinners.male.pseudo}</Text>
                  <Text style={styles.winnerVotes}>{weeklyWinners.male.totalVotes} votes</Text>
                </View>
              )}
            </View>
          </>
        )}

        {/* ── Le Refuge ───────────────────────────────────────────────────── */}
        {refugeStats && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>LE REFUGE</Text>

            <View style={styles.refugeBox}>
              <Text style={styles.refugeText}>
                {refugeStats.petsInRefuge} animaux attendent une maison aimante. <Text style={styles.refugeHighlight}>{refugeStats.petsAwaitingReveal} sont en attente de révélation</Text>.
              </Text>
              <Text style={styles.refugeSubtext}>Aide nos compagnons virtuels à trouver un foyer!</Text>
            </View>
          </>
        )}

        {/* ── Statistiques du jour ─────────────────────────────────────────── */}
        {dailyStats && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>STATISTIQUES DU JOUR</Text>

            <View style={styles.statsSection}>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.duelsPlayedToday}</Text>
                <Text style={styles.statName}>Duels joués</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.bottlesSentToday}</Text>
                <Text style={styles.statName}>Bouteilles envoyées</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.smilesSentToday}</Text>
                <Text style={styles.statName}>Sourires envoyés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.grimacesSentToday}</Text>
                <Text style={styles.statName}>Grimaces envoyées</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.offeringsSentToday}</Text>
                <Text style={styles.statName}>Offrandes envoyées</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.petsAdoptedToday}</Text>
                <Text style={styles.statName}>Animaux adoptés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.matchesToday}</Text>
                <Text style={styles.statName}>Matchs créés</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Chiffres du jour ─────────────────────────────────────────────── */}
        {communityStats && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>LES CHIFFRES DE LA COMMUNAUTÉ</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.matchesToday)}</Text>
                <Text style={styles.statLabel}>Matchs aujourd'hui</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.lettersSent)}</Text>
                <Text style={styles.statLabel}>Lettres échangées</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.giftsSent)}</Text>
                <Text style={styles.statLabel}>Cadeaux envoyés</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.activeMembers)}</Text>
                <Text style={styles.statLabel}>Membres actifs (7j)</Text>
              </View>
            </View>
          </>
        )}

        <Text style={styles.colophon}>— Fin de l'édition du jour —</Text>
      </ScrollView>
    </View>
  );
}

const INK = '#2A2118';
const INK_SOFT = '#5C4B3A';
const RULE = '#B8A377';

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 18, paddingBottom: 100 },

  // ── Masthead ─────────────────────────────────────────────────────────────
  masthead: { alignItems: 'center', paddingTop: 14, paddingBottom: 10 },
  kicker: { fontSize: 13, letterSpacing: 2, color: INK_SOFT, fontFamily: SERIF },
  mastheadTitle: {
    fontSize: 44,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  mastheadTagline: {
    fontSize: 15,
    fontStyle: 'italic',
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 2,
  },
  mastheadRuleThick: { height: 3, backgroundColor: INK, width: '100%', marginTop: 12 },
  mastheadRuleThin: { height: 1, backgroundColor: INK, width: '100%', marginTop: 3 },
  datelineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 6,
  },
  dateline: { fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: INK_SOFT, textTransform: 'capitalize' },

  // ── Encadré "En bref" ────────────────────────────────────────────────────
  briefBox: {
    borderWidth: 1,
    borderColor: RULE,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  briefBoxTitle: {
    fontSize: 13,
    letterSpacing: 1.5,
    fontFamily: SERIF,
    fontWeight: '700',
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 8,
  },
  briefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  briefItem: { alignItems: 'center', flex: 1 },
  briefDivider: { width: 1, height: 28, backgroundColor: RULE },
  briefValue: { fontSize: 21, fontWeight: '700', fontFamily: SERIF, color: INK },
  briefLabel: { fontSize: 13, color: INK_SOFT, marginTop: 2, fontFamily: SERIF },

  sectionRule: { height: 1, backgroundColor: RULE, marginTop: 22, marginBottom: 10 },
  sectionLabel: {
    fontSize: 14,
    letterSpacing: 1.5,
    fontFamily: SERIF,
    fontWeight: '700',
    color: INK_SOFT,
  },

  // ── Gagnants de la semaine ──────────────────────────────────────────────────
  winnersSection: {
    flexDirection: 'row',
    marginTop: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
    gap: 24,
  },
  winnerColumn: {
    alignItems: 'center',
    flex: 1,
  },
  avatarWrapper: {
    marginBottom: 8,
  },
  winnerName: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
    textAlign: 'center',
  },
  winnerVotes: {
    fontSize: 14,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 4,
  },

  // ── Le Refuge ───────────────────────────────────────────────────────────────
  refugeBox: {
    borderWidth: 1,
    borderColor: RULE,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  refugeText: {
    fontSize: 17,
    fontFamily: SERIF,
    color: INK,
    lineHeight: 21,
  },
  refugeHighlight: {
    fontWeight: '700',
    color: INK,
  },
  refugeSubtext: {
    fontSize: 15,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 8,
    fontStyle: 'italic',
  },

  // ── Statistiques ─────────────────────────────────────────────────────────────
  statsSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    width: '45%',
    marginBottom: 16,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
  },
  statName: {
    fontSize: 14,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 4,
    textAlign: 'center',
  },

  // ── Chiffres ─────────────────────────────────────────────────────────────
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  statBox: {
    width: '50%',
    borderWidth: 1,
    borderColor: RULE,
    marginTop: -1,
    marginLeft: -1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  statValue: { fontSize: 24, fontWeight: '700', fontFamily: SERIF, color: INK },
  statLabel: { fontSize: 14, color: INK_SOFT, marginTop: 4, fontFamily: SERIF, textAlign: 'center' },

  colophon: {
    textAlign: 'center',
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 24,
  },
});
