import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import {
  getWeeklyProfileState,
  voteForDuel,
  getWeeklyProfileWinners,
  type WeeklyProfileStateDTO,
  type WeeklyProfileWinnersDTO,
  type DuelProfileDTO,
} from '../api/weeklyProfile';

const VOTE_REWARD = 5;

export default function WeeklyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const loadWallet = useStore(s => s.loadWallet);

  const [activeTab, setActiveTab] = useState<'winners' | 'vote'>('vote');

  const [state, setState] = useState<WeeklyProfileStateDTO | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash] = useState(new Animated.Value(0));

  const [winners, setWinners] = useState<WeeklyProfileWinnersDTO | null>(null);
  const [winnersLoading, setWinnersLoading] = useState(true);

  const loadState = () => {
    setStateLoading(true);
    getWeeklyProfileState()
      .then(setState)
      .catch(() => setError('Impossible de charger le duel du jour'))
      .finally(() => setStateLoading(false));
  };

  useEffect(() => {
    loadState();
    getWeeklyProfileWinners()
      .then(setWinners)
      .catch(() => setWinners(null))
      .finally(() => setWinnersLoading(false));
  }, []);

  const playFlash = () => {
    flash.setValue(1);
    Animated.timing(flash, { toValue: 0, duration: 500, useNativeDriver: true }).start();
  };

  const handleVote = async (chosenId: string) => {
    if (!state?.duel) return;
    setError(null);
    setVoting(chosenId);
    try {
      const updated = await voteForDuel(state.duel.duelId, chosenId);
      setState(updated);
      playFlash();
      await loadWallet();
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer ton vote");
    } finally {
      setVoting(null);
    }
  };

  const DuelCard = ({ profile, disabled }: { profile: DuelProfileDTO; disabled: boolean }) => (
    <View style={styles.duelCard}>
      {profile.avatarConfig && (
        <View style={styles.avatarContainer}>
          <Avatar size={80} {...(profile.avatarConfig as any)} />
        </View>
      )}
      <Text style={styles.duelName}>{profile.pseudo}, {profile.age}</Text>
      <Text style={styles.duelCity}>📍 {profile.city}</Text>
      {!!profile.bio && (
        <View style={styles.bioBox}>
          <Text style={styles.bioText}>&quot;{profile.bio}&quot;</Text>
        </View>
      )}
      <TouchableOpacity
        style={[styles.voteBtn, disabled && styles.voteBtnDisabled]}
        onPress={() => handleVote(profile.id)}
        disabled={disabled}
      >
        {voting === profile.id ? (
          <ActivityIndicator size="small" color="#FFF" />
        ) : (
          <Text style={styles.voteBtnText}>👍 Voter</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const WinnerCard = ({ profile, label, emoji }: { profile: WeeklyProfileWinnersDTO['male']; label: string; emoji: string }) => (
    <>
      <Text style={styles.sectionTitle}>{emoji} {label}</Text>
      {profile ? (
        <View style={styles.winnerCard}>
          {profile.avatarConfig && (
            <View style={styles.avatarContainer}>
              <Avatar size={100} {...(profile.avatarConfig as any)} />
            </View>
          )}
          <Text style={styles.duelName}>{profile.pseudo}, {profile.age}</Text>
          <Text style={styles.duelCity}>📍 {profile.city}</Text>
          {!!profile.bio && (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>&quot;{profile.bio}&quot;</Text>
            </View>
          )}
          <Text style={styles.voteCount}>❤️ {profile.totalVotes} vote{profile.totalVotes > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <Text style={styles.emptyText}>Pas encore de gagnant·e &mdash; les votes de la semaine passée n&apos;ont pas suffi.</Text>
      )}
    </>
  );

  const limitReached = !!state?.limitReached;
  const disabled = limitReached || voting !== null || !state?.duel;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Profil de la semaine</Text>
        <Text style={styles.subtitle}>Duel anonyme — pseudo, âge, ville, bio</Text>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vote' && styles.tabActive]}
          onPress={() => setActiveTab('vote')}
        >
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>🗳️ Voter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'winners' && styles.tabActive]}
          onPress={() => setActiveTab('winners')}
        >
          <Text style={[styles.tabText, activeTab === 'winners' && styles.tabTextActive]}>👑 Gagnants</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'vote' ? (
        stateLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#8B2E3C" />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.statusBar}>
              <Text style={styles.statusText}>
                Votes restants aujourd&apos;hui : {state?.remainingToday ?? 0} / {state?.dailyLimit ?? 10}
              </Text>
              <Text style={styles.statusReward}>Récompense : +{VOTE_REWARD} pièces par vote</Text>
            </View>

            <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flash }]}>
              <Text style={styles.flashText}>+{VOTE_REWARD} 🪙</Text>
            </Animated.View>

            {limitReached && (
              <Text style={styles.emptyText}>
                Tu as atteint ta limite quotidienne de votes. Reviens demain pour continuer !
              </Text>
            )}

            {!limitReached && state?.notEnoughCandidates && (
              <Text style={styles.emptyText}>Pas assez de profils disponibles pour composer un duel pour le moment.</Text>
            )}

            {!limitReached && state?.duel && (
              <>
                <DuelCard profile={state.duel.candidateA} disabled={disabled} />
                <Text style={styles.vsText}>VS</Text>
                <DuelCard profile={state.duel.candidateB} disabled={disabled} />
              </>
            )}
          </ScrollView>
        )
      ) : (
        winnersLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color="#8B2E3C" />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <WinnerCard profile={winners?.female ?? null} label="Profil féminin de la semaine" emoji="👸" />
            <WinnerCard profile={winners?.male ?? null} label="Profil masculin de la semaine" emoji="🤴" />
          </ScrollView>
        )
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

  statusBar: { backgroundColor: '#FFF', borderRadius: 16, padding: 14, marginBottom: 16, alignItems: 'center', borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  statusText: { fontSize: 15, fontWeight: '700', color: '#3A2818' },
  statusReward: { fontSize: 13, color: '#8B6F47', marginTop: 4 },

  flashOverlay: { position: 'absolute', top: 8, alignSelf: 'center', zIndex: 10 },
  flashText: { fontSize: 20, fontWeight: '800', color: '#DAA520' },

  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 12, marginTop: 8 },

  avatarContainer: { marginBottom: 16 },
  duelCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 8, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  winnerCard: { backgroundColor: '#FFFEF7', borderWidth: 3, borderColor: '#FFD700', borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center' },
  duelName: { fontSize: 22, fontWeight: '700', color: '#3A2818' },
  duelCity: { fontSize: 15, color: '#8B6F47', marginTop: 4 },
  bioBox: { backgroundColor: '#FFF8E7', borderRadius: 16, padding: 16, marginTop: 16, width: '100%' },
  bioText: { fontSize: 15, color: '#5D4037', fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  voteCount: { fontSize: 16, fontWeight: '700', color: '#E91E63', marginTop: 14 },
  vsText: { textAlign: 'center', fontSize: 18, fontWeight: '800', color: '#8B6F47', marginVertical: 8 },
  voteBtn: { marginTop: 16, backgroundColor: '#E91E63', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25, minWidth: 160, alignItems: 'center' },
  voteBtnDisabled: { opacity: 0.5 },
  voteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
