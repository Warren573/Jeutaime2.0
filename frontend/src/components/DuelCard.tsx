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
  pending: '#9A7040',
  win:     '#2A6B3A',
  lose:    '#7A1A1A',
  draw:    '#7A4A18',
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
    backgroundColor: '#FEFAF0',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOpacity: 0.2,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  title: {
    color: '#2C1A0E',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: '#9A7040',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 18,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    fontStyle: 'italic',
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
  fighterRight: {},
  fighterName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#7A5C3A',
    marginBottom: 10,
    textAlign: 'center',
  },
  fighterEmojiBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F4ECD8',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#C4924A',
    shadowColor: '#5A3A1A',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fighterEmojiBgRight: {
    backgroundColor: '#FFF0E8',
  },
  fighterEmoji: {
    fontSize: 36,
  },
  fighterChoice: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2C1A0E',
    marginTop: 10,
    textAlign: 'center',
  },

  vsWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vsText: {
    color: '#7A1A1A',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 2,
  },

  resultWrap: {
    marginTop: 18,
    alignItems: 'center',
    minHeight: 30,
    borderTopWidth: 1,
    borderTopColor: '#D4B896',
    paddingTop: 14,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
});
