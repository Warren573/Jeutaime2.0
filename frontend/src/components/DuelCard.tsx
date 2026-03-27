import React from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { DuelChoice, DuelResult } from '../logic/duelEngine';

interface Props {
  playerName: string;
  opponentName: string;
  playerChoice: DuelChoice | null;
  opponentChoice: DuelChoice | null;
  playerScale: Animated.Value;
  opponentScale: Animated.Value;
  result: DuelResult;
}

const RESULT_LABELS: Record<DuelResult, string> = {
  pending: 'Choisissez une option',
  win:     'Vous remportez le duel ! 🏆',
  lose:    'Duel perdu… 😤',
  draw:    'Match nul 🤝',
};

const RESULT_COLORS: Record<DuelResult, string> = {
  pending: 'rgba(255,255,255,0.55)',
  win:     '#7DFFB3',
  lose:    '#FF7D7D',
  draw:    '#FFD97D',
};

export default function DuelCard({
  playerName,
  opponentName,
  playerChoice,
  opponentChoice,
  playerScale,
  opponentScale,
  result,
}: Props) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Pierre • Papier • Ciseaux</Text>
      <Text style={styles.subtitle}>Duel privé</Text>

      <View style={styles.battleRow}>
        {/* Joueur */}
        <Animated.View style={[styles.fighter, { transform: [{ scale: playerScale }] }]}>
          <Text style={styles.fighterName} numberOfLines={1}>{playerName}</Text>
          <View style={styles.fighterEmojiBg}>
            <Text style={styles.fighterEmoji}>
              {playerChoice ? playerChoice.emoji : '❔'}
            </Text>
          </View>
          <Text style={styles.fighterChoice}>
            {playerChoice ? playerChoice.label : '—'}
          </Text>
        </Animated.View>

        {/* VS */}
        <View style={styles.vsWrap}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* Adversaire */}
        <Animated.View style={[styles.fighter, styles.fighterRight, { transform: [{ scale: opponentScale }] }]}>
          <Text style={styles.fighterName} numberOfLines={1}>{opponentName}</Text>
          <View style={[styles.fighterEmojiBg, styles.fighterEmojiBgRight]}>
            <Text style={styles.fighterEmoji}>
              {opponentChoice ? opponentChoice.emoji : '❔'}
            </Text>
          </View>
          <Text style={styles.fighterChoice}>
            {opponentChoice ? opponentChoice.label : '—'}
          </Text>
        </Animated.View>
      </View>

      {/* Résultat */}
      <View style={styles.resultWrap}>
        <Text style={[styles.resultText, { color: RESULT_COLORS[result] }]}>
          {RESULT_LABELS[result]}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1B2E',
    borderRadius: 28,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  title: {
    color: '#F8F6FF',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  battleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  fighter: {
    flex: 2,
    alignItems: 'center',
  },
  fighterRight: {
    // miroir visuel
  },
  fighterName: {
    fontSize: 13,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    marginBottom: 10,
    textAlign: 'center',
  },
  fighterEmojiBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F8F6FF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#B47CFF',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  fighterEmojiBgRight: {
    backgroundColor: '#F4EEFF',
  },
  fighterEmoji: {
    fontSize: 36,
  },
  fighterChoice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#F8F6FF',
    marginTop: 10,
    textAlign: 'center',
  },

  vsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#B47CFF',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
  },

  resultWrap: {
    marginTop: 18,
    alignItems: 'center',
    minHeight: 30,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
