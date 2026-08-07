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
import { AppBackButton } from '../components/AppBackButton';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';
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
          <Avatar size={82} {...(profile.avatarConfig as any)} />
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
        activeOpacity={0.78}
      >
        {voting === profile.id ? (
          <ActivityIndicator size="small" color={APP_COLORS.white} />
        ) : (
          <Text style={styles.voteBtnText}>Voter pour ce profil</Text>
        )}
      </TouchableOpacity>
    </View>
  );

  const WinnerCard = ({ profile, label, emoji }: { profile: WeeklyProfileWinnersDTO['male']; label: string; emoji: string }) => (
    <>
      <Text style={styles.sectionTitle}>{emoji} {label}</Text>
      {profile ? (
        <View style={styles.winnerCard}>
          <View style={styles.crownBadge}><Text style={styles.crownText}>👑</Text></View>
          {profile.avatarConfig && (
            <View style={styles.avatarContainer}>
              <Avatar size={102} {...(profile.avatarConfig as any)} />
            </View>
          )}
          <Text style={styles.duelName}>{profile.pseudo}, {profile.age}</Text>
          <Text style={styles.duelCity}>📍 {profile.city}</Text>
          {!!profile.bio && (
            <View style={styles.bioBox}>
              <Text style={styles.bioText}>&quot;{profile.bio}&quot;</Text>
            </View>
          )}
          <Text style={styles.voteCount}>♥ {profile.totalVotes} vote{profile.totalVotes > 1 ? 's' : ''}</Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Pas encore de gagnant·e pour cette catégorie.</Text>
        </View>
      )}
    </>
  );

  const limitReached = !!state?.limitReached;
  const disabled = limitReached || voting !== null || !state?.duel;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>COMMUNAUTÉ</Text>
          <Text style={styles.title}>Profil de la semaine</Text>
          <Text style={styles.subtitle}>Vote selon le profil, pas selon une galerie de photos.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'vote' && styles.tabActive]}
          onPress={() => setActiveTab('vote')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>Voter</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'winners' && styles.tabActive]}
          onPress={() => setActiveTab('winners')}
          activeOpacity={0.75}
        >
          <Text style={[styles.tabText, activeTab === 'winners' && styles.tabTextActive]}>Gagnants</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'vote' ? (
        stateLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {!!error && <Text style={styles.errorText}>{error}</Text>}

            <View style={styles.statusBar}>
              <View>
                <Text style={styles.statusLabel}>Votes restants aujourd'hui</Text>
                <Text style={styles.statusValue}>{state?.remainingToday ?? 0} / {state?.dailyLimit ?? 10}</Text>
              </View>
              <View style={styles.rewardPill}>
                <Text style={styles.rewardText}>+{VOTE_REWARD} 🪙 / vote</Text>
              </View>
            </View>

            <Animated.View pointerEvents="none" style={[styles.flashOverlay, { opacity: flash }]}>
              <Text style={styles.flashText}>+{VOTE_REWARD} 🪙</Text>
            </Animated.View>

            {limitReached && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Tu as atteint ta limite quotidienne. Reviens demain pour continuer.</Text>
              </View>
            )}

            {!limitReached && state?.notEnoughCandidates && (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Pas assez de profils disponibles pour composer un duel pour le moment.</Text>
              </View>
            )}

            {!limitReached && state?.duel && (
              <>
                <DuelCard profile={state.duel.candidateA} disabled={disabled} />
                <View style={styles.vsWrap}><Text style={styles.vsText}>OU</Text></View>
                <DuelCard profile={state.duel.candidateB} disabled={disabled} />
              </>
            )}
          </ScrollView>
        )
      ) : (
        winnersLoading ? (
          <View style={styles.centerContent}>
            <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
          </View>
        ) : (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <WinnerCard profile={winners?.female ?? null} label="Profil féminin de la semaine" emoji="♀" />
            <WinnerCard profile={winners?.male ?? null} label="Profil masculin de la semaine" emoji="♂" />
          </ScrollView>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    backgroundColor: APP_COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', color: APP_COLORS.muted, letterSpacing: 2 },
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 11, color: APP_COLORS.muted, marginTop: 3, textAlign: 'center' },

  tabsRow: {
    flexDirection: 'row',
    marginHorizontal: APP_SPACING.md,
    marginTop: APP_SPACING.md,
    padding: 4,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: APP_RADIUS.sm },
  tabActive: { backgroundColor: APP_COLORS.paper, ...(APP_SHADOWS.card ?? {}) },
  tabText: { fontSize: 13, fontWeight: '700', color: APP_COLORS.muted },
  tabTextActive: { color: APP_COLORS.burgundy },

  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: APP_SPACING.md, paddingBottom: 72 },

  errorText: { fontSize: 13, color: APP_COLORS.danger, textAlign: 'center', marginBottom: APP_SPACING.sm },
  emptyCard: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.lg,
    marginBottom: APP_SPACING.md,
  },
  emptyText: { fontSize: 13, color: APP_COLORS.muted, textAlign: 'center', lineHeight: 19 },

  statusBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    ...(APP_SHADOWS.card ?? {}),
  },
  statusLabel: { fontSize: 11, color: APP_COLORS.muted, marginBottom: 3 },
  statusValue: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink },
  rewardPill: { backgroundColor: APP_COLORS.backgroundWarm, borderRadius: APP_RADIUS.pill, paddingHorizontal: 11, paddingVertical: 7 },
  rewardText: { fontSize: 11, fontWeight: '800', color: APP_COLORS.gold },

  flashOverlay: { position: 'absolute', top: 8, alignSelf: 'center', zIndex: 10 },
  flashText: { fontSize: 19, fontWeight: '900', color: APP_COLORS.gold },

  sectionTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink, marginBottom: APP_SPACING.sm, marginTop: APP_SPACING.sm },

  avatarContainer: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: APP_COLORS.paperSoft,
    marginBottom: APP_SPACING.md,
  },
  duelCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.xl,
    padding: APP_SPACING.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    ...(APP_SHADOWS.card ?? {}),
  },
  winnerCard: {
    position: 'relative',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.xl,
    padding: APP_SPACING.lg,
    marginBottom: APP_SPACING.lg,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: APP_COLORS.goldSoft,
    ...(APP_SHADOWS.elevated ?? {}),
  },
  crownBadge: { position: 'absolute', top: -14, right: 18, backgroundColor: APP_COLORS.backgroundWarm, borderRadius: APP_RADIUS.pill, padding: 6, borderWidth: 1, borderColor: APP_COLORS.goldSoft },
  crownText: { fontSize: 17 },
  duelName: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink },
  duelCity: { fontSize: 13, color: APP_COLORS.muted, marginTop: 4 },
  bioBox: { backgroundColor: APP_COLORS.paperSoft, borderRadius: APP_RADIUS.md, padding: APP_SPACING.md, marginTop: APP_SPACING.md, width: '100%' },
  bioText: { fontSize: 13, color: APP_COLORS.text, lineHeight: 20, textAlign: 'center' },
  voteCount: { fontSize: 13, fontWeight: '800', color: APP_COLORS.burgundy, marginTop: APP_SPACING.md },
  vsWrap: { alignSelf: 'center', marginVertical: 8, backgroundColor: APP_COLORS.paperSoft, paddingHorizontal: 12, paddingVertical: 5, borderRadius: APP_RADIUS.pill },
  vsText: { fontSize: 10, fontWeight: '900', color: APP_COLORS.muted, letterSpacing: 1.1 },
  voteBtn: {
    marginTop: APP_SPACING.md,
    minHeight: 48,
    width: '100%',
    backgroundColor: APP_COLORS.burgundy,
    paddingHorizontal: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnDisabled: { opacity: 0.45 },
  voteBtnText: { color: APP_COLORS.white, fontWeight: '800', fontSize: 14 },
});
