import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import CardGame from './games/CardGame';
import StoryGame from './games/StoryGame';
import { isVisible, isUnlocked, FEATURES } from '../config/features';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const ALL_SECTIONS = [
  { id: 'salons',   featureKey: 'salons',    emoji: '👥', name: 'Salons',              desc: 'Rejoins des salons de discussion' },
  { id: 'adoption', featureKey: 'refuge',    emoji: '🐾', name: 'Adoption',            desc: 'Prends soin de ton animal' },
  { id: 'cards',    featureKey: 'games',     emoji: '🎴', name: 'Jeu de Cartes',       desc: 'Révèle et gagne des pièces' },
  { id: 'story',    featureKey: 'games',     emoji: '📖', name: "Continue l'Histoire", desc: 'Écris une histoire à plusieurs' },
  { id: 'bottle',   featureKey: 'social',    emoji: '🍾', name: 'Bouteille à la Mer',  desc: "Envoie un message à l'inconnu" },
];

// Filtre selon FEATURES — sections "hidden" masquées, "locked"/"teased" visibles mais bloquées
const SECTIONS = ALL_SECTIONS.filter((s) => isVisible(s.featureKey));

export default function SocialScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addCoins, addPoints, incrementStat } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['social'] ?? '#FFF8E7');
  const [currentView, setCurrentView] = useState<'cards' | 'story' | null>(null);
  const [result, setResult] = useState<{ won: boolean; reward: number } | null>(null);

  const handlePress = (id: string, featureKey: string) => {
    // Si la feature est locked/teased → ne pas naviguer
    if (!isUnlocked(featureKey)) return;

    if (id === 'salons')   { router.push('/salons-list'); return; }
    if (id === 'adoption') { router.push('/pet');         return; }
    if (id === 'bottle')   { router.push('/bottle');      return; }
    setCurrentView(id as 'cards' | 'story');
  };

  const handleWin = (reward: number) => {
    addCoins(reward);
    addPoints(15);
    incrementStat('gamesWon');
    setResult({ won: true, reward });
  };

  const handleLose = () => {
    addPoints(5);
    setResult({ won: false, reward: 0 });
  };

  const reset = () => { setResult(null); setCurrentView(null); };

  if (result) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        <View style={styles.resultBox}>
          <Text style={styles.resultEmoji}>{result.won ? '🎉' : '😢'}</Text>
          <Text style={styles.resultTitle}>{result.won ? 'Victoire!' : 'Perdu!'}</Text>
          {result.won && <Text style={styles.resultReward}>+{result.reward} 🪙</Text>}
          <TouchableOpacity style={styles.backBtn} onPress={reset}>
            <Text style={styles.backBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (currentView) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        <TouchableOpacity style={styles.topBack} onPress={() => setCurrentView(null)}>
          <Text style={styles.topBackText}>← Retour</Text>
        </TouchableOpacity>
        <ScrollView contentContainerStyle={styles.gameContent}>
          {currentView === 'cards' && (
            <CardGame onEnd={(won, coins) => won ? handleWin(coins) : handleLose()} />
          )}
          {currentView === 'story' && (
            <StoryGame onEnd={(won) => won ? handleWin(50) : handleLose()} />
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>🌐 Social</Text>
        <Text style={styles.subtitle}>Rencontres & activités</Text>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.grid}>
        {SECTIONS.map((s) => {
          const locked = !isUnlocked(s.featureKey);
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.card, locked && styles.cardLocked]}
              onPress={() => handlePress(s.id, s.featureKey)}
              activeOpacity={locked ? 1 : 0.7}
            >
              <Text style={styles.cardEmoji}>{s.emoji}</Text>
              <View style={styles.cardText}>
                <Text style={[styles.cardName, locked && styles.cardNameLocked]}>{s.name}</Text>
                <Text style={styles.cardDesc}>{locked ? 'Bientôt disponible' : s.desc}</Text>
              </View>
              <Text style={styles.arrow}>{locked ? '🔒' : '▶'}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 20, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scroll: { flex: 1 },
  grid: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E8D5B7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  cardLocked: {
    opacity: 0.5,
  },
  cardNameLocked: {
    color: '#B0A090',
  },
  cardEmoji: { fontSize: 42, marginRight: 16 },
  cardText: { flex: 1 },
  cardName: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 4 },
  cardDesc: { fontSize: 13, color: '#8B6F47' },
  arrow: { fontSize: 16, color: '#C4A35A' },
  topBack: { margin: 16 },
  topBackText: { fontSize: 16, color: '#8B6F47' },
  gameContent: { flexGrow: 1 },
  resultBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  resultEmoji: { fontSize: 80, marginBottom: 16 },
  resultTitle: { fontSize: 32, fontWeight: '700', color: '#3A2818', marginBottom: 8 },
  resultReward: { fontSize: 24, color: '#DAA520', fontWeight: '700', marginBottom: 32 },
  backBtn: { backgroundColor: '#DAA520', paddingHorizontal: 50, paddingVertical: 16, borderRadius: 25 },
  backBtnText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
});
