import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const H_PAD = 16;
const CARD_GAP = 10;
const COLS = 5;
const CARD_W = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP * (COLS - 1)) / COLS);
const CARD_H = Math.floor(CARD_W * 1.5);

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
  { type: 'heart',   emoji: '❤️', effect: '+15 pièces', count: 3 },
  { type: 'club',    emoji: '♣️', effect: 'Gains ÷ 2',  count: 2 },
  { type: 'spade',   emoji: '♠️', effect: 'Tout perdu!', count: 1 },
  { type: 'diamond', emoji: '♦️', effect: 'Indice!',     count: 4 },
];

const CARD_STYLES: Record<CardType, { bg: string; border: string; text: string }> = {
  heart:   { bg: '#FFF0F5', border: '#E91E63', text: '#C2185B' },
  club:    { bg: '#F0FBF1', border: '#2E7D32', text: '#1B5E20' },
  spade:   { bg: '#EEF2FF', border: '#3949AB', text: '#1A237E' },
  diamond: { bg: '#FFF8E7', border: '#F57C00', text: '#E65100' },
};

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
        setLastAction('❤️ +15 pièces !');
        break;
      case 'club':
        setCoins(prev => Math.floor(prev / 2));
        setLastAction('♣️ Gains divisés par 2 !');
        break;
      case 'spade':
        setCoins(0);
        setLastAction('♠️ Tout perdu !');
        break;
      case 'diamond':
        const remaining = newCards.filter(c => !c.revealed);
        const hearts = remaining.filter(c => c.type === 'heart').length;
        setLastAction(`♦️ Indice : ${hearts} ❤️ restant(s)`);
        break;
    }
    if (newCards.every(c => c.revealed)) {
      setGameOver(true);
    }
  };

  const cashOut = () => { onEnd(coins > 0, coins); };

  const betAllHearts = () => {
    if (heartsRevealed === 3) {
      setCoins(prev => prev * 2);
      setLastAction('🎉 Doublé ! Tous les ❤️ trouvés !');
      setTimeout(() => onEnd(true, coins * 2), 1500);
    } else {
      setCoins(0);
      setLastAction("💔 Perdu ! Tous les ❤️ n'étaient pas révélés");
      setTimeout(() => onEnd(false, 0), 1500);
    }
    setGameOver(true);
  };

  const getCardEmoji = (type: CardType) => {
    switch (type) {
      case 'heart':   return '❤️';
      case 'club':    return '♣️';
      case 'spade':   return '♠️';
      case 'diamond': return '♦️';
    }
  };

  // ── Écran d'accueil ──────────────────────────────────────────────────────────
  if (!gameStarted) {
    return (
      <View style={styles.screen}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>🎴</Text>
          <Text style={styles.title}>Jeu de Cartes</Text>
        </View>

        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Règles</Text>
          {cardData.map(d => (
            <View key={d.type} style={styles.ruleRow}>
              <View style={[styles.ruleChip, { borderColor: CARD_STYLES[d.type].border, backgroundColor: CARD_STYLES[d.type].bg }]}>
                <Text style={[styles.ruleChipText, { color: CARD_STYLES[d.type].text }]}>
                  {d.emoji} ×{d.count}
                </Text>
              </View>
              <Text style={styles.ruleEffect}>{d.effect}</Text>
            </View>
          ))}
          <View style={styles.tipRow}>
            <Text style={styles.tipText}>💡 Encaissez à tout moment !</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={initGame}>
          <Text style={styles.startText}>Jouer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Jeu ──────────────────────────────────────────────────────────────────────
  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.gameHeader}>
        <View style={styles.statChip}>
          <Text style={styles.statChipText}>💰 {coins}</Text>
        </View>
        <View style={styles.statChipAlt}>
          <Text style={styles.statChipTextAlt}>❤️ {heartsRevealed}/3</Text>
        </View>
      </View>

      {/* Action feedback */}
      {lastAction ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionText}>{lastAction}</Text>
        </View>
      ) : (
        <View style={styles.actionBoxEmpty} />
      )}

      {/* Grid */}
      <View style={styles.cardsGrid}>
        {cards.map((card, index) => {
          const cs = CARD_STYLES[card.type];
          return (
            <TouchableOpacity
              key={card.id}
              style={[
                styles.card,
                card.revealed
                  ? { backgroundColor: cs.bg, borderColor: cs.border }
                  : styles.cardBack,
              ]}
              onPress={() => revealCard(index)}
              disabled={card.revealed || gameOver}
              activeOpacity={0.75}
            >
              {card.revealed ? (
                <>
                  <Text style={styles.cardCorner}>{getCardEmoji(card.type)}</Text>
                  <Text style={[styles.cardCenter, { color: cs.text }]}>{getCardEmoji(card.type)}</Text>
                </>
              ) : (
                <Text style={styles.cardBackEmoji}>🎴</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Actions */}
      {!gameOver ? (
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.cashOutBtn} onPress={cashOut}>
            <Text style={styles.cashOutText}>💰 Encaisser</Text>
            <Text style={styles.cashOutSub}>{coins} pièces</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.betBtn} onPress={betAllHearts}>
            <Text style={styles.betText}>🎲 Pari Final</Text>
            <Text style={styles.betSub}>×2 si tous ❤️</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.doneBtn} onPress={() => onEnd(coins > 0, coins)}>
          <Text style={styles.doneBtnText}>Terminer · {coins} 💰</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    width: '100%',
    backgroundColor: '#0D0D1A',
    paddingHorizontal: H_PAD,
    paddingTop: 12,
    paddingBottom: 24,
  },

  // Accueil
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  titleEmoji: { fontSize: 36 },
  title: { fontSize: 28, fontWeight: '900', color: '#F0E6FF', letterSpacing: 0.5 },
  rulesBox: {
    backgroundColor: '#1A1A30', borderRadius: 16, padding: 20,
    marginBottom: 28, borderWidth: 1, borderColor: '#2E2A50',
  },
  rulesTitle: { fontSize: 13, fontWeight: '800', color: '#7B6FA0', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  ruleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
  ruleChip: {
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1.5, minWidth: 72, alignItems: 'center',
  },
  ruleChipText: { fontSize: 14, fontWeight: '700' },
  ruleEffect: { fontSize: 14, color: '#C0B8D8', flex: 1 },
  tipRow: { marginTop: 8, paddingTop: 14, borderTopWidth: 1, borderTopColor: '#2E2A50' },
  tipText: { fontSize: 13, color: '#A89CC0', textAlign: 'center' },
  startBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', width: '100%',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  startText: { fontSize: 18, fontWeight: '900', color: '#fff', letterSpacing: 0.5 },

  // Game header
  gameHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12, gap: 10 },
  statChip: {
    flex: 1, backgroundColor: '#1C1A2E', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#F59E0B40',
  },
  statChipText: { fontSize: 20, fontWeight: '900', color: '#F59E0B' },
  statChipAlt: {
    flex: 1, backgroundColor: '#1C1A2E', borderRadius: 12, paddingVertical: 10,
    alignItems: 'center', borderWidth: 1, borderColor: '#E91E6340',
  },
  statChipTextAlt: { fontSize: 20, fontWeight: '900', color: '#E91E63' },

  // Action feedback
  actionBox: {
    backgroundColor: '#1C1A2E', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 16, borderWidth: 1, borderColor: '#3D3560',
    minHeight: 44, alignItems: 'center', justifyContent: 'center',
  },
  actionBoxEmpty: { height: 44, marginBottom: 16 },
  actionText: { fontSize: 15, fontWeight: '700', color: '#E0D8FF', textAlign: 'center' },

  // Cards
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: CARD_GAP,
    marginBottom: 20,
  },
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  cardBack: { backgroundColor: '#1E1545', borderColor: '#4A3080' },
  cardBackEmoji: { fontSize: CARD_W * 0.55 },
  cardCorner: { position: 'absolute', top: 4, left: 5, fontSize: 11 },
  cardCenter: { fontSize: CARD_W * 0.42, lineHeight: CARD_W * 0.5 },

  // Buttons
  actionsRow: { flexDirection: 'row', gap: 12 },
  cashOutBtn: {
    flex: 1, backgroundColor: '#065F46', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#10B98140',
    shadowColor: '#10B981', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  cashOutText: { fontSize: 15, fontWeight: '900', color: '#6EE7B7' },
  cashOutSub: { fontSize: 11, color: '#6EE7B7AA', marginTop: 2 },
  betBtn: {
    flex: 1, backgroundColor: '#7C2D12', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center', borderWidth: 1, borderColor: '#F9731640',
    shadowColor: '#F97316', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  betText: { fontSize: 15, fontWeight: '900', color: '#FDBA74' },
  betSub: { fontSize: 11, color: '#FDBA74AA', marginTop: 2 },
  doneBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', width: '100%',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  doneBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },
});
