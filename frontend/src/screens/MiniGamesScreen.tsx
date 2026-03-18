import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { miniGames } from '../data/gameData';

// Import des jeux
import CardGame from './games/CardGame';
import StoryGame from './games/StoryGame';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============= ÉCRAN PRINCIPAL =============
export default function MiniGamesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCoins, addPoints, incrementStat } = useStore();
  const [currentGame, setCurrentGame] = useState<string | null>(null);
  const [result, setResult] = useState<{ won: boolean; reward: number } | null>(null);

  const handleWin = (game: string, reward: number) => {
    addCoins(reward);
    addPoints(15);
    incrementStat('gamesWon');
    setResult({ won: true, reward });
  };

  const handleLose = () => {
    addPoints(5);
    setResult({ won: false, reward: 0 });
  };

  const difficultyColors = {
    facile: '#4CAF50',
    moyen: '#FF9800',
    difficile: '#F44336',
  };

  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{result.won ? '🎉' : '😢'}</Text>
          <Text style={styles.resultTitle}>{result.won ? 'Victoire!' : 'Perdu!'}</Text>
          {result.won && <Text style={styles.resultReward}>+{result.reward} 💰</Text>}
          <TouchableOpacity
            style={styles.playAgainBtn}
            onPress={() => { setResult(null); setCurrentGame(null); }}
          >
            <Text style={styles.playAgainText}>Retour aux jeux</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentGame) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => setCurrentGame(null)}>
          <Text style={styles.backBtnText}>← Retour</Text>
        </TouchableOpacity>
        
        <ScrollView contentContainerStyle={styles.gameContent}>
          {currentGame === 'cards' && (
            <CardGame onEnd={(won, coins) => won ? handleWin('cards', coins) : handleLose()} />
          )}
          {currentGame === 'story' && (
            <StoryGame onEnd={(won, score) => won ? handleWin('story', 50) : handleLose()} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🎮 Mini-Jeux</Text>
        <Text style={styles.subtitle}>Gagnez des pièces en jouant!</Text>
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {miniGames.map(game => (
          <TouchableOpacity
            key={game.id}
            style={styles.gameCard}
            onPress={() => {
              if (game.id === 'bottle') { router.push('/bottle'); }
              else if (game.id === 'adoption') { router.push('/pet'); }
              else if (game.id === 'classement') { router.push('/badges'); }
              else { setCurrentGame(game.id); }
            }}
          >
            <Text style={styles.gameEmoji}>{game.emoji}</Text>
            <View style={styles.gameInfo}>
              <Text style={styles.gameName}>{game.name}</Text>
              <Text style={styles.gameDesc}>{game.description}</Text>
              <View style={styles.gameFooter}>
                <Text style={styles.gameReward}>🪙 {game.reward}</Text>
                <View style={[styles.diffBadge, { backgroundColor: difficultyColors[game.difficulty] }]}>
                  <Text style={styles.diffText}>{game.difficulty}</Text>
                </View>
              </View>
            </View>
            <Text style={styles.playArrow}>▶</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  gameCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 16, 
    padding: 16, 
    marginBottom: 12, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 2 }, 
    shadowOpacity: 0.1, 
    shadowRadius: 4, 
    elevation: 3 
  },
  gameEmoji: { fontSize: 40, marginRight: 14 },
  gameInfo: { flex: 1 },
  gameName: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  gameDesc: { fontSize: 13, color: '#8B6F47', marginTop: 2 },
  gameFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 10 },
  gameReward: { fontSize: 14, color: '#DAA520', fontWeight: '600' },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  diffText: { fontSize: 10, color: '#FFF', fontWeight: '600', textTransform: 'capitalize' },
  playArrow: { fontSize: 18, color: '#8B6F47' },
  backBtn: { padding: 16 },
  backBtnText: { fontSize: 16, color: '#8B6F47' },
  gameContent: { flexGrow: 1 },
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  resultEmoji: { fontSize: 80, marginBottom: 20 },
  resultTitle: { fontSize: 32, fontWeight: '700', color: '#3A2818' },
  resultReward: { fontSize: 24, color: '#DAA520', fontWeight: '700', marginTop: 10 },
  playAgainBtn: { marginTop: 30, backgroundColor: '#4CAF50', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25 },
  playAgainText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
