import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DuelCard from '../components/DuelCard';
import ChoiceButton from '../components/ChoiceButton';
import {
  DUEL_CHOICES,
  generateJournalMessage,
  type DuelChoice,
  type DuelResult,
} from '../logic/duelEngine';
import {
  declinePrivateDuel,
  getPrivateDuel,
  listPrivateDuels,
  rematchPrivateDuel,
  submitPrivateDuelChoice,
  type PrivateDuelChoice,
  type PrivateDuelDTO,
} from '../api/privateDuels';

interface Score {
  wins: number;
  losses: number;
  draws: number;
}

function toApiChoice(choice: DuelChoice): PrivateDuelChoice {
  if (choice.key === 'rock') return 'ROCK';
  if (choice.key === 'paper') return 'PAPER';
  return 'SCISSORS';
}

function fromApiChoice(choice: PrivateDuelChoice | null): DuelChoice | null {
  if (!choice) return null;
  const key = choice === 'ROCK' ? 'rock' : choice === 'PAPER' ? 'paper' : 'scissors';
  return DUEL_CHOICES.find((item) => item.key === key) ?? null;
}

function mapResult(result: PrivateDuelDTO['result']): DuelResult {
  if (result === 'WIN') return 'win';
  if (result === 'LOSE') return 'lose';
  if (result === 'DRAW') return 'draw';
  return 'pending';
}

export default function DuelPlayScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ duelId?: string }>();
  const duelId = typeof params.duelId === 'string' ? params.duelId : '';

  const [duel, setDuel] = useState<PrivateDuelDTO | null>(null);
  const [score, setScore] = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rematching, setRematching] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const playerScale = useRef(new Animated.Value(1)).current;
  const opponentScale = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const animateBattle = () => {
    resultOpacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(playerScale, { toValue: 1.12, useNativeDriver: true, speed: 40 }),
        Animated.spring(opponentScale, { toValue: 1.12, useNativeDriver: true, speed: 40 }),
      ]),
      Animated.parallel([
        Animated.spring(playerScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(opponentScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const refreshScore = async (current: PrivateDuelDTO) => {
    try {
      const all = await listPrivateDuels();
      const resolved = all.filter(
        (item) =>
          item.status === 'RESOLVED' &&
          item.opponentId === current.opponentId,
      );
      setScore({
        wins: resolved.filter((item) => item.result === 'WIN').length,
        losses: resolved.filter((item) => item.result === 'LOSE').length,
        draws: resolved.filter((item) => item.result === 'DRAW').length,
      });
    } catch {
      // Le duel reste jouable même si l'historique est temporairement indisponible.
    }
  };

  const loadDuel = async (silent = false) => {
    if (!duelId) {
      setError('Duel introuvable.');
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      const data = await getPrivateDuel(duelId);
      setDuel((previous) => {
        if (previous?.status !== 'RESOLVED' && data.status === 'RESOLVED') {
          setTimeout(animateBattle, 0);
        }
        return data;
      });
      setError(null);
      await refreshScore(data);
    } catch (err: any) {
      if (!silent) setError(err?.message || 'Impossible de charger ce duel.');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    setDuel(null);
    setError(null);
    void loadDuel(false);
  }, [duelId]);

  useEffect(() => {
    if (!duel || duel.status !== 'PENDING') return;

    const timer = setInterval(() => {
      void loadDuel(true);
    }, 2500);

    return () => clearInterval(timer);
  }, [duel?.id, duel?.status]);

  const playerChoice = fromApiChoice(duel?.myChoice ?? null);
  const opponentChoice = fromApiChoice(duel?.opponentChoice ?? null);
  const result = duel ? mapResult(duel.result) : 'pending';

  const pendingLabel = useMemo(() => {
    if (!duel) return 'Chargement…';
    if (!duel.hasPlayed) return 'Choisissez une option';
    if (!duel.opponentHasPlayed) return `En attente de ${duel.opponentPseudo}…`;
    return 'Résultat en cours…';
  }, [duel]);

  const journalMsg = useMemo(() => {
    if (!duel || duel.status !== 'RESOLVED' || !playerChoice) return '';
    return generateJournalMessage({
      result,
      playerName: duel.myPseudo,
      opponentName: duel.opponentPseudo,
      playerChoice,
    });
  }, [duel?.id, duel?.status, duel?.result, playerChoice?.key]);

  const handlePlay = async (choice: DuelChoice) => {
    if (!duel || duel.status !== 'PENDING' || duel.hasPlayed || submitting) return;

    try {
      setSubmitting(true);
      setError(null);
      const updated = await submitPrivateDuelChoice(duel.id, toApiChoice(choice));
      setDuel(updated);
      await refreshScore(updated);
      if (updated.status === 'RESOLVED') animateBattle();
    } catch (err: any) {
      setError(err?.message || "Impossible d'enregistrer ton choix.");
      await loadDuel(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!duel || duel.status !== 'PENDING' || duel.isChallenger || declining) return;
    try {
      setDeclining(true);
      setError(null);
      const updated = await declinePrivateDuel(duel.id);
      setDuel(updated);
    } catch (err: any) {
      setError(err?.message || 'Impossible de décliner ce duel.');
    } finally {
      setDeclining(false);
    }
  };

  const handleRematch = async () => {
    if (!duel || duel.status !== 'RESOLVED' || rematching) return;

    try {
      setRematching(true);
      setError(null);
      const next = await rematchPrivateDuel(duel.id);
      router.replace({ pathname: '/duel/play', params: { duelId: next.id } });
    } catch (err: any) {
      setError(err?.message || 'Impossible de lancer la revanche.');
    } finally {
      setRematching(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color="#7A1A1A" />
      </View>
    );
  }

  if (!duel) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>{error || 'Duel introuvable.'}</Text>
        <Pressable style={styles.replayBtn} onPress={() => router.back()}>
          <Text style={styles.replayText}>Retour</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Retour</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Duel en cours</Text>
          <View style={{ width: 60 }} />
        </View>

        {!!error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <DuelCard
          playerName={duel.myPseudo}
          opponentName={duel.opponentPseudo}
          playerChoice={playerChoice}
          opponentChoice={opponentChoice}
          playerScale={playerScale}
          opponentScale={opponentScale}
          result={result}
          pendingLabel={pendingLabel}
        />

        <View style={styles.scoreRow}>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{score.wins}</Text>
            <Text style={styles.scoreLabel}>Victoires</Text>
          </View>
          <View style={[styles.scoreItem, styles.scoreItemCenter]}>
            <Text style={styles.scoreValue}>{score.draws}</Text>
            <Text style={styles.scoreLabel}>Nuls</Text>
          </View>
          <View style={styles.scoreItem}>
            <Text style={styles.scoreValue}>{score.losses}</Text>
            <Text style={styles.scoreLabel}>Défaites</Text>
          </View>
        </View>

        {duel.status === 'PENDING' && !duel.hasPlayed && (
          <>
          <View style={styles.choicesRow}>
            {DUEL_CHOICES.map((choice) => (
              <ChoiceButton
                key={choice.key}
                choice={choice}
                onPress={handlePlay}
                disabled={submitting}
              />
            ))}
          </View>
          {!duel.isChallenger && (
            <Pressable
              style={styles.declineBtn}
              onPress={() => void handleDecline()}
              disabled={declining}
            >
              {declining ? (
                <ActivityIndicator size="small" color="#7A5C3A" />
              ) : (
                <Text style={styles.declineText}>Décliner poliment</Text>
              )}
            </Pressable>
          )}
          </>
        )}

        {duel.status === 'PENDING' && duel.hasPlayed && (
          <View style={styles.waitingCard}>
            <ActivityIndicator size="small" color="#7A1A1A" />
            <View style={styles.waitingTextWrap}>
              <Text style={styles.waitingTitle}>Ton choix est enregistré</Text>
              <Text style={styles.waitingText}>
                Le choix de {duel.opponentPseudo} reste secret jusqu'à ce qu'il ou elle joue.
              </Text>
            </View>
          </View>
        )}

        {duel.status === 'CANCELLED' && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingTitle}>Duel décliné</Text>
            <Text style={styles.waitingText}>Aucune pénalité et aucun point n'est attribué.</Text>
          </View>
        )}

        {duel.status === 'EXPIRED' && (
          <View style={styles.waitingCard}>
            <Text style={styles.waitingTitle}>Duel expiré</Text>
            <Text style={styles.waitingText}>Les 48 heures sont écoulées. Aucun point n'est attribué.</Text>
          </View>
        )}

        {duel.status === 'RESOLVED' && (
          <Pressable style={styles.replayBtn} onPress={() => void handleRematch()} disabled={rematching}>
            {rematching ? (
              <ActivityIndicator size="small" color="#7A1A1A" />
            ) : (
              <Text style={styles.replayText}>🔄 Proposer une revanche</Text>
            )}
          </Pressable>
        )}

        {!!journalMsg && (
          <Animated.View style={[styles.journalCard, { opacity: resultOpacity }]}>
            <Text style={styles.journalLabel}>📰 Annonce du journal</Text>
            <Text style={styles.journalText}>{journalMsg}</Text>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4ECD8' },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  scroll: { paddingHorizontal: 16, gap: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
    marginHorizontal: -16,
    marginBottom: 4,
  },
  back: { color: '#F0D98C', fontSize: 15, fontWeight: '600' },
  headerTitle: { color: '#F0D98C', fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },
  errorBox: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#D5A49A',
    borderRadius: 12,
    padding: 12,
  },
  errorText: { color: '#7A1A1A', fontSize: 13, textAlign: 'center' },
  scoreRow: { flexDirection: 'row', gap: 10 },
  scoreItem: {
    flex: 1,
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  scoreItemCenter: { borderColor: '#C4924A' },
  scoreValue: { color: '#2C1A0E', fontSize: 22, fontWeight: '800' },
  scoreLabel: { color: '#9A7040', fontSize: 12, marginTop: 4 },
  choicesRow: { flexDirection: 'row', gap: 10 },
  waitingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C4924A',
    padding: 16,
  },
  waitingTextWrap: { flex: 1 },
  waitingTitle: { color: '#2C1A0E', fontSize: 14, fontWeight: '800' },
  waitingText: { color: '#7A5C3A', fontSize: 12.5, lineHeight: 18, marginTop: 3 },
  declineBtn: {
    alignSelf: 'center',
    paddingHorizontal: 22,
    paddingVertical: 10,
  },
  declineText: {
    color: '#7A5C3A',
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  replayBtn: {
    alignSelf: 'center',
    minWidth: 190,
    alignItems: 'center',
    backgroundColor: '#FEFAF0',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#C4924A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  replayText: { color: '#7A1A1A', fontSize: 14, fontWeight: '700' },
  journalCard: {
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    borderLeftWidth: 4,
    borderLeftColor: '#C4924A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  journalLabel: { color: '#2C1A0E', fontSize: 14, fontWeight: '800', marginBottom: 10 },
  journalText: { color: '#5A3A1A', fontSize: 15, lineHeight: 22, fontStyle: 'italic' },
});
