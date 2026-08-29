import React, { useCallback, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useStore } from '../../store/useStore';
import { startCardGame, revealCard, claimCardGame, betCardGame, type CardSuit, type CardRank, type StartResult, type RevealResult } from '../../api/card-game';

const ENTRY_COST = 20;
interface Props { onEnd: (won: boolean, gained: number) => void; }
interface LocalCard { index: number; suit: CardSuit | null; rank: CardRank | null; revealed: boolean; }
const SUIT_LABEL: Record<CardSuit, string> = { heart: 'cœur', spade: 'pique', club: 'trèfle', diamond: 'carreau' };
function buildLocalCards(): LocalCard[] { return Array.from({ length: 10 }, (_, i) => ({ index: i, suit: null, rank: null, revealed: false })); }
type Phase = 'lobby' | 'playing' | 'done' | 'expired';
function isExpiredError(err: unknown) { return ((err as any)?.message ?? '').toLowerCase().includes('expir'); }
function isInsufficientCoinsError(err: unknown) { const e = err as any; return (e?.statusCode ?? e?.status ?? 0) === 402; }
function getErrorMessage(err: unknown) { if (isInsufficientCoinsError(err)) return `Pièces insuffisantes — il t'en faut ${ENTRY_COST}`; return (err as any)?.message ?? 'Une erreur est survenue'; }
function suitName(suit: CardSuit | null) { return suit ? SUIT_LABEL[suit] : ''; }

export default function CardGame({ onEnd }: Props) {
  const loadWallet = useStore((s) => s.loadWallet);
  const [phase, setPhase] = useState<Phase>('lobby');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [cards, setCards] = useState<LocalCard[]>(buildLocalCards());
  const [gainsCurrent, setGainsCurrent] = useState(0);
  const [message, setMessage] = useState('');
  const [startHint, setStartHint] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingIndex, setPendingIndex] = useState<number | null>(null);

  const handleStart = useCallback(async () => {
    if (isLoading) return;
    try {
      setIsLoading(true);
      const r: StartResult = await startCardGame();
      setSessionId(r.sessionId);
      setCards(buildLocalCards());
      setGainsCurrent(0);
      setMessage('');
      setStartHint(`Il y a ${r.hint.count} ${SUIT_LABEL[r.hint.suit]} dans cette partie.`);
      setPhase('playing');
    } catch (e: any) {
      if (isExpiredError(e)) setPhase('expired');
      else Alert.alert('Erreur', getErrorMessage(e));
    } finally { setIsLoading(false); }
  }, [isLoading]);

  const doClaimAfterAllRevealed = async (sid: string, gains: number) => {
    try { await claimCardGame(sid); await loadWallet(); } catch {}
    setPhase('done');
    onEnd(gains > 0, gains);
  };

  const handleReveal = useCallback(async (index: number) => {
    if (!sessionId || pendingIndex !== null || cards[index]?.revealed) return;
    try {
      setPendingIndex(index);
      const r: RevealResult = await revealCard(sessionId, index);
      const { suit, rank, gainsDelta, newGains, allRevealed, diamondHint } = r.effect;
      setCards((prev) => prev.map((c) => c.index === index ? { ...c, suit, rank: rank || null, revealed: true } : c));
      setGainsCurrent(newGains);
      if (suit === 'heart') setMessage(`Cœur : +${gainsDelta} pièces.`);
      if (suit === 'spade') setMessage('Pique : gains perdus.');
      if (suit === 'club') setMessage(`Trèfle : gains divisés par 2. Nouveau total : ${newGains} pièces.`);
      if (suit === 'diamond') setMessage(diamondHint ? `Carreau : indice — un ${diamondHint.rank} de ${SUIT_LABEL[diamondHint.suit]} se trouve en rangée ${diamondHint.row}.` : 'Carreau : aucune autre carte cachée.');
      if (allRevealed) await doClaimAfterAllRevealed(sessionId, newGains);
    } catch (e: any) {
      if (isExpiredError(e)) setPhase('expired');
      else Alert.alert('Erreur', getErrorMessage(e));
    } finally { setPendingIndex(null); }
  }, [sessionId, cards, pendingIndex]);

  const handleClaim = useCallback(async () => {
    if (!sessionId || isLoading) return;
    try {
      setIsLoading(true);
      const r = await claimCardGame(sessionId);
      await loadWallet();
      setPhase('done');
      onEnd(r.gained > 0, r.gained);
    } catch (e: any) {
      if (isExpiredError(e)) setPhase('expired');
      else Alert.alert('Erreur', getErrorMessage(e));
    } finally { setIsLoading(false); }
  }, [sessionId, isLoading, loadWallet, onEnd]);

  const handleBet = useCallback(async () => {
    if (!sessionId || isLoading) return;
    try {
      setIsLoading(true);
      const r = await betCardGame(sessionId);
      await loadWallet();
      setMessage(r.won ? `Pari gagné : +${r.gained} pièces.` : `Pari perdu : il restait ${r.heartsRemaining} cœur${r.heartsRemaining > 1 ? 's' : ''} caché${r.heartsRemaining > 1 ? 's' : ''}.`);
      setPhase('done');
      onEnd(r.won, r.gained);
    } catch (e: any) {
      if (isExpiredError(e)) setPhase('expired');
      else Alert.alert('Erreur', getErrorMessage(e));
    } finally { setIsLoading(false); }
  }, [sessionId, isLoading, loadWallet, onEnd]);

  const renderCard = (card: LocalCard) => <View key={card.index}>
    <Text>Carte {card.index + 1} : {card.revealed ? `${card.rank ?? ''} de ${suitName(card.suit)}` : 'cachée'}</Text>
    {!card.revealed && phase !== 'done' ? <Button title={pendingIndex === card.index ? 'Révélation...' : 'Révéler'} onPress={() => void handleReveal(card.index)} disabled={pendingIndex !== null} /> : null}
  </View>;

  if (phase === 'expired') return <View><Text>Session expirée</Text><Text>La partie a expiré après 30 minutes d'inactivité. Les {ENTRY_COST} pièces de mise ne sont pas remboursées.</Text><Button title={`Rejouer — ${ENTRY_COST} pièces`} onPress={() => void handleStart()} /></View>;
  if (phase === 'lobby') return <ScrollView><Text>Jeu de cartes</Text><Text>Règles</Text><Text>Cœur : +15 pièces</Text><Text>Pique : tout perdre</Text><Text>Trèfle : gains divisés par 2</Text><Text>Carreau : indice sur une carte cachée</Text><Text>Tu peux parier qu'il ne reste plus de cœurs ou encaisser tes gains.</Text><Button title={isLoading ? 'Démarrage...' : `Jouer — ${ENTRY_COST} pièces`} onPress={() => void handleStart()} disabled={isLoading} /></ScrollView>;

  const isDone = phase === 'done';
  return <ScrollView>
    <Text>Jeu de cartes</Text>
    <Text>{startHint}</Text>
    <Text>Gains : {gainsCurrent} pièces</Text>
    {message ? <Text>{message}</Text> : null}
    <Text>Rangée 1</Text>
    {cards.slice(0, 5).map(renderCard)}
    <Text>Rangée 2</Text>
    {cards.slice(5, 10).map(renderCard)}
    {!isDone ? <>
      <Button title="Parier qu'il n'y a plus de cœurs" onPress={() => void handleBet()} disabled={isLoading} />
      <Text>Si le pari est vrai, tu gagnes tes gains actuels. Sinon tu perds tout.</Text>
      <Button title={`Encaisser ${gainsCurrent} pièces`} onPress={() => void handleClaim()} disabled={isLoading} />
    </> : null}
  </ScrollView>;
}
