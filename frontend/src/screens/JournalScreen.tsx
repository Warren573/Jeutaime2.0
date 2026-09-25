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
import { getJournalEdition, type JournalEditionDTO } from '../api/journal';

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
  const [edition, setEdition] = useState<JournalEditionDTO | null>(null);

  const loadAllData = async () => {
    try {
      const [commStats, dayStats, refStats, winners, personalEdition] = await Promise.all([
        getCommunityStats().catch(err => {
          console.error('[JournalScreen] Error loading community stats:', err);
          return null;
        }),
        getDailyStats().catch(err => {
          console.error('[JournalScreen] Error loading daily stats:', err);
          return null;
        }),
        getRefugeStats().catch(err => {
          console.error('[JournalScreen] Error loading refuge stats:', err);
          return null;
        }),
        getWeeklyProfileWinners().catch(err => {
          console.error('[JournalScreen] Error loading weekly winners:', err);
          return null;
        }),
        getJournalEdition().catch(err => {
          console.error('[JournalScreen] Error loading personal edition:', err);
          return null;
        }),
      ]);
      if (commStats) setCommunityStats(commStats);
      if (dayStats) setDailyStats(dayStats);
      if (refStats) setRefugeStats(refStats);
      if (winners) setWeeklyWinners(winners);
      if (personalEdition) setEdition(personalEdition);
    } catch (error) {
      console.error('[JournalScreen] Unexpected error loading data:', error);
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
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 150 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A2818" />
        }
      >
        {/* ── Masthead ─────────────────────────────────────────────── */}
        <View style={styles.masthead}>
          <Text style={styles.mastheadTitle}>JOURNAL</Text>
          <View style={styles.mastheadRuleThin} />
          <Text style={styles.mastheadTagline}>Actualités de la communauté</Text>
          <View style={styles.mastheadRuleThin} />
          <View style={styles.datelineRow}>
            <Text style={styles.dateline}>{todayHeadline()}</Text>
          </View>
          <Text style={styles.editionNote}>L'ÉDITION DU JOUR · GRATUIT</Text>
        </View>

        {edition && edition.personalEvents.length > 0 && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>VOTRE JOURNÉE</Text>
            <View style={styles.personalSection}>
              {edition.personalEvents.map((event) => (
                <View key={event.id} style={styles.personalEvent}>
                  <Text style={styles.personalEventText}>{event.text}</Text>
                  <Text style={styles.personalEventTime}>
                    {new Date(event.occurredAt).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

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
        {weeklyWinners && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>GAGNANTS DE LA SEMAINE</Text>

            {weeklyWinners.male || weeklyWinners.female ? (
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
            ) : (
              <View style={styles.emptyStateBox}>
                <Text style={styles.emptyStateText}>Aucun résultat cette semaine.</Text>
              </View>
            )}
          </>
        )}

        {/* ── Le Refuge ───────────────────────────────────────────────────── */}
        {refugeStats && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>LE REFUGE</Text>

            <View style={styles.refugeBox}>
              <Text style={styles.refugeText}>
                <Text style={styles.refugeHighlight}>{refugeStats.activeRefuges}</Text> refuge{refugeStats.activeRefuges !== 1 ? 's' : ''} en cours. <Text style={styles.refugeHighlight}>{refugeStats.awaitingReveal}</Text> révélation{refugeStats.awaitingReveal !== 1 ? 's' : ''} en attente.
              </Text>
              <Text style={styles.refugeSubtext}>{refugeStats.completedRefuges} refuge{refugeStats.completedRefuges !== 1 ? 's' : ''} terminé{refugeStats.completedRefuges !== 1 ? 's' : ''}.</Text>
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
                <Text style={styles.statNumber}>{dailyStats.matchesToday}</Text>
                <Text style={styles.statName}>Matchs créés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.lettersSentToday}</Text>
                <Text style={styles.statName}>Lettres envoyées</Text>
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
                <Text style={styles.statNumber}>{dailyStats.duelsPlayedToday}</Text>
                <Text style={styles.statName}>Duels lancés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.duelsResolvedToday}</Text>
                <Text style={styles.statName}>Duels terminés</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.registrationsToday}</Text>
                <Text style={styles.statName}>Nouveaux inscrits</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statNumber}>{dailyStats.activeToday}</Text>
                <Text style={styles.statName}>Connectés aujourd’hui</Text>
              </View>
            </View>
          </>
        )}

        {/* ── Chiffres de la communauté ────────────────────────────────────── */}
        {communityStats && (
          <>
            <View style={styles.sectionRule} />
            <Text style={styles.sectionLabel}>LES CHIFFRES DE LA COMMUNAUTÉ</Text>

            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.matchesToday)}</Text>
                <Text style={styles.statLabel}>Matchs (depuis le lancement)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.lettersSent)}</Text>
                <Text style={styles.statLabel}>Lettres échangées (depuis le lancement)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.giftsSent)}</Text>
                <Text style={styles.statLabel}>Offrandes envoyées (depuis le lancement)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.registrations7d)}</Text>
                <Text style={styles.statLabel}>Nouveaux inscrits (7 jours)</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{formatNumber(communityStats.active7d)}</Text>
                <Text style={styles.statLabel}>Connectés (7 jours)</Text>
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
  scrollContent: { paddingHorizontal: 18, paddingTop: 2 },

  // ── Masthead ─────────────────────────────────────────────────────────────
  masthead: { alignItems: 'center', paddingTop: 10, paddingBottom: 12 },
  kicker: { fontSize: 11, letterSpacing: 2.4, color: INK_SOFT, fontFamily: SERIF, textTransform: 'uppercase' },
  mastheadTitle: {
    fontSize: 68,
    lineHeight: 72,
    fontWeight: '700',
    fontFamily: SERIF,
    color: '#1E1813',
    letterSpacing: 1.2,
  },
  mastheadTagline: {
    fontSize: 17,
    fontFamily: SERIF,
    color: '#2F261D',
    marginVertical: 8,
  },
  mastheadRuleThick: { height: 3, backgroundColor: INK, width: '100%', marginTop: 10 },
  mastheadRuleThin: { height: 1, backgroundColor: INK, width: '100%', marginTop: 4 },
  datelineRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    marginTop: 10,
  },
  dateline: { fontSize: 14, fontFamily: SERIF, fontStyle: 'italic', color: INK_SOFT, textTransform: 'capitalize', letterSpacing: 0.25 },
  editionNote: {
    fontSize: 10,
    letterSpacing: 2,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 7,
  },

  personalSection: {
    marginTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: RULE,
  },
  personalEvent: {
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RULE,
  },
  personalEventText: {
    fontSize: 16,
    lineHeight: 22,
    fontFamily: SERIF,
    color: INK,
  },
  personalEventTime: {
    fontSize: 12,
    marginTop: 4,
    fontFamily: SERIF,
    color: INK_SOFT,
  },

  // ── Encadré "En bref" ────────────────────────────────────────────────────
  briefBox: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: INK,
    marginTop: 18,
    paddingVertical: 12,
    paddingHorizontal: 4,
    backgroundColor: 'transparent',
  },
  briefBoxTitle: {
    fontSize: 13.5,
    letterSpacing: 2,
    fontFamily: SERIF,
    fontWeight: '700',
    color: INK_SOFT,
    textAlign: 'center',
    marginBottom: 10,
  },
  briefRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  briefItem: { alignItems: 'center', flex: 1 },
  briefDivider: { width: 1, height: 28, backgroundColor: RULE },
  briefValue: { fontSize: 21, fontWeight: '700', fontFamily: SERIF, color: INK },
  briefLabel: { fontSize: 13, color: INK_SOFT, marginTop: 2, fontFamily: SERIF },

  sectionRule: { height: 1, backgroundColor: INK, marginTop: 22, marginBottom: 8 },
  sectionLabel: {
    fontSize: 18,
    letterSpacing: 0.8,
    fontFamily: SERIF,
    fontWeight: '700',
    color: '#211A14',
    marginBottom: 4,
  },

  // ── Gagnants de la semaine ──────────────────────────────────────────────────
  winnersSection: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 16,
    justifyContent: 'space-around',
    gap: 18,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: INK,
    paddingVertical: 14,
    backgroundColor: 'transparent',
  },
  emptyStateBox: {
    marginTop: 12,
    marginBottom: 16,
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: SERIF,
    color: INK_SOFT,
    fontStyle: 'italic',
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
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: INK,
    paddingVertical: 14,
    paddingHorizontal: 2,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: 'transparent',
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
    marginTop: 8,
    marginBottom: 16,
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: INK,
    paddingTop: 10,
    paddingBottom: 2,
  },
  statItem: {
    alignItems: 'center',
    width: '48%',
    marginBottom: 14,
    paddingVertical: 4,
  },
  statNumber: {
    fontSize: 26,
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
