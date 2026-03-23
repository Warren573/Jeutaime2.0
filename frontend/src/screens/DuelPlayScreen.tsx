import React, { useRef, useState } from 'react';
import {
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
  getRandomChoice,
  getResult,
  type DuelChoice,
  type DuelResult,
} from '../logic/duelEngine';
import { useStore } from '../store/useStore';

interface Score {
  wins: number;
  losses: number;
  draws: number;
}

export default function DuelPlayScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const params  = useLocalSearchParams<{ opponentName: string; opponentId: string }>();
  const { currentUser, addDuelEntry, addPoints, incrementStat } = useStore();

  const opponentName = params.opponentName ?? 'Inconnu';
  const playerName   = currentUser?.name ?? 'Vous';

  const [playerChoice,   setPlayerChoice]   = useState<DuelChoice | null>(null);
  const [opponentChoice, setOpponentChoice] = useState<DuelChoice | null>(null);
  const [result,         setResult]         = useState<DuelResult>('pending');
  const [score,          setScore]          = useState<Score>({ wins: 0, losses: 0, draws: 0 });
  const [journalMsg,     setJournalMsg]     = useState('');
  const [canPlay,        setCanPlay]        = useState(true);

  const playerScale   = useRef(new Animated.Value(1)).current;
  const opponentScale = useRef(new Animated.Value(1)).current;
  const resultOpacity = useRef(new Animated.Value(0)).current;

  const animateBattle = () => {
    resultOpacity.setValue(0);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(playerScale,   { toValue: 1.12, useNativeDriver: true, speed: 40 }),
        Animated.spring(opponentScale, { toValue: 1.12, useNativeDriver: true, speed: 40 }),
      ]),
      Animated.parallel([
        Animated.spring(playerScale,   { toValue: 1, useNativeDriver: true, speed: 20 }),
        Animated.spring(opponentScale, { toValue: 1, useNativeDriver: true, speed: 20 }),
      ]),
      Animated.timing(resultOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handlePlay = (choice: DuelChoice) => {
    if (!canPlay) {
      // Rejouer — remettre à zéro
      setPlayerChoice(null);
      setOpponentChoice(null);
      setResult('pending');
      setJournalMsg('');
      setCanPlay(true);
      return;
    }

    const enemyChoice = getRandomChoice();
    const duelResult  = getResult(choice, enemyChoice);

    setPlayerChoice(choice);
    setOpponentChoice(enemyChoice);
    setResult(duelResult);
    setCanPlay(false);

    setScore((prev) => ({
      wins:   prev.wins   + (duelResult === 'win'  ? 1 : 0),
      losses: prev.losses + (duelResult === 'lose' ? 1 : 0),
      draws:  prev.draws  + (duelResult === 'draw' ? 1 : 0),
    }));

    const msg = generateJournalMessage({
      result: duelResult,
      playerName,
      opponentName,
      playerChoice: choice,
    });
    setJournalMsg(msg);

    // Intégration store : journal + stats + points
    addDuelEntry({ text: msg, players: [playerName, opponentName] });
    if (duelResult === 'win') {
      incrementStat('gamesWon');
      addPoints(10, 'Victoire en duel');
    } else {
      addPoints(2, 'Participation duel');
    }

    animateBattle();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Text style={styles.back}>← Retour</Text>
          </Pressable>
          <Text style={styles.headerTitle}>Duel en cours</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Carte de duel */}
        <DuelCard
          playerName={playerName}
          opponentName={opponentName}
          playerChoice={playerChoice}
          opponentChoice={opponentChoice}
          playerScale={playerScale}
          opponentScale={opponentScale}
          result={result}
        />

        {/* Score */}
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

        {/* Choix */}
        <View style={styles.choicesRow}>
          {DUEL_CHOICES.map((choice) => (
            <ChoiceButton
              key={choice.key}
              choice={choice}
              onPress={handlePlay}
              disabled={!canPlay}
            />
          ))}
        </View>

        {/* Rejouer */}
        {!canPlay && (
          <Pressable style={styles.replayBtn} onPress={() => handlePlay(DUEL_CHOICES[0])}>
            <Text style={styles.replayText}>🔄 Rejouer</Text>
          </Pressable>
        )}

        {/* Journal */}
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
  container: {
    flex: 1,
    backgroundColor: '#141625',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  back: {
    color: '#B47CFF',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#F8F6FF',
    fontSize: 16,
    fontWeight: '700',
  },

  scoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
  scoreItem: {
    flex: 1,
    backgroundColor: '#1E2032',
    borderRadius: 18,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
  },
  scoreItemCenter: {
    borderColor: 'rgba(180,124,255,0.25)',
  },
  scoreValue: {
    color: '#F8F6FF',
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    color: 'rgba(255,255,255,0.50)',
    fontSize: 12,
    marginTop: 4,
  },

  choicesRow: {
    flexDirection: 'row',
    gap: 10,
  },

  replayBtn: {
    alignSelf: 'center',
    backgroundColor: '#1E2032',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(180,124,255,0.35)',
  },
  replayText: {
    color: '#B47CFF',
    fontSize: 14,
    fontWeight: '700',
  },

  journalCard: {
    backgroundColor: '#1E2032',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  },
  journalLabel: {
    color: '#F8F6FF',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  journalText: {
    color: 'rgba(255,255,255,0.80)',
    fontSize: 15,
    lineHeight: 22,
  },
});
