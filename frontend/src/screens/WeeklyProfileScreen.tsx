import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import {
  getWeeklyProfile,
  voteWeeklyProfile,
  type WeeklyProfileDTO,
  type WeeklyProfileCandidateDTO,
  type WeeklyProfileWinnerDTO,
} from '../api/weeklyProfile';

const VOTE_COST = 5;

export default function WeeklyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadWallet = useStore(s => s.loadWallet);

  const [data, setData] = useState<WeeklyProfileDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'winners' | 'vote'>('winners');

  const load = () => {
    setLoading(true);
    getWeeklyProfile()
      .then(setData)
      .catch(() => setError('Impossible de charger le profil de la semaine'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleVote = async (candidateId: string) => {
    setError(null);
    setVoting(candidateId);
    try {
      const updated = await voteWeeklyProfile(candidateId);
      setData(updated);
      await loadWallet();
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer ton vote");
    } finally {
      setVoting(null);
    }
  };

  const ProfileCard = ({
    profile,
    isWinner = false,
    canVote = false,
    hasVoted = false,
  }: {
    profile: WeeklyProfileCandidateDTO | WeeklyProfileWinnerDTO;
    isWinner?: boolean;
    canVote?: boolean;
    hasVoted?: boolean;
  }) => {
    const avatarResolution = resolveAvatarConfig(
      profile.id,
      profile.avatarConfig,
      profile.gender,
      'WeeklyProfileScreen'
    );
    return (
      <View style={[styles.profileCard, isWinner && styles.winnerCard]}>
        {isWinner && (
          <View style={styles.crownBadge}>
            <Text style={styles.crownEmoji}>👑</Text>
            <Text style={styles.crownText}>GAGNANT{profile.gender === 'FEMME' ? 'E' : ''}</Text>
          </View>
        )}
        <Avatar size={80} {...avatarResolution.config} />
        <Text style={styles.profileName}>{profile.pseudo}, {profile.age}</Text>
        <Text style={styles.profileCity}>📍 {profile.city}</Text>
        {!!profile.bio && (
          <View style={styles.bioBox}>
            <Text style={styles.bioText}>"{profile.bio}"</Text>
          </View>
        )}
        <View style={styles.voteInfo}>
          <Text style={styles.voteCount}>❤️ {profile.votes} vote{profile.votes > 1 ? 's' : ''}</Text>
        </View>
        {canVote && !hasVoted && (
          <TouchableOpacity
            style={[styles.voteBtn, voting === profile.id && styles.voteBtnDisabled]}
            onPress={() => handleVote(profile.id)}
            disabled={voting !== null}
          >
            {voting === profile.id ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.voteBtnText}>👍 Voter ({VOTE_COST} 🪙)</Text>
            )}
          </TouchableOpacity>
        )}
        {canVote && hasVoted && (
          <View style={styles.votedBadge}>
            <Text style={styles.votedText}>✅ Voté !</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Profil de la semaine</Text>
        <Text style={styles.subtitle}>Votez pour les meilleures bios !</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'winners' && styles.tabActive]}
          onPress={() => setActiveTab('winners')}
        >
          <Text style={[styles.tabText, activeTab === 'winners' && styles.tabTextActive]}>👑 Gagnants</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vote' && styles.tabActive]}
          onPress={() => setActiveTab('vote')}
        >
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>🗳️ Voter</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#8B2E3C" />
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {!!error && <Text style={styles.errorText}>{error}</Text>}

          {activeTab === 'winners' ? (
            <>
              <Text style={styles.sectionTitle}>👸 Profil féminin de la semaine dernière</Text>
              {data?.winners.female ? (
                <ProfileCard profile={data.winners.female} isWinner />
              ) : (
                <Text style={styles.emptyText}>Pas encore de gagnante — les votes de la semaine passée n'ont pas suffi.</Text>
              )}

              <Text style={styles.sectionTitle}>🤴 Profil masculin de la semaine dernière</Text>
              {data?.winners.male ? (
                <ProfileCard profile={data.winners.male} isWinner />
              ) : (
                <Text style={styles.emptyText}>Pas encore de gagnant — les votes de la semaine passée n'ont pas suffi.</Text>
              )}
            </>
          ) : (
            <>
              <View style={styles.rulesBox}>
                <Text style={styles.rulesTitle}>📋 Règles du concours</Text>
                <Text style={styles.rulesText}>• 1 vote = {VOTE_COST} pièces</Text>
                <Text style={styles.rulesText}>• 1 vote par semaine</Text>
                <Text style={styles.rulesText}>• Résultats la semaine suivante</Text>
                <Text style={styles.rulesTip}>💡 Une bonne bio attire plus de votes !</Text>
              </View>

              <Text style={styles.sectionTitle}>🗳️ Candidats de cette semaine</Text>

              {data && data.candidates.length === 0 && (
                <Text style={styles.emptyText}>Pas encore de candidats cette semaine.</Text>
              )}

              {data?.candidates.map(candidate => (
                <ProfileCard
                  key={candidate.id}
                  profile={candidate}
                  canVote
                  hasVoted={data.votedCandidateId === candidate.id}
                />
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47' },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },

  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, marginHorizontal: 4, backgroundColor: '#F5F5F5' },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#8B6F47' },
  tabTextActive: { color: '#3A2818' },

  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },

  errorText: { fontSize: 13, color: '#C0392B', textAlign: 'center', marginBottom: 12 },
  emptyText: { fontSize: 14, color: '#8B6F47', textAlign: 'center', marginBottom: 16, fontStyle: 'italic' },

  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 12, marginTop: 8 },

  // Profile card
  profileCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  winnerCard: { borderWidth: 3, borderColor: '#FFD700', backgroundColor: '#FFFEF7' },
  crownBadge: { position: 'absolute', top: -12, backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  crownEmoji: { fontSize: 16, marginRight: 4 },
  crownText: { fontSize: 12, fontWeight: '700', color: '#8B6F47' },
  profileName: { fontSize: 24, fontWeight: '700', color: '#3A2818', marginTop: 12 },
  profileCity: { fontSize: 15, color: '#8B6F47', marginTop: 4 },
  bioBox: { backgroundColor: '#FFF8E7', borderRadius: 16, padding: 16, marginTop: 16, width: '100%' },
  bioText: { fontSize: 15, color: '#5D4037', fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  voteInfo: { marginTop: 16 },
  voteCount: { fontSize: 18, fontWeight: '700', color: '#E91E63' },
  voteBtn: { marginTop: 16, backgroundColor: '#E91E63', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25, minWidth: 160, alignItems: 'center' },
  voteBtnDisabled: { opacity: 0.7 },
  voteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  votedBadge: { marginTop: 16, backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  votedText: { color: '#FFF', fontWeight: '700' },

  // Rules box
  rulesBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  rulesTitle: { fontSize: 17, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rulesText: { fontSize: 14, color: '#5D4037', marginBottom: 6 },
  rulesTip: { fontSize: 13, color: '#DAA520', fontWeight: '600', marginTop: 8 },
});
