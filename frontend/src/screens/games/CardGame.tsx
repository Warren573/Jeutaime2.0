import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Props {
  onEnd: (won: boolean, score: number) => void;
}

type CardType = 'heart' | 'club' | 'spade' | 'diamond';

interface Card {
  id: number;
  type: CardType;
  revealed: boolean;
}

const cardData: { type: CardType; emoji: string; effect: string; count: number }[] = [
  { type: 'heart', emoji: '❤️', effect: '+15 pièces', count: 3 },
  { type: 'club', emoji: '♣️', effect: 'Gains ÷ 2', count: 2 },
  { type: 'spade', emoji: '♠️', effect: 'Tout perdu!', count: 1 },
  { type: 'diamond', emoji: '♦️', effect: 'Indice!', count: 4 },
];

export default function CardGame({ onEnd }: Props) {
  const [coins, setCoins] = useState(0);
  const [cards, setCards] = useState<Card[]>([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameOver, setGameOver] = useState(false);
  const [lastAction, setLastAction] = useState('');
  const [heartsRevealed, setHeartsRevealed] = useState(0);

  const initGame = () => {
    const deck: Card[] = [];
    let id = 0;
    cardData.forEach(({ type, count }) => {
      for (let i = 0; i < count; i++) {
        deck.push({ id: id++, type, revealed: false });
      }
    });
    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    setCards(deck);
    setCoins(0);
    setHeartsRevealed(0);
    setGameOver(false);
    setLastAction('');
    setGameStarted(true);
  };

  const revealCard = (index: number) => {
    if (cards[index].revealed || gameOver) return;

    const newCards = [...cards];
    newCards[index].revealed = true;
    setCards(newCards);

    const card = newCards[index];
    
    switch (card.type) {
      case 'heart':
        setCoins(prev => prev + 15);
        setHeartsRevealed(prev => prev + 1);
        setLastAction('❤️ +15 pièces!');
        break;
      case 'club':
        setCoins(prev => Math.floor(prev / 2));
        setLastAction('♣️ Gains divisés par 2!');
        break;
      case 'spade':
        setCoins(0);
        setLastAction('♠️ Tout perdu!');
        break;
      case 'diamond':
        const remaining = newCards.filter(c => !c.revealed);
        const hearts = remaining.filter(c => c.type === 'heart').length;
        setLastAction(`♦️ Indice: ${hearts} ❤️ restant(s)!`);
        break;
    }

    // Check if all cards revealed
    if (newCards.every(c => c.revealed)) {
      setGameOver(true);
    }
  };

  const cashOut = () => {
    onEnd(coins > 0, coins);
  };

  const betAllHearts = () => {
    if (heartsRevealed === 3) {
      setCoins(prev => prev * 2);
      setLastAction('🎉 Doublé! Tous les ❤️ trouvés!');
      setTimeout(() => onEnd(true, coins * 2), 1500);
    } else {
      setCoins(0);
      setLastAction('💔 Perdu! Tous les ❤️ n\'étaient pas révélés');
      setTimeout(() => onEnd(false, 0), 1500);
    }
    setGameOver(true);
  };

  const getCardEmoji = (type: CardType) => {
    switch (type) {
      case 'heart': return '❤️';
      case 'club': return '♣️';
      case 'spade': return '♠️';
      case 'diamond': return '♦️';
    }
  };

  if (!gameStarted) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>🎴 Jeu de Cartes</Text>
        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>📜 Règles</Text>
          <Text style={styles.rule}>❤️ Cœur (×3) : +15 pièces</Text>
          <Text style={styles.rule}>♣️ Trèfle (×2) : gains ÷ 2</Text>
          <Text style={styles.rule}>♠️ Pique (×1) : tout perdu!</Text>
          <Text style={styles.rule}>♦️ Carreau (×4) : indice</Text>
          <Text style={styles.ruleTip}>💡 Encaissez à tout moment!</Text>
        </View>
        <TouchableOpacity style={styles.startBtn} onPress={initGame}>
          <Text style={styles.startText}>Jouer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.coinsText}>💰 {coins} pièces</Text>
        <Text style={styles.heartsText}>❤️ {heartsRevealed}/3</Text>
      </View>

      {lastAction ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionText}>{lastAction}</Text>
        </View>
      ) : null}

      <View style={styles.cardsGrid}>
        {cards.map((card, index) => (
          <TouchableOpacity
            key={card.id}
            style={[
              styles.card,
              card.revealed && styles.cardRevealed,
            ]}
            onPress={() => revealCard(index)}
            disabled={card.revealed || gameOver}
          >
            <Text style={styles.cardEmoji}>
              {card.revealed ? getCardEmoji(card.type) : '🎴'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!gameOver && (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cashOutBtn} onPress={cashOut}>
            <Text style={styles.cashOutText}>💰 Encaisser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.betBtn} onPress={betAllHearts}>
            <Text style={styles.betText}>🎲 Pari Final</Text>
          </TouchableOpacity>
        </View>
      )}

      {gameOver && (
        <TouchableOpacity style={styles.replayBtn} onPress={() => onEnd(coins > 0, coins)}>
          <Text style={styles.replayText}>Terminer ({coins} 💰)</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', padding: 16 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginBottom: 16 },
  rulesBox: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 20, width: '100%' },
  rulesTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rule: { fontSize: 14, color: '#5D4037', marginBottom: 6 },
  ruleTip: { fontSize: 13, color: '#DAA520', fontWeight: '600', marginTop: 8 },
  startBtn: { backgroundColor: '#9C27B0', paddingHorizontal: 50, paddingVertical: 14, borderRadius: 25 },
  startText: { color: '#FFF', fontWeight: '700', fontSize: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginBottom: 10 },
  coinsText: { fontSize: 20, fontWeight: '700', color: '#DAA520' },
  heartsText: { fontSize: 20, fontWeight: '700', color: '#E91E63' },
  actionBox: { backgroundColor: '#FFF', borderRadius: 10, padding: 12, marginBottom: 16, width: '100%' },
  actionText: { fontSize: 16, fontWeight: '600', color: '#3A2818', textAlign: 'center' },
  cardsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', width: '100%', marginBottom: 20 },
  card: { 
    width: 55, 
    height: 70, 
    backgroundColor: '#8D6E63', 
    borderRadius: 8, 
    margin: 5, 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cardRevealed: { backgroundColor: '#FFF8E7' },
  cardEmoji: { fontSize: 28 },
  actionsRow: { flexDirection: 'row', gap: 12 },
  cashOutBtn: { backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  cashOutText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  betBtn: { backgroundColor: '#FF9800', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20 },
  betText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  replayBtn: { backgroundColor: '#9C27B0', paddingHorizontal: 30, paddingVertical: 14, borderRadius: 25, marginTop: 10 },
  replayText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
