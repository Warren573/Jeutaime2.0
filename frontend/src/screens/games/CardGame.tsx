import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const H_PAD   = 16;
const CARD_GAP = 8;
const COLS     = 5;
const ROWS     = 2;
const TOTAL    = COLS * ROWS; // 10 cartes

const CARD_W = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP * (COLS - 1)) / COLS);
const CARD_H = Math.floor(CARD_W * 1.45);

const HEART_VALUE = 15;

interface Props {
  onEnd: (won: boolean, score: number) => void;
}

type CardType = 'heart' | 'spade' | 'club' | 'diamond';

interface Card {
  id: number;
  type: CardType;
  row: 1 | 2;
  revealed: boolean;
}

const CARD_STYLES: Record<CardType, { bg: string; border: string; text: string }> = {
  heart:   { bg: '#FFF0F5', border: '#E91E63', text: '#C2185B' },
  spade:   { bg: '#EEF2FF', border: '#3949AB', text: '#1A237E' },
  club:    { bg: '#F0FBF1', border: '#2E7D32', text: '#1B5E20' },
  diamond: { bg: '#FFF8E7', border: '#F57C00', text: '#E65100' },
};

const EMOJI: Record<CardType, string> = {
  heart: '❤️', spade: '♠️', club: '♣️', diamond: '♦️',
};

const TYPE_NAME: Record<CardType, string> = {
  heart: 'cœur', spade: 'pique', club: 'trèfle', diamond: 'carreau',
};

function buildDeck(): { cards: Card[]; heartCount: number } {
  // Tirage aléatoire des quantités
  const heartCount   = 2 + Math.floor(Math.random() * 3);       // 2, 3 ou 4
  const spadeCount   = 1 + Math.floor(Math.random() * 2);       // 1 ou 2
  const clubCount    = 1 + Math.floor(Math.random() * 2);       // 1 ou 2
  const diamondCount = TOTAL - heartCount - spadeCount - clubCount;

  // Si diamondCount < 0, on réduit clubs ou spades
  const adjusted = Math.max(0, diamondCount);
  const types: CardType[] = [
    ...Array(heartCount).fill('heart'),
    ...Array(spadeCount).fill('spade'),
    ...Array(clubCount).fill('club'),
    ...Array(Math.max(0, TOTAL - heartCount - spadeCount - clubCount)).fill('diamond'),
  ];

  // Mélange Fisher-Yates
  for (let i = types.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [types[i], types[j]] = [types[j], types[i]];
  }

  const cards: Card[] = types.map((type, i) => ({
    id: i,
    type: type as CardType,
    row: i < COLS ? 1 : 2,
    revealed: false,
  }));

  return { cards, heartCount };
}

function getDiamondHint(cards: Card[]): string {
  const hidden = cards.filter(c => !c.revealed);
  if (hidden.length === 0) return '♦️ Plus aucune carte cachée.';
  const pick = hidden[Math.floor(Math.random() * hidden.length)];
  return `♦️ Indice : il y a un ${TYPE_NAME[pick.type]} sur la rangée ${pick.row}`;
}

export default function CardGame({ onEnd }: Props) {
  const [cards, setCards]           = useState<Card[]>([]);
  const [heartCount, setHeartCount] = useState(0);
  const [coins, setCoins]           = useState(0);
  const [started, setStarted]       = useState(false);
  const [gameOver, setGameOver]     = useState(false);
  const [message, setMessage]       = useState('');
  const [startHint, setStartHint]   = useState('');

  // ── Initialisation ──────────────────────────────────────────────────────────
  const initGame = () => {
    const { cards: deck, heartCount: hc } = buildDeck();
    setCards(deck);
    setHeartCount(hc);
    setCoins(0);
    setGameOver(false);
    setMessage('');
    // Indice de départ : un type au hasard
    const hintTypes: CardType[] = ['heart', 'spade', 'club', 'diamond'];
    const hintType = hintTypes[Math.floor(Math.random() * hintTypes.length)];
    const hintCount = deck.filter(c => c.type === hintType).length;
    setStartHint(`Il y a ${hintCount} ${EMOJI[hintType]} dans cette partie`);
    setStarted(true);
  };

  // ── Révèle une carte ────────────────────────────────────────────────────────
  const revealCard = (index: number) => {
    if (cards[index].revealed || gameOver) return;

    const next = cards.map((c, i) => i === index ? { ...c, revealed: true } : c);
    setCards(next);
    const card = next[index];

    switch (card.type) {
      case 'heart':
        setCoins(prev => prev + HEART_VALUE);
        setMessage(`❤️ +${HEART_VALUE} pièces !`);
        break;
      case 'spade':
        setCoins(0);
        setMessage('♠️ Tout perdu !');
        break;
      case 'club':
        setCoins(prev => Math.floor(prev / 2));
        setMessage('♣️ Gains divisés par 2 !');
        break;
      case 'diamond':
        setMessage(getDiamondHint(next));
        break;
    }

    if (next.every(c => c.revealed)) {
      setGameOver(true);
    }
  };

  // ── Pari : plus de cœurs ────────────────────────────────────────────────────
  const betNoHearts = () => {
    const heartsLeft = cards.filter(c => !c.revealed && c.type === 'heart').length;
    setGameOver(true);
    if (heartsLeft === 0) {
      setMessage('🎉 Bravo ! Il ne restait plus de cœurs !');
      setTimeout(() => onEnd(true, coins), 1500);
    } else {
      setCoins(0);
      setMessage(`💔 Raté ! Il restait encore ${heartsLeft} cœur${heartsLeft > 1 ? 's' : ''} caché${heartsLeft > 1 ? 's' : ''}.`);
      setTimeout(() => onEnd(false, 0), 1500);
    }
  };

  // ── Écran d'accueil ──────────────────────────────────────────────────────────
  if (!started) {
    return (
      <View style={styles.screen}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>🎴</Text>
          <Text style={styles.title}>Jeu de Cartes</Text>
        </View>

        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Règles</Text>

          <View style={styles.ruleRow}>
            <Text style={styles.ruleEmoji}>❤️</Text>
            <Text style={styles.ruleText}>Cœur → <Text style={styles.ruleBold}>+{HEART_VALUE} pièces</Text></Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleEmoji}>♠️</Text>
            <Text style={styles.ruleText}>Pique → <Text style={styles.ruleBold}>tout perdu</Text></Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleEmoji}>♣️</Text>
            <Text style={styles.ruleText}>Trèfle → <Text style={styles.ruleBold}>gains ÷ 2</Text></Text>
          </View>
          <View style={styles.ruleRow}>
            <Text style={styles.ruleEmoji}>♦️</Text>
            <Text style={styles.ruleText}>Carreau → <Text style={styles.ruleBold}>indice sur une carte cachée</Text></Text>
          </View>

          <View style={styles.separator} />
          <Text style={styles.tipText}>
            💡 Pariez qu'il n'y a plus de cœurs pour empocher vos gains avant de tomber sur un piège.
          </Text>
        </View>

        <TouchableOpacity style={styles.startBtn} onPress={initGame}>
          <Text style={styles.startText}>Jouer</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Jeu ──────────────────────────────────────────────────────────────────────
  const row1 = cards.slice(0, COLS);
  const row2 = cards.slice(COLS);

  return (
    <View style={styles.screen}>
      {/* Indice de départ */}
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>💌 {startHint}</Text>
      </View>

      {/* Pièces */}
      <View style={styles.coinsRow}>
        <Text style={styles.coinsLabel}>Gains</Text>
        <Text style={styles.coinsValue}>💰 {coins}</Text>
      </View>

      {/* Message */}
      <View style={message ? styles.msgBox : styles.msgBoxEmpty}>
        {!!message && <Text style={styles.msgText}>{message}</Text>}
      </View>

      {/* Rangée 1 */}
      <Text style={styles.rowLabel}>Rangée 1</Text>
      <View style={styles.row}>
        {row1.map((card, i) => (
          <CardTile key={card.id} card={card} onPress={() => revealCard(i)} disabled={gameOver} />
        ))}
      </View>

      {/* Rangée 2 */}
      <Text style={styles.rowLabel}>Rangée 2</Text>
      <View style={styles.row}>
        {row2.map((card, i) => (
          <CardTile key={card.id} card={card} onPress={() => revealCard(COLS + i)} disabled={gameOver} />
        ))}
      </View>

      {/* Bouton */}
      {!gameOver ? (
        <TouchableOpacity style={styles.betBtn} onPress={betNoHearts}>
          <Text style={styles.betText}>🤞 Parier qu'il n'y a plus de cœurs</Text>
          <Text style={styles.betSub}>Gagner {coins} pièces si vrai — tout perdre si faux</Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.doneBtn} onPress={() => onEnd(coins > 0, coins)}>
          <Text style={styles.doneBtnText}>Terminer · {coins} 💰</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Composant carte ───────────────────────────────────────────────────────────
function CardTile({ card, onPress, disabled }: { card: Card; onPress: () => void; disabled: boolean }) {
  const cs = CARD_STYLES[card.type];
  return (
    <TouchableOpacity
      style={[
        styles.card,
        card.revealed
          ? { backgroundColor: cs.bg, borderColor: cs.border }
          : styles.cardBack,
      ]}
      onPress={onPress}
      disabled={card.revealed || disabled}
      activeOpacity={0.75}
    >
      {card.revealed ? (
        <>
          <Text style={styles.cardCorner}>{EMOJI[card.type]}</Text>
          <Text style={[styles.cardCenter, { color: cs.text }]}>{EMOJI[card.type]}</Text>
        </>
      ) : (
        <Text style={styles.cardBackEmoji}>🎴</Text>
      )}
    </TouchableOpacity>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
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
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ruleEmoji: { fontSize: 22, width: 30, textAlign: 'center' },
  ruleText: { fontSize: 14, color: '#C0B8D8', flex: 1 },
  ruleBold: { fontWeight: '700', color: '#E0D8FF' },
  separator: { height: 1, backgroundColor: '#2E2A50', marginVertical: 14 },
  tipText: { fontSize: 13, color: '#A89CC0', textAlign: 'center', lineHeight: 20 },
  startBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  startText: { fontSize: 18, fontWeight: '900', color: '#fff' },

  // Jeu
  hintBox: {
    backgroundColor: '#1C1A2E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#4A3080',
  },
  hintText: { fontSize: 14, color: '#C9B8FF', textAlign: 'center', fontStyle: 'italic' },

  coinsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  coinsLabel: { fontSize: 13, color: '#7B6FA0', fontWeight: '600' },
  coinsValue: { fontSize: 22, fontWeight: '900', color: '#F59E0B' },

  msgBox: {
    backgroundColor: '#1C1A2E', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#3D3560', minHeight: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  msgBoxEmpty: { height: 40, marginBottom: 12 },
  msgText: { fontSize: 14, fontWeight: '700', color: '#E0D8FF', textAlign: 'center' },

  rowLabel: { fontSize: 11, fontWeight: '700', color: '#5A527A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row: { flexDirection: 'row', gap: CARD_GAP, marginBottom: 14 },

  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4,
  },
  cardBack: { backgroundColor: '#1E1545', borderColor: '#4A3080' },
  cardBackEmoji: { fontSize: CARD_W * 0.52 },
  cardCorner: { position: 'absolute', top: 4, left: 5, fontSize: 10 },
  cardCenter: { fontSize: CARD_W * 0.40 },

  betBtn: {
    backgroundColor: '#3B1F6B', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', marginTop: 4,
    borderWidth: 1, borderColor: '#7C3AED80',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 8, elevation: 5,
  },
  betText: { fontSize: 15, fontWeight: '900', color: '#D4AAFF' },
  betSub: { fontSize: 11, color: '#9B82CC', marginTop: 3, textAlign: 'center' },

  doneBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center', marginTop: 4,
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  doneBtnText: { fontSize: 17, fontWeight: '900', color: '#fff' },
});
