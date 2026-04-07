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
    backgroundColor: '#F4ECD8',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 16,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: 4,
  },
  back: {
    color: '#F0D98C',
    fontSize: 15,
    fontWeight: '600',
  },
  headerTitle: {
    color: '#F0D98C',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },

  scoreRow: {
    flexDirection: 'row',
    gap: 10,
  },
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
  scoreItemCenter: {
    borderColor: '#C4924A',
  },
  scoreValue: {
    color: '#2C1A0E',
    fontSize: 22,
    fontWeight: '800',
  },
  scoreLabel: {
    color: '#9A7040',
    fontSize: 12,
    marginTop: 4,
  },

  choicesRow: {
    flexDirection: 'row',
    gap: 10,
  },

  replayBtn: {
    alignSelf: 'center',
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
  replayText: {
    color: '#7A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },

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
  journalLabel: {
    color: '#2C1A0E',
    fontSize: 14,
    fontWeight: '800',
    marginBottom: 10,
  },
  journalText: {
    color: '#5A3A1A',
    fontSize: 15,
    lineHeight: 22,
    fontStyle: 'italic',
  },
});
