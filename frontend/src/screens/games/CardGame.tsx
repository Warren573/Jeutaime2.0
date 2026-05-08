import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useStore } from '../../store/useStore';
import {
  startCardGame,
  revealCard,
  claimCardGame,
  betCardGame,
  type CardSuit,
  type StartResult,
  type RevealResult,
} from '../../api/card-game';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const H_PAD   = 16;
const CARD_GAP = 8;
const COLS     = 5;
const CARD_W   = Math.floor((SCREEN_WIDTH - H_PAD * 2 - CARD_GAP * (COLS - 1)) / COLS);
const CARD_H   = Math.floor(CARD_W * 1.45);

interface Props {
  onEnd: (won: boolean, gained: number) => void;
}

interface LocalCard {
  index: number;
  suit: CardSuit | null; // null = face cachée
  revealed: boolean;
}

const CARD_STYLES: Record<CardSuit, { bg: string; border: string; text: string }> = {
  heart:   { bg: '#FFF0F5', border: '#E91E63', text: '#C2185B' },
  spade:   { bg: '#EEF2FF', border: '#3949AB', text: '#1A237E' },
  club:    { bg: '#F0FBF1', border: '#2E7D32', text: '#1B5E20' },
  diamond: { bg: '#FFF8E7', border: '#F57C00', text: '#E65100' },
};

const EMOJI: Record<CardSuit, string> = {
  heart: '❤️', spade: '♠️', club: '♣️', diamond: '♦️',
};

const SUIT_LABEL: Record<CardSuit, string> = {
  heart: 'cœur', spade: 'pique', club: 'trèfle', diamond: 'carreau',
};

const ENTRY_COST = 20;

function buildLocalCards(): LocalCard[] {
  return Array.from({ length: 10 }, (_, i) => ({ index: i, suit: null, revealed: false }));
}

type Phase = 'lobby' | 'playing' | 'done' | 'expired';

function isExpiredError(err: unknown): boolean {
  const msg: string = (err as any)?.message ?? '';
  return msg.toLowerCase().includes('expir');
}

export default function CardGame({ onEnd }: Props) {
  const loadWallet = useStore((s) => s.loadWallet);
  const isAuthenticated = useStore((s) => s.isAuthenticated);

  const [phase, setPhase]             = useState<Phase>('lobby');
  const [sessionId, setSessionId]     = useState<string | null>(null);
  const [cards, setCards]             = useState<LocalCard[]>(buildLocalCards());
  const [gainsCurrent, setGainsCurrent] = useState(0);
  const [message, setMessage]         = useState('');
  const [startHint, setStartHint]     = useState('');
  const [isLoading, setIsLoading]     = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  // ── Démarrage ────────────────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const result: StartResult = await startCardGame();
      setSessionId(result.sessionId);
      setCards(buildLocalCards());
      setGainsCurrent(0);
      setMessage('');
      setStartHint(
        `Il y a ${result.hint.count} ${EMOJI[result.hint.suit]} dans cette partie`,
      );
      setPhase('playing');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Impossible de démarrer la partie.');
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  // ── Révélation ───────────────────────────────────────────────────────────────
  const handleReveal = useCallback(async (index: number) => {
    if (!sessionId || pendingIndex !== null) return;
    const card = cards[index];
    if (!card || card.revealed) return;

    try {
      setPendingIndex(index);
      const result: RevealResult = await revealCard(sessionId, index);
      const { suit, gainsDelta, newGains, allRevealed, diamondHint } = result.effect;

      setCards((prev) =>
        prev.map((c) => c.index === index ? { ...c, suit, revealed: true } : c),
      );
      setGainsCurrent(newGains);

      // Message
      switch (suit) {
        case 'heart':
          setMessage(`❤️ +${gainsDelta} pièces !`);
          break;
        case 'spade':
          setMessage('♠️ Tout perdu !');
          break;
        case 'club':
          setMessage(`♣️ Gains divisés par 2 — ${newGains} 🪙`);
          break;
        case 'diamond':
          if (diamondHint) {
            setMessage(
              `♦️ Indice : il y a un ${SUIT_LABEL[diamondHint.suit]} en rangée ${diamondHint.row}`,
            );
          } else {
            setMessage('♦️ Plus aucune carte cachée.');
          }
          break;
      }

      if (allRevealed) {
        await doClaimAfterAllRevealed(sessionId, newGains);
      }
    } catch (err: any) {
      if (isExpiredError(err)) { setPhase('expired'); return; }
      Alert.alert('Erreur', err?.message ?? 'Impossible de révéler cette carte.');
    } finally {
      setPendingIndex(null);
    }
  }, [sessionId, cards, pendingIndex]);

  // ── Claim automatique (toutes les cartes révélées) ───────────────────────────
  const doClaimAfterAllRevealed = async (sid: string, gains: number) => {
    try {
      await claimCardGame(sid);
      await loadWallet();
      setPhase('done');
      onEnd(gains > 0, gains);
    } catch {
      // On ne bloque pas l'UI — les gains sont déjà crédités ou nuls
      setPhase('done');
      onEnd(gains > 0, gains);
    }
  };

  // ── Encaisser ────────────────────────────────────────────────────────────────
  const handleClaim = useCallback(async () => {
    if (!sessionId || isLoading) return;
    try {
      setIsLoading(true);
      const result = await claimCardGame(sessionId);
      await loadWallet();
      setPhase('done');
      onEnd(result.gained > 0, result.gained);
    } catch (err: any) {
      if (isExpiredError(err)) { setPhase('expired'); return; }
      Alert.alert('Erreur', err?.message ?? 'Impossible d\'encaisser.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, loadWallet, onEnd]);

  // ── Pari "plus de cœurs" ─────────────────────────────────────────────────────
  const handleBet = useCallback(async () => {
    if (!sessionId || isLoading) return;
    try {
      setIsLoading(true);
      const result = await betCardGame(sessionId);
      await loadWallet();
      if (result.won) {
        setMessage(`🎉 Bravo ! Il ne restait plus de cœurs — +${result.gained} 🪙`);
      } else {
        setMessage(`💔 Raté ! Il restait ${result.heartsRemaining} cœur${result.heartsRemaining > 1 ? 's' : ''} caché${result.heartsRemaining > 1 ? 's' : ''}.`);
      }
      setPhase('done');
      onEnd(result.won, result.gained);
    } catch (err: any) {
      if (isExpiredError(err)) { setPhase('expired'); return; }
      Alert.alert('Erreur', err?.message ?? 'Impossible de parier.');
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, isLoading, loadWallet, onEnd]);

  // ── Expired ──────────────────────────────────────────────────────────────────
  if (phase === 'expired') {
    return (
      <View style={styles.screen}>
        <View style={styles.expiredBox}>
          <Text style={styles.expiredEmoji}>⏰</Text>
          <Text style={styles.expiredTitle}>Session expirée</Text>
          <Text style={styles.expiredText}>
            Ta partie a expiré après 30 minutes d&apos;inactivité.{'\n'}
            Les {ENTRY_COST} 🪙 de mise de départ ne sont pas remboursés.
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.startBtn, isLoading && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startText}>Rejouer — {ENTRY_COST} 🪙</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Lobby ────────────────────────────────────────────────────────────────────
  if (phase === 'lobby') {
    return (
      <View style={styles.screen}>
        <View style={styles.titleRow}>
          <Text style={styles.titleEmoji}>🎴</Text>
          <Text style={styles.title}>Jeu de Cartes</Text>
        </View>

        <View style={styles.rulesBox}>
          <Text style={styles.rulesTitle}>Règles</Text>
          <RuleRow emoji="❤️" text={`Cœur → +15 pièces`} />
          <RuleRow emoji="♠️" text="Pique → tout perdu" />
          <RuleRow emoji="♣️" text="Trèfle → gains ÷ 2" />
          <RuleRow emoji="♦️" text="Carreau → indice sur une carte cachée" />
          <View style={styles.separator} />
          <Text style={styles.tipText}>
            💡 Pariez qu'il n'y a plus de cœurs pour empocher vos gains avant un piège.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.startBtn, isLoading && { opacity: 0.5 }]}
          onPress={handleStart}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.startText}>Jouer — {ENTRY_COST} 🪙</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  }

  // ── Jeu en cours ou terminé ──────────────────────────────────────────────────
  const row1 = cards.slice(0, COLS);
  const row2 = cards.slice(COLS);
  const isDone = phase === 'done';

  return (
    <View style={styles.screen}>
      <View style={styles.hintBox}>
        <Text style={styles.hintText}>💌 {startHint}</Text>
      </View>

      <View style={styles.coinsRow}>
        <Text style={styles.coinsLabel}>Gains</Text>
        <Text style={styles.coinsValue}>💰 {gainsCurrent}</Text>
      </View>

      <View style={message ? styles.msgBox : styles.msgBoxEmpty}>
        {!!message && <Text style={styles.msgText}>{message}</Text>}
      </View>

      <Text style={styles.rowLabel}>Rangée 1</Text>
      <View style={styles.row}>
        {row1.map((card: LocalCard) => (
          <CardTile
            key={card.index}
            card={card}
            pending={pendingIndex === card.index}
            onPress={() => handleReveal(card.index)}
            disabled={isDone || pendingIndex !== null}
          />
        ))}
      </View>

      <Text style={styles.rowLabel}>Rangée 2</Text>
      <View style={styles.row}>
        {row2.map((card: LocalCard) => (
          <CardTile
            key={card.index}
            card={card}
            pending={pendingIndex === card.index}
            onPress={() => handleReveal(card.index)}
            disabled={isDone || pendingIndex !== null}
          />
        ))}
      </View>

      {!isDone && (
        <>
          <TouchableOpacity
            style={[styles.betBtn, isLoading && { opacity: 0.5 }]}
            onPress={handleBet}
            disabled={isLoading}
          >
            <Text style={styles.betText}>🤞 Parier qu'il n'y a plus de cœurs</Text>
            <Text style={styles.betSub}>Gagner {gainsCurrent} 🪙 si vrai — tout perdre si faux</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.claimBtn, isLoading && { opacity: 0.5 }]}
            onPress={handleClaim}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.claimText}>✅ Encaisser {gainsCurrent} 🪙</Text>
            )}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

// ── Composants ────────────────────────────────────────────────────────────────

function RuleRow({ emoji, text }: { emoji: string; text: string }) {
  return (
    <View style={styles.ruleRow}>
      <Text style={styles.ruleEmoji}>{emoji}</Text>
      <Text style={styles.ruleText}>{text}</Text>
    </View>
  );
}

function CardTile({
  card,
  onPress,
  disabled,
  pending,
}: {
  card: LocalCard;
  onPress: () => any;
  disabled: boolean;
  pending: boolean;
}) {
  if (pending) {
    return (
      <View style={[styles.card, styles.cardBack, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator color="#C9B8FF" size="small" />
      </View>
    );
  }

  const cs = card.suit ? CARD_STYLES[card.suit] : null;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        card.revealed && cs ? { backgroundColor: cs.bg, borderColor: cs.border } : styles.cardBack,
      ]}
      onPress={onPress}
      disabled={card.revealed || disabled}
      activeOpacity={0.75}
    >
      {card.revealed && cs && card.suit ? (
        <>
          <Text style={styles.cardCorner}>{EMOJI[card.suit]}</Text>
          <Text style={[styles.cardCenter, { color: cs.text }]}>{EMOJI[card.suit]}</Text>
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
  titleRow:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 24 },
  titleEmoji: { fontSize: 36 },
  title:      { fontSize: 28, fontWeight: '900', color: '#F0E6FF', letterSpacing: 0.5 },
  rulesBox: {
    backgroundColor: '#1A1A30', borderRadius: 16, padding: 20,
    marginBottom: 28, borderWidth: 1, borderColor: '#2E2A50',
  },
  rulesTitle: { fontSize: 13, fontWeight: '800', color: '#7B6FA0', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 },
  ruleRow:    { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  ruleEmoji:  { fontSize: 22, width: 30, textAlign: 'center' },
  ruleText:   { fontSize: 14, color: '#C0B8D8', flex: 1, fontWeight: '600' },
  separator:  { height: 1, backgroundColor: '#2E2A50', marginVertical: 14 },
  tipText:    { fontSize: 13, color: '#A89CC0', textAlign: 'center', lineHeight: 20 },
  startBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  startText:  { fontSize: 18, fontWeight: '900', color: '#fff' },
  hintBox: {
    backgroundColor: '#1C1A2E', borderRadius: 12, paddingVertical: 10, paddingHorizontal: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#4A3080',
  },
  hintText:   { fontSize: 14, color: '#C9B8FF', textAlign: 'center', fontStyle: 'italic' },
  coinsRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  coinsLabel: { fontSize: 13, color: '#7B6FA0', fontWeight: '600' },
  coinsValue: { fontSize: 22, fontWeight: '900', color: '#F59E0B' },
  msgBox: {
    backgroundColor: '#1C1A2E', borderRadius: 10, paddingVertical: 9, paddingHorizontal: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#3D3560', minHeight: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  msgBoxEmpty:  { height: 40, marginBottom: 12 },
  msgText:      { fontSize: 14, fontWeight: '700', color: '#E0D8FF', textAlign: 'center' },
  rowLabel:     { fontSize: 11, fontWeight: '700', color: '#5A527A', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  row:          { flexDirection: 'row', gap: CARD_GAP, marginBottom: 14 },
  card: {
    width: CARD_W, height: CARD_H,
    borderRadius: 10, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center',
    padding: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.35, shadowRadius: 4, elevation: 4,
  },
  cardBack:       { backgroundColor: '#1E1545', borderColor: '#4A3080' },
  cardBackEmoji:  { fontSize: CARD_W * 0.52 },
  cardCorner:     { position: 'absolute', top: 4, left: 5, fontSize: 10 },
  cardCenter:     { fontSize: CARD_W * 0.40 },
  betBtn: {
    backgroundColor: '#3B1F6B', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 16,
    alignItems: 'center', marginTop: 4, marginBottom: 8,
    borderWidth: 1, borderColor: '#7C3AED80',
  },
  betText:  { fontSize: 15, fontWeight: '900', color: '#D4AAFF' },
  betSub:   { fontSize: 11, color: '#9B82CC', marginTop: 3, textAlign: 'center' },
  claimBtn: {
    backgroundColor: '#7C3AED', borderRadius: 14, paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#7C3AED', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.5, shadowRadius: 10, elevation: 6,
  },
  claimText: { fontSize: 17, fontWeight: '900', color: '#fff' },
  expiredBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 24,
  },
  expiredEmoji: { fontSize: 56, marginBottom: 16 },
  expiredTitle: { fontSize: 24, fontWeight: '900', color: '#F0E6FF', marginBottom: 12 },
  expiredText: {
    fontSize: 14, color: '#A89CC0', textAlign: 'center', lineHeight: 22,
  },
});
