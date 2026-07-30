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
import { getCommunityStats, type CommunityStatsDTO } from '../api/stats';
import { getPublicProfile, type PublicProfileDto } from '../api/profiles';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';

interface NewsItem {
  id: string;
  type: 'news' | 'event' | 'tip' | 'update';
  title: string;
  content: string;
  emoji: string;
  date: string;
}

// Contenu éditorial de l'équipe JeuTaime (annonces/astuces), affiché tel
// quel — ce n'est pas une donnée utilisateur à charger depuis le serveur.
// Les CHIFFRES ci-dessous (Chiffres de la communauté) sont eux bien réels,
// via /api/stats/community.
const mockNews: NewsItem[] = [
  {
    id: '1',
    type: 'news',
    title: 'Bienvenue sur JeuTaime !',
    content: 'Découvrez une nouvelle façon de faire des rencontres à travers le jeu, les histoires collaboratives et les cadeaux virtuels. Amusez-vous !',
    emoji: '🎉',
    date: "Aujourd'hui",
  },
  {
    id: '2',
    type: 'event',
    title: 'Nouveau salon : Café de Paris',
    content: "Un nouveau salon intime pour 4 personnes vient d'ouvrir ! Ambiance cosy et conversation face-à-face garanties.",
    emoji: '☕',
    date: 'Hier',
  },
  {
    id: '3',
    type: 'tip',
    title: 'Astuce du jour',
    content: 'Saviez-vous que vous pouvez envoyer des offrandes aux autres joueurs dans les salons ? Un excellent moyen de briser la glace !',
    emoji: '💡',
    date: 'Il y a 2 jours',
  },
  {
    id: '4',
    type: 'update',
    title: 'Nouvelles activités disponibles !',
    content: 'Pong, Casse-Brique et le Jeu de Cartes sont maintenant disponibles ! Gagnez des pièces en jouant.',
    emoji: '🎮',
    date: 'Il y a 3 jours',
  },
  {
    id: '5',
    type: 'news',
    title: 'Adoptez un compagnon virtuel !',
    content: 'Le refuge est ouvert ! Choisissez parmi 9 animaux adorables, du chien commun au dragon légendaire.',
    emoji: '🐾',
    date: 'Il y a 4 jours',
  },
];

const typeLabels: Record<NewsItem['type'], string> = {
  news: 'Actualité',
  event: 'Événement',
  tip: 'Astuce',
  update: 'Mise à jour',
};

const mockWeeklyWinners = [
  { id: 'testuser2', pseudo: 'testuser2', votes: 48, gender: 'f' as const },
  { id: 'testuser3', pseudo: 'testuser3', votes: 42, gender: 'm' as const },
];

const mockRefugeStats = {
  totalPets: 42,
  waitingAdoption: 12,
};

const mockCommunityStats = {
  duelsLaunched: 247,
  bottlesAtSea: 53,
  lettersSent: 189,
};

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
  const [stats, setStats] = useState<CommunityStatsDTO | null>(null);
  const [winnerProfiles, setWinnerProfiles] = useState<Record<string, PublicProfileDto | null>>({});

  const loadStats = () => {
    getCommunityStats()
      .then(setStats)
      .catch(() => {});
  };

  useEffect(() => {
    loadStats();
    loadWinnerProfiles();
  }, []);

  const loadWinnerProfiles = async () => {
    const profiles: Record<string, PublicProfileDto | null> = {};
    for (const winner of mockWeeklyWinners) {
      try {
        const response = await getPublicProfile(winner.id);
        profiles[winner.id] = response.profile;
      } catch (error) {
        console.error(`Failed to load profile for ${winner.id}:`, error);
        profiles[winner.id] = null;
      }
    }
    setWinnerProfiles(profiles);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadStats();
    setTimeout(() => setRefreshing(false), 600);
  };

  const [headline, ...rest] = mockNews;

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#3A2818" />
        }
      >
        {/* ── Une (masthead) ─────────────────────────────────────────────── */}
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
        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>GAGNANTS DE LA SEMAINE</Text>

        <View style={styles.winnersSection}>
          {mockWeeklyWinners.map((winner, idx) => {
            const profile = winnerProfiles[winner.id];
            const avatarResolution = resolveAvatarConfig(
              winner.id,
              profile?.avatarConfig,
              profile?.gender || winner.gender,
              'JournalScreen'
            );
            return (
              <View key={idx} style={styles.winnerColumn}>
                <TouchableOpacity
                  onPress={() => router.push(`/profiles?userId=${winner.id}`)}
                  style={styles.avatarWrapper}
                >
                  <Avatar size={60} {...avatarResolution.config} />
                </TouchableOpacity>
                <Text style={styles.winnerName}>{winner.pseudo}</Text>
                <Text style={styles.winnerVotes}>{winner.votes} votes</Text>
              </View>
            );
          })}
        </View>

        {/* ── Le Refuge ───────────────────────────────────────────────────── */}
        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>LE REFUGE</Text>

        <View style={styles.refugeBox}>
          <Text style={styles.refugeText}>
            {mockRefugeStats.totalPets} animaux attendent une maison aimante. <Text style={styles.refugeHighlight}>{mockRefugeStats.waitingAdoption} sont en attente d&apos;adoption urgente</Text>.
          </Text>
          <Text style={styles.refugeSubtext}>Aide nos compagnons virtuels à trouver un foyer!</Text>
        </View>

        {/* ── Statistiques du jour ─────────────────────────────────────────── */}
        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>STATISTIQUES DU JOUR</Text>

        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{mockCommunityStats.duelsLaunched}</Text>
            <Text style={styles.statName}>Duels lancés</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{mockCommunityStats.bottlesAtSea}</Text>
            <Text style={styles.statName}>Bouteilles à la mer</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{mockCommunityStats.lettersSent}</Text>
            <Text style={styles.statName}>Lettres envoyées</Text>
          </View>
        </View>

        {/* ── L'Histoire continue ──────────────────────────────────────────── */}
        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>L&apos;HISTOIRE CONTINUE...</Text>

        <View style={styles.storyBox}>
          <Text style={styles.storyText}>
            Dans les salons de JeuTaime, chaque jour apporte son lot de surprises. Deux joueurs se rencontrent, partagent une histoire, échangent des cadeaux. Les compliments fleurissent, les défis se lancent, et l&apos;amitié grandit. Quelle sera votre prochaine aventure?
          </Text>
        </View>

        {/* ── Article principal ───────────────────────────────────────────── */}
        <View style={styles.headlineArticle}>
          <Text style={styles.headlineEyebrow}>{typeLabels[headline.type].toUpperCase()}</Text>
          <Text style={styles.headlineTitle}>{headline.emoji}  {headline.title}</Text>
          <Text style={styles.headlineByline}>{headline.date}</Text>
          <Text style={styles.headlineContent}>{headline.content}</Text>
        </View>

        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>AUTRES ARTICLES</Text>

        {/* ── Colonne d'articles ───────────────────────────────────────────── */}
        {rest.map((item, idx) => (
          <View key={item.id} style={[styles.article, idx > 0 && styles.articleBorder]}>
            <Text style={styles.eyebrow}>{typeLabels[item.type].toUpperCase()} · {item.date}</Text>
            <Text style={styles.articleTitle}>{item.emoji}  {item.title}</Text>
            <Text style={styles.articleContent}>{item.content}</Text>
          </View>
        ))}

        {/* ── Chiffres du jour ─────────────────────────────────────────────── */}
        <View style={styles.sectionRule} />
        <Text style={styles.sectionLabel}>LES CHIFFRES DE LA COMMUNAUTÉ</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats ? formatNumber(stats.matchesToday) : '—'}</Text>
            <Text style={styles.statLabel}>Matchs aujourd'hui</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats ? formatNumber(stats.lettersSent) : '—'}</Text>
            <Text style={styles.statLabel}>Lettres échangées</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats ? formatNumber(stats.giftsSent) : '—'}</Text>
            <Text style={styles.statLabel}>Cadeaux envoyés</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{stats ? formatNumber(stats.activeMembers) : '—'}</Text>
            <Text style={styles.statLabel}>Membres actifs (7j)</Text>
          </View>
        </View>

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

  // ── Article principal ────────────────────────────────────────────────────
  headlineArticle: { marginTop: 20 },
  headlineEyebrow: { fontSize: 14, letterSpacing: 1.2, color: INK_SOFT, fontFamily: SERIF, fontWeight: '700' },
  headlineTitle: {
    fontSize: 26,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
    marginTop: 6,
    lineHeight: 30,
  },
  headlineByline: {
    fontSize: 14,
    fontStyle: 'italic',
    fontFamily: SERIF,
    color: INK_SOFT,
    marginTop: 6,
    marginBottom: 10,
  },
  headlineContent: {
    fontSize: 18,
    fontFamily: SERIF,
    color: INK,
    lineHeight: 22,
  },

  sectionRule: { height: 1, backgroundColor: RULE, marginTop: 22, marginBottom: 10 },
  sectionLabel: {
    fontSize: 14,
    letterSpacing: 1.5,
    fontFamily: SERIF,
    fontWeight: '700',
    color: INK_SOFT,
  },

  // ── Articles secondaires ─────────────────────────────────────────────────
  article: { paddingTop: 16, paddingBottom: 4 },
  articleBorder: { borderTopWidth: 1, borderTopColor: RULE },
  eyebrow: { fontSize: 13, letterSpacing: 1, color: INK_SOFT, fontFamily: SERIF, fontWeight: '700' },
  articleTitle: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: SERIF,
    color: INK,
    marginTop: 5,
    marginBottom: 6,
  },
  articleContent: { fontSize: 17, fontFamily: SERIF, color: INK, lineHeight: 20 },

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
    marginTop: 12,
    marginBottom: 16,
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
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

  // ── L'Histoire continue ──────────────────────────────────────────────────────
  storyBox: {
    borderWidth: 1,
    borderColor: RULE,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginTop: 12,
    marginBottom: 16,
  },
  storyText: {
    fontSize: 17,
    fontFamily: SERIF,
    color: INK,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
