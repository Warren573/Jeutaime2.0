import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, Link, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import { acceptMatch } from '../api/matches';
import type { Letter, Match } from '../shared/types';
import { PremiumLetterAnimation } from '../components/PremiumLetterAnimation';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';
import { FEATURES } from '../config/features';
import { getRelationInfo } from '../engine/RelationEngine';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const MINI_FLAP_H = 54;
const LARGE_FLAP_H = 92;

interface EnvelopeCardProps {
  matchId: string;
  otherName: string;
  lastMsg?: Letter;
  unread: number;
  myTurn: boolean;
  letterCount: number;
  letterCountA: number;
  letterCountB: number;
  isPremium?: boolean;
  questionsValidated: boolean;
  matchStatus: 'pending' | 'active' | 'broken' | 'blocked';
  isInitiator: boolean;
  onOpen: () => void;
  onPlayQuestions: () => void | Promise<void>;
  onAccept: () => void | Promise<void>;
  formatTime: (ts: number) => string;
}

const EnvelopeCard = ({
  matchId,
  otherName,
  lastMsg,
  unread,
  myTurn,
  letterCount,
  letterCountA,
  letterCountB,
  isPremium = false,
  questionsValidated,
  matchStatus,
  isInitiator,
  onOpen,
  onPlayQuestions,
  onAccept,
  formatTime,
}: EnvelopeCardProps) => {
  const rel = getRelationInfo(letterCount, isPremium);

  // Petite animation tremblement quand lettre non lue
  const shakeX = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (unread <= 0) {
      shakeX.setValue(0);
      return;
    }
    // Tremblement discret répété toutes les 4 secondes
    const loop = Animated.loop(
      Animated.sequence([
        Animated.delay(3500),
        Animated.timing(shakeX, { toValue: -3, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 3, duration: 60, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: -2, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 2, duration: 50, useNativeDriver: true, easing: Easing.linear }),
        Animated.timing(shakeX, { toValue: 0, duration: 40, useNativeDriver: true, easing: Easing.linear }),
      ])
    );
    loop.start();
    return () => { loop.stop(); shakeX.setValue(0); };
  }, [unread]);

  const previewText = () => {
    if (matchStatus === 'pending') return '⏳ En attente d\'acceptation';
    if (matchStatus === 'broken' || matchStatus === 'blocked') return '🚫 Match terminé';
    if (!questionsValidated) return '🎮 Jeu des questions à compléter';
    if (!lastMsg) return myTurn ? '✍️ Écrivez la première lettre !' : '⏳ En attente de la première lettre...';
    if (unread > 0) return '📨 Nouvelle lettre reçue!';
    return myTurn ? "✍️ À vous d'écrire..." : '⏳ En attente de réponse...';
  };

  const timeText = () => {
    if (!lastMsg) return 'Nouveau';
    if (unread > 0) return 'Non lu';
    return myTurn ? formatTime(lastMsg.createdAt) : 'Envoyé';
  };

  const isActive = matchStatus === 'active';
  const canInteract = isActive && questionsValidated;

  return (
    <Animated.View
      style={[
        envStyles.card,
        unread > 0 && envStyles.cardUnread,
        { transform: [{ translateX: shakeX }] },
      ]}
    >
      <View style={envStyles.flapMini}>
        <View style={envStyles.foldLinesWrap}>
          <View style={[envStyles.foldLine, envStyles.foldLineLL]} />
          <View style={[envStyles.foldLine, envStyles.foldLineLR]} />
        </View>
        {unread > 0 ? (
          <View style={envStyles.sealMini}>
            <Text style={envStyles.sealEmoji}>⚜️</Text>
          </View>
        ) : (
          <Text style={envStyles.sealEmpty}>✉️</Text>
        )}
      </View>
      <View style={envStyles.divider} />

      <View style={envStyles.infoRow}>
        <Avatar size={42} {...DEFAULT_AVATAR} />
        <View style={envStyles.texts}>
          <View style={envStyles.nameRow}>
            <Text style={envStyles.name}>{otherName}</Text>
            {unread > 0 && (
              <View style={envStyles.badge}>
                <Text style={envStyles.badgeTxt}>{unread}</Text>
              </View>
            )}
          </View>
          <Text style={envStyles.preview} numberOfLines={1}>{previewText()}</Text>
          {canInteract ? (
            <Text style={envStyles.levelLine}>
              {rel.stars} Niveau {rel.level} — {rel.label}{'  '}
              <Text style={envStyles.letterCounter}>{letterCountA}↑ {letterCountB}↓</Text>
            </Text>
          ) : (
            <Text style={envStyles.levelLine}>{rel.stars} {rel.label}</Text>
          )}
        </View>
        <Text style={envStyles.time}>{timeText()}</Text>
      </View>

      <View style={envStyles.actionBar}>
        {matchStatus === 'pending' ? (
          isInitiator ? (
            <View style={[envStyles.actionLeft, envStyles.actionDisabled]}>
              <Text style={[envStyles.actionLeftText, envStyles.actionDisabledText]}>⏳ En attente</Text>
            </View>
          ) : (
            <TouchableOpacity style={envStyles.actionLeft} onPress={onAccept} activeOpacity={0.75}>
              <Text style={envStyles.actionLeftText}>✅ Accepter le match</Text>
            </TouchableOpacity>
          )
        ) : isActive && !questionsValidated ? (
          <TouchableOpacity style={envStyles.actionLeft} onPress={onPlayQuestions} activeOpacity={0.75}>
            <Text style={envStyles.actionLeftText}>🎮 Jouer aux questions</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[envStyles.actionLeft, !canInteract && envStyles.actionDisabled]}
            onPress={canInteract ? onOpen : undefined}
            activeOpacity={canInteract ? 0.75 : 1}
          >
            <Text style={[envStyles.actionLeftText, !canInteract && envStyles.actionDisabledText]}>
              📬 Lettres
            </Text>
          </TouchableOpacity>
        )}
        <View style={envStyles.actionSep} />
        <Link
          href={{ pathname: '/match-profile', params: { matchId } }}
          style={envStyles.actionRight}
        >
          {'👤 Profil →'}
        </Link>
      </View>
    </Animated.View>
  );
};

const envStyles = StyleSheet.create({
  card: {
    backgroundColor: '#FEFAF0',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
  },
  cardUnread: {
    borderColor: '#C9621A',
    shadowColor: '#C9621A',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 9,
  },
  flapMini: {
    height: MINI_FLAP_H,
    backgroundColor: '#C4924A',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  foldLinesWrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },
  foldLine: {
    position: 'absolute',
    height: 1.5,
    backgroundColor: '#7A4A18',
    opacity: 0.35,
  },
  foldLineLL: {
    width: CARD_W * 0.75,
    top: MINI_FLAP_H * 0.28,
    left: -CARD_W * 0.12,
    transform: [{ rotate: '22deg' }],
  },
  foldLineLR: {
    width: CARD_W * 0.75,
    top: MINI_FLAP_H * 0.28,
    right: -CARD_W * 0.12,
    transform: [{ rotate: '-22deg' }],
  },
  sealMini: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#7A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A1A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.55,
    shadowRadius: 5,
    elevation: 5,
  },
  sealEmoji: { fontSize: 20 },
  sealEmpty: { fontSize: 20, opacity: 0.35 },
  divider: { height: 1.5, backgroundColor: '#C4A882' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  texts: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#2C1A0E' },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#8B2E3C',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  preview:        { fontSize: 13, color: '#7A5C3A', marginTop: 2 },
  levelLine:      { fontSize: 11, color: '#B87333', marginTop: 4, fontWeight: '600' },
  time:           { fontSize: 11, color: '#9A7040' },
  actionBar:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#E8D9C6', minHeight: 40 },
  actionLeft:     { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 10 },
  actionLeftText: { fontSize: 12, color: '#5A3A1A', fontWeight: '700' },
  actionSep:      { width: 1, backgroundColor: '#E8D9C6' },
  actionRight:       { flex: 1, textAlign: 'center', paddingVertical: 10, fontSize: 12, color: '#9C4D1A', fontWeight: '700', letterSpacing: 0.3, textDecorationLine: 'none' },
  actionDisabled:    { opacity: 0.4 },
  actionDisabledText:{ color: '#9A7040' },
  letterCounter:     { fontSize: 10, color: '#B87333', fontWeight: '600' },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(10, 5, 2, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  largeWrapper: {
    width: SCREEN_W - 32,
  },
  largeBody: {
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B8956A',
    paddingTop: LARGE_FLAP_H + 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 16,
  },
  largeContent: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  largeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C1A0E',
    marginTop: 4,
  },
  largePreview: {
    fontSize: 15,
    color: '#5A3A1A',
    textAlign: 'center',
    lineHeight: 23,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  largeTap: {
    fontSize: 12,
    color: '#9A7040',
    marginTop: 8,
    letterSpacing: 1.5,
  },

  largeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LARGE_FLAP_H + 4,
    backgroundColor: '#C4924A',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: '#B8956A',
    borderBottomWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    zIndex: 10,
  },
  foldLineLLLarge: {
    width: (SCREEN_W - 32) * 0.75,
    top: LARGE_FLAP_H * 0.3,
    left: -(SCREEN_W - 32) * 0.12,
    transform: [{ rotate: '18deg' }],
  },
  foldLineLRLarge: {
    width: (SCREEN_W - 32) * 0.75,
    top: LARGE_FLAP_H * 0.3,
    right: -(SCREEN_W - 32) * 0.12,
    transform: [{ rotate: '-18deg' }],
  },
  sealLarge: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: '#7A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#7A1A1A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 10,
    elevation: 10,
  },
  sealLargeEmoji: { fontSize: 30 },

  particle: {
    position: 'absolute',
    fontSize: 22,
    bottom: '45%',
  },
});

interface LetterCardProps {
  letter: Letter;
  isOwn: boolean;
  isNew: boolean;
  otherName: string;
  formatTime: (ts: number) => string;
  onSeen: () => void;
}

function LetterCard({ letter, isOwn, otherName, formatTime }: Omit<LetterCardProps, 'isNew' | 'onSeen'>) {
  return (
    <View style={lcStyles.wrapper}>
      <Text style={lcStyles.header}>
        {isOwn ? 'Ta lettre' : `Lettre de ${otherName}`}
      </Text>
      <View style={[lcStyles.card, isOwn && lcStyles.cardOwn]}>
        <Text style={lcStyles.text}>{letter.content}</Text>
        <Text style={lcStyles.time}>{formatTime(letter.createdAt)}</Text>
      </View>
    </View>
  );
}

const lcStyles = StyleSheet.create({
  wrapper: { marginBottom: 24 },
  header: {
    fontSize: 11,
    letterSpacing: 1.5,
    color: '#6B6B6B',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  animContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#FEFAF0',
    borderRadius: 14,
    padding: 18,
    borderWidth: 1.5,
    borderColor: '#D4B896',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  cardOwn: {
    backgroundColor: '#FFF5F0',
    borderColor: '#E8C8B8',
  },
  text: {
    fontSize: 15,
    color: '#2C1A0E',
    lineHeight: 25,
    fontStyle: 'italic',
  },
  time: {
    fontSize: 10,
    color: '#9A7040',
    marginTop: 12,
    textAlign: 'right',
    letterSpacing: 0.5,
  },
});

type TabType = 'lettres' | 'journal' | 'souvenirs';

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
}

interface Souvenir {
  id: string;
  type: 'match' | 'letter' | 'gift' | 'milestone';
  title: string;
  description: string;
  date: string;
  emoji: string;
}

export default function LettersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    matches, letters, lettersByMatch, questionsByMatch,
    addLetter, markLetterRead, markLetterReadApi,
    loadLetters, sendApiLetter, loadQuestions, submitAnswers,
    loadMatches, currentUser, matchPartners, addPoints, duelEntries,
  } = useStore();

  useFocusEffect(
    useCallback(() => {
      loadMatches();
    }, [loadMatches]),
  );
  const screenBg = useStore(s => s.screenBackgrounds?.['letters'] ?? '#FFF8E7');

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [showQGame, setShowQGame] = useState(false);
  const [qGameMatch, setQGameMatch] = useState<Match | null>(null);
  const [qSelectedAnswers, setQSelectedAnswers] = useState<Record<string, string>>({});
  const [qSubmitting, setQSubmitting] = useState(false);
  const [qResult, setQResult] = useState<{ myScore: number; passed: boolean; questionsValidated: boolean; waitingForOther: boolean; matchBroken: boolean } | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('lettres');

  const [envAnimVisible, setEnvAnimVisible] = useState(false);
  const [envAnimSender, setEnvAnimSender] = useState('');

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    {
      id: '1',
      date: '2025-03-12',
      title: 'Premier jour sur JeuTaime',
      content: "Aujourd'hui j'ai découvert cette application incroyable...",
      mood: '😊',
    },
  ]);

  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('😊');

  const [souvenirs] = useState<Souvenir[]>([
    {
      id: '1',
      type: 'milestone',
      title: 'Inscription',
      description: 'Tu as rejoint JeuTaime!',
      date: '2025-03-12',
      emoji: '🎉',
    },
    {
      id: '2',
      type: 'match',
      title: 'Premier Match',
      description: 'Tu as eu ton premier match!',
      date: '2025-03-12',
      emoji: '🌟',
    },
  ]);

  const visibleTabs = useMemo(() => {
    const tabs: TabType[] = [];

    if (FEATURES.letters !== 'hidden') tabs.push('lettres');
    if (FEATURES.journal !== 'hidden') tabs.push('journal');
    tabs.push('souvenirs');

    return tabs;
  }, []);

  useEffect(() => {
    if (!visibleTabs.includes(activeTab)) {
      setActiveTab(visibleTabs[0] ?? 'souvenirs');
    }
  }, [activeTab, visibleTabs]);

  const getOtherUserId = (match: Match): string => {
    const myId = currentUser?.id ?? 'me';
    return match.userAId === myId ? match.userBId : match.userAId;
  };

  // Retourne le nom affiché du partenaire (pseudo réel si disponible, sinon userId)
  const getOtherName = (match: Match): string => {
    const otherId = getOtherUserId(match);
    return matchPartners[otherId]?.pseudo ?? otherId;
  };

  // Garde l'ancienne signature pour compatibilité (utilisée dans certains endroits)
  const getOtherUserName = getOtherName;

  const getConversation = (match: Match) => {
    // Préférer les lettres API si elles ont été chargées pour ce match
    const apiLetters = lettersByMatch[match.id];
    if (apiLetters !== undefined) {
      return apiLetters;
    }
    // Fallback : lettres locales du store
    const otherId = getOtherUserId(match);
    return letters
      .filter(l => l.fromUserId === otherId || l.toUserId === otherId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const isMyTurn = (match: Match): boolean => {
    // Préférer canSend du backend si disponible (plus fiable)
    return match.canSend;
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !selectedMatch) return;
    if (!selectedMatch.canSend) return;

    const content = newMessage.trim();
    setNewMessage('');

    try {
      await sendApiLetter(selectedMatch.id, content);
    } catch (err: any) {
      // Restaurer le message en cas d'erreur pour que l'utilisateur puisse réessayer
      setNewMessage(content);
      const msg: string = err?.message ?? '';
      if (msg.includes('AWAITING_REPLY') || msg.includes('alternation') || msg.includes('tour')) {
        Alert.alert('Pas encore ton tour', "Tu dois attendre la réponse de l'autre avant d'écrire à nouveau.");
      } else if (msg.includes('QUESTIONS_NOT_VALIDATED') || msg.includes('questions')) {
        Alert.alert('Questions requises', 'Le jeu des 3 questions doit être complété avant d\'écrire.');
      } else {
        Alert.alert('Erreur', "La lettre n'a pas pu être envoyée. Vérifie ta connexion et réessaie.");
      }
    }
  };

  const handleAccept = async (match: Match) => {
    try {
      await acceptMatch(match.id);
      await loadMatches();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? "Impossible d'accepter le match");
    }
  };

  const handleQGameOpen = async (match: Match) => {
    setQGameMatch(match);
    setQSelectedAnswers({});
    setQResult(null);
    setShowQGame(true);
    loadQuestions(match.id);
  };

  const handleQGameSubmit = async () => {
    if (!qGameMatch) return;
    const questions = questionsByMatch[qGameMatch.id]?.questions ?? [];
    const answers = questions.map(q => ({
      profileQuestionId: q.profileQuestionId,
      answer: qSelectedAnswers[q.profileQuestionId] ?? '',
    }));
    if (answers.some(a => !a.answer)) {
      Alert.alert('Incomplet', 'Tu dois répondre à toutes les questions.');
      return;
    }
    setQSubmitting(true);
    try {
      const result = await submitAnswers(qGameMatch.id, answers);
      setQResult(result);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message ?? 'Une erreur est survenue.');
    } finally {
      setQSubmitting(false);
    }
  };

  const handleAddJournal = () => {
    if (!journalTitle.trim() || !journalContent.trim()) return;

    const entry: JournalEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      title: journalTitle.trim(),
      content: journalContent.trim(),
      mood: journalMood,
    };

    setJournalEntries(prev => [entry, ...prev]);
    addPoints(5);
    setJournalTitle('');
    setJournalContent('');
    setShowJournalModal(false);
  };

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;

    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const moods = ['😊', '😍', '🥰', '😢', '😤', '🤔', '😴', '🎉'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'lettres':
        return (
          <>
            <TouchableOpacity style={styles.duelBtn} onPress={() => router.push('/duel/create')}>
              <Text style={styles.duelBtnEmoji}>⚔️</Text>
              <View style={styles.duelBtnTextWrap}>
                <Text style={styles.duelBtnTitle}>Lancer un duel</Text>
                <Text style={styles.duelBtnSubtitle}>Défiez un contact en Pierre • Papier • Ciseaux</Text>
              </View>
              <Text style={styles.duelBtnArrow}>▶</Text>
            </TouchableOpacity>

            {matches.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>✉️</Text>
                <Text style={styles.emptyText}>Aucune lettre</Text>
                <Text style={styles.emptySubtext}>
                  Réussissez des matchs pour recevoir vos premières enveloppes!
                </Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.listCount}>
                  {matches.length} enveloppe{matches.length > 1 ? 's' : ''}
                </Text>

                {matches.map((match) => {
                  const otherName = getOtherName(match);
                  const conv = getConversation(match);
                  const lastMsg = conv[conv.length - 1];
                  const unread = conv.filter(
                    l => l.toUserId === (currentUser?.id || 'me') && !l.readAt
                  ).length;

                  return (
                    <EnvelopeCard
                      key={match.id}
                      matchId={match.id}
                      otherName={otherName}
                      lastMsg={lastMsg}
                      unread={unread}
                      myTurn={isMyTurn(match)}
                      letterCount={conv.length}
                      letterCountA={match.letterCountA}
                      letterCountB={match.letterCountB}
                      isPremium={currentUser?.isPremium}
                      questionsValidated={match.questionsValidated}
                      matchStatus={match.status}
                      isInitiator={match.initiatorId === (currentUser?.id ?? '')}
                      onAccept={() => handleAccept(match)}
                      onPlayQuestions={() => handleQGameOpen(match)}
                      onOpen={() => {
                        const unreadLetters = conv.filter(
                          l => (l.toUserId === (currentUser?.id ?? 'me')) && !l.readAt
                        );

                        setSelectedMatch(match);
                        setShowCompose(true);
                        loadLetters(match.id);

                        // Grande animation uniquement si une lettre reçue non lue
                        if (unreadLetters.length > 0) {
                          setEnvAnimSender(getOtherName(match));
                          setEnvAnimVisible(true);
                          setTimeout(() => {
                            setEnvAnimVisible(false);
                            unreadLetters.forEach(l => markLetterReadApi(l.id));
                          }, 5100);
                        }
                      }}
                      formatTime={formatTime}
                    />
                  );
                })}
              </ScrollView>
            )}
          </>
        );

      case 'journal':
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            <TouchableOpacity style={styles.addBtn} onPress={() => setShowJournalModal(true)}>
              <Text style={styles.addBtnEmoji}>✏️</Text>
              <Text style={styles.addBtnText}>Nouvelle entrée</Text>
            </TouchableOpacity>

            {duelEntries.length > 0 && (
              <>
                <Text style={styles.journalSectionTitle}>⚔️ Duels récents</Text>
                {duelEntries.slice(0, 5).map(entry => (
                  <View key={entry.id} style={[styles.journalCard, styles.duelJournalCard]}>
                    <View style={styles.journalHeader}>
                      <Text style={styles.journalMood}>⚔️</Text>
                      <Text style={styles.journalDate}>
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.journalContent}>{entry.text}</Text>
                  </View>
                ))}
              </>
            )}

            {journalEntries.length === 0 && duelEntries.length === 0 ? (
              <View style={styles.emptyJournal}>
                <Text style={styles.emptyJournalEmoji}>📔</Text>
                <Text style={styles.emptyJournalText}>Ton journal est vide</Text>
                <Text style={styles.emptyJournalSubtext}>
                  Écris tes pensées et garde un souvenir de ton aventure
                </Text>
              </View>
            ) : (
              journalEntries.map(entry => (
                <View key={entry.id} style={styles.journalCard}>
                  <View style={styles.journalHeader}>
                    <Text style={styles.journalMood}>{entry.mood}</Text>
                    <Text style={styles.journalDate}>{entry.date}</Text>
                  </View>
                  <Text style={styles.journalTitle}>{entry.title}</Text>
                  <Text style={styles.journalContent}>{entry.content}</Text>
                </View>
              ))
            )}
          </ScrollView>
        );

      case 'souvenirs':
      default:
        return (
          <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
            {souvenirs.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📦</Text>
                <Text style={styles.emptyText}>Boîte à souvenirs vide</Text>
                <Text style={styles.emptySubtext}>Tes moments spéciaux apparaîtront ici</Text>
              </View>
            ) : (
              souvenirs.map(souvenir => (
                <View key={souvenir.id} style={styles.souvenirCard}>
                  <Text style={styles.souvenirEmoji}>{souvenir.emoji}</Text>
                  <View style={styles.souvenirInfo}>
                    <Text style={styles.souvenirTitle}>{souvenir.title}</Text>
                    <Text style={styles.souvenirDesc}>{souvenir.description}</Text>
                    <Text style={styles.souvenirDate}>{souvenir.date}</Text>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        );
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <View style={styles.header}>
        <Text style={styles.headerKicker}>JEUTAIME</Text>
        <Text style={styles.headerTitle}>Boîte aux lettres</Text>
        <Text style={styles.headerSubtitle}>Correspondances privées</Text>
      </View>

      <View style={styles.tabsContainer}>
        {FEATURES.letters !== 'hidden' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'lettres' && styles.tabActive]}
            onPress={() => setActiveTab('lettres')}
          >
            <Text style={[styles.tabText, activeTab === 'lettres' && styles.tabTextActive]}>
              📬 Lettres
            </Text>
          </TouchableOpacity>
        )}

        {FEATURES.journal !== 'hidden' && (
          <TouchableOpacity
            style={[styles.tab, activeTab === 'journal' && styles.tabActive]}
            onPress={() => setActiveTab('journal')}
          >
            <Text style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>
              📔 Journal
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.tab, activeTab === 'souvenirs' && styles.tabActive]}
          onPress={() => setActiveTab('souvenirs')}
        >
          <Text style={[styles.tabText, activeTab === 'souvenirs' && styles.tabTextActive]}>
            🎁 Souvenirs
          </Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}

      <Modal visible={showCompose} animationType="slide">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCompose(false); router.replace('/(tabs)/letters'); }}>
              <Text style={styles.closeText}>← Retour</Text>
            </TouchableOpacity>
            {/* Nom cliquable → profil du match (replace = démonte LettersScreen, évite modal fantôme) */}
            <TouchableOpacity
              style={styles.modalTitleBtn}
              onPress={() => { if (selectedMatch) { setShowCompose(false); router.replace({ pathname: '/match-profile', params: { matchId: selectedMatch.id } }); } }}
            >
              <Text style={styles.modalTitle}>
                {selectedMatch ? getOtherName(selectedMatch) : ''}
              </Text>
              <Text style={styles.modalTitleHint}>voir le profil ↗</Text>
            </TouchableOpacity>
            <View style={{ width: 60 }} />
          </View>

          {selectedMatch && (() => {
            const conv = getConversation(selectedMatch);
            const rel  = getRelationInfo(conv.length, currentUser?.isPremium ?? false);
            const myTurn = isMyTurn(selectedMatch);
            const isViewerA = selectedMatch.userAId === (currentUser?.id ?? 'me');
            const myLetters = isViewerA ? selectedMatch.letterCountA : selectedMatch.letterCountB;
            const theirLetters = isViewerA ? selectedMatch.letterCountB : selectedMatch.letterCountA;
            return (
              <>
                {/* ── Niveau de la relation ── */}
                <View style={styles.relationBanner}>
                  <Text style={styles.relationBannerStars}>{rel.stars}</Text>
                  <View style={styles.relationBannerText}>
                    <Text style={styles.relationBannerLevel}>
                      Niveau {rel.level} — {rel.label}
                    </Text>
                    <Text style={styles.relationBannerProgress}>
                      Mes lettres : {myLetters}  ·  Ses lettres : {theirLetters}
                    </Text>
                  </View>
                </View>

                {/* ── Tour de parole ── */}
                <View style={[styles.turnBanner, myTurn ? styles.turnBannerMine : styles.turnBannerWait]}>
                  <Text style={styles.turnBannerText}>
                    {conv.length === 0
                      ? '🪶  Écrivez la première lettre'
                      : myTurn
                        ? "📬  C'est votre tour — répondez à la lettre reçue"
                        : '⏳  Lettre envoyée — en attente de réponse'}
                  </Text>
                </View>
              </>
            );
          })()}

          <ScrollView style={styles.messagesContainer}>
            {selectedMatch &&
              getConversation(selectedMatch).map((letter) => {
                const isOwn =
                  letter.fromUserId === currentUser?.id || letter.fromUserId === 'me';
                const otherName = getOtherName(selectedMatch);

                return (
                  <LetterCard
                    key={letter.id}
                    letter={letter}
                    isOwn={isOwn}
                    otherName={otherName}
                    formatTime={formatTime}
                  />
                );
              })}

            {selectedMatch && getConversation(selectedMatch).length === 0 && (
              selectedMatch.canSend ? (
                <View style={styles.startConv}>
                  <Text style={styles.startEmoji}>✨</Text>
                  <Text style={styles.startText}>Commencez la conversation!</Text>
                </View>
              ) : (
                <View style={styles.startConv}>
                  <Text style={styles.startEmoji}>⏳</Text>
                  <Text style={styles.startText}>
                    {selectedMatch.canSendReason === 'AWAITING_REPLY'
                      ? "L'autre doit envoyer la première lettre.\nTu pourras répondre ensuite."
                      : "En attente de la réponse de l'autre."}
                  </Text>
                </View>
              )
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TextInput
              style={styles.input}
              placeholder={selectedMatch?.canSend ? 'Écrivez votre lettre...' : "En attente de réponse..."}
              placeholderTextColor="#8B6F47"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              editable={selectedMatch?.canSend ?? false}
            />
            <TouchableOpacity
              style={[styles.sendBtn, !(selectedMatch?.canSend) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!(selectedMatch?.canSend)}
            >
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>

          {envAnimVisible && (
            <View style={styles.envAnimOverlay}>
              <PremiumLetterAnimation senderName={envAnimSender} />
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Jeu des 3 questions ─────────────────────────────────── */}
      <Modal visible={showQGame} animationType="slide">
        <View style={[qStyles.container, { paddingTop: insets.top }]}>
          <View style={qStyles.header}>
            <TouchableOpacity onPress={() => { setShowQGame(false); setQGameMatch(null); setQResult(null); }}>
              <Text style={qStyles.back}>← Retour</Text>
            </TouchableOpacity>
            <Text style={qStyles.title}>🎮 Jeu des questions</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView contentContainerStyle={qStyles.scroll}>
            {qResult ? (
              /* ── Résultat ── */
              <View style={qStyles.resultBox}>
                {qResult.matchBroken ? (
                  <>
                    <Text style={qStyles.resultEmoji}>💔</Text>
                    <Text style={qStyles.resultTitle}>Match rompu</Text>
                    <Text style={qStyles.resultSub}>
                      L'un de vous n'a pas obtenu au moins 1 bonne réponse.{'\n'}Ce match est terminé.
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => { setShowQGame(false); setQResult(null); }}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : qResult.waitingForOther ? (
                  <>
                    <Text style={qStyles.resultEmoji}>⏳</Text>
                    <Text style={qStyles.resultTitle}>Réponses envoyées !</Text>
                    <Text style={qStyles.resultSub}>
                      Tu as obtenu {qResult.myScore}/3.{'\n'}En attente de l'autre joueur…
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => { setShowQGame(false); setQResult(null); }}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </>
                ) : qResult.questionsValidated ? (
                  <>
                    <Text style={qStyles.resultEmoji}>🎉</Text>
                    <Text style={qStyles.resultTitle}>Validé !</Text>
                    <Text style={qStyles.resultSub}>
                      Les deux joueurs ont réussi.{'\n'}Vous pouvez maintenant vous écrire!
                    </Text>
                    <TouchableOpacity
                      style={[qStyles.closeBtn, qStyles.closeBtnSuccess]}
                      onPress={() => {
                        setShowQGame(false);
                        setQResult(null);
                        if (qGameMatch) {
                          const freshMatch = matches.find(m => m.id === qGameMatch.id) ?? qGameMatch;
                          setSelectedMatch(freshMatch);
                          setShowCompose(true);
                          loadLetters(qGameMatch.id);
                        }
                      }}
                    >
                      <Text style={qStyles.closeBtnText}>📬 Écrire une lettre</Text>
                    </TouchableOpacity>
                  </>
                ) : null}
              </View>
            ) : (() => {
              const matchQ = qGameMatch ? questionsByMatch[qGameMatch.id] : null;
              if (!matchQ) {
                return (
                  <View style={qStyles.loading}>
                    <ActivityIndicator color="#9C2F45" />
                    <Text style={qStyles.loadingText}>Chargement des questions…</Text>
                  </View>
                );
              }
              if (matchQ.myStatus === 'submitted') {
                return (
                  <View style={qStyles.resultBox}>
                    <Text style={qStyles.resultEmoji}>✅</Text>
                    <Text style={qStyles.resultTitle}>Déjà répondu</Text>
                    <Text style={qStyles.resultSub}>
                      Score : {matchQ.myScore}/3{'\n'}En attente de l'autre joueur…
                    </Text>
                    <TouchableOpacity style={qStyles.closeBtn} onPress={() => setShowQGame(false)}>
                      <Text style={qStyles.closeBtnText}>Fermer</Text>
                    </TouchableOpacity>
                  </View>
                );
              }
              return (
                <>
                  <Text style={qStyles.intro}>
                    Réponds aux 3 questions de{' '}
                    <Text style={qStyles.introName}>{qGameMatch ? getOtherName(qGameMatch) : ''}</Text>.
                    {'\n'}Au moins 1 bonne réponse est nécessaire pour débloquer les lettres.
                  </Text>

                  {matchQ.questions.map((q, idx) => (
                    <View key={q.profileQuestionId} style={qStyles.questionBlock}>
                      <Text style={qStyles.questionNum}>Question {idx + 1}</Text>
                      <Text style={qStyles.questionText}>{q.questionText}</Text>
                      {q.options ? (
                        q.options.map((opt) => (
                          <TouchableOpacity
                            key={opt}
                            style={[
                              qStyles.optionBtn,
                              qSelectedAnswers[q.profileQuestionId] === opt && qStyles.optionBtnSelected,
                            ]}
                            onPress={() =>
                              setQSelectedAnswers(prev => ({ ...prev, [q.profileQuestionId]: opt }))
                            }
                          >
                            <Text style={[
                              qStyles.optionText,
                              qSelectedAnswers[q.profileQuestionId] === opt && qStyles.optionTextSelected,
                            ]}>
                              {opt}
                            </Text>
                          </TouchableOpacity>
                        ))
                      ) : (
                        <TextInput
                          style={qStyles.freeInput}
                          placeholder="Ta réponse…"
                          placeholderTextColor="#9A7040"
                          value={qSelectedAnswers[q.profileQuestionId] ?? ''}
                          onChangeText={v =>
                            setQSelectedAnswers(prev => ({ ...prev, [q.profileQuestionId]: v }))
                          }
                        />
                      )}
                    </View>
                  ))}

                  <TouchableOpacity
                    style={[qStyles.submitBtn, qSubmitting && qStyles.submitBtnDisabled]}
                    onPress={handleQGameSubmit}
                    disabled={qSubmitting}
                  >
                    {qSubmitting
                      ? <ActivityIndicator color="#fff" />
                      : <Text style={qStyles.submitBtnText}>Envoyer mes réponses</Text>
                    }
                  </TouchableOpacity>
                </>
              );
            })()}
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={showJournalModal} animationType="slide" transparent>
        <View style={styles.journalModalBg}>
          <KeyboardAvoidingView
            style={styles.journalModalBox}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.journalModalHeader}>
              <Text style={styles.journalModalTitle}>📔 Nouvelle entrée</Text>
              <TouchableOpacity onPress={() => setShowJournalModal(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.moodSelector}>
              <Text style={styles.moodLabel}>Comment te sens-tu?</Text>
              <View style={styles.moodsRow}>
                {moods.map(mood => (
                  <TouchableOpacity
                    key={mood}
                    style={[styles.moodBtn, journalMood === mood && styles.moodBtnActive]}
                    onPress={() => setJournalMood(mood)}
                  >
                    <Text style={styles.moodBtnText}>{mood}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <TextInput
              style={styles.journalInput}
              placeholder="Titre de ton entrée..."
              placeholderTextColor="#8B6F47"
              value={journalTitle}
              onChangeText={setJournalTitle}
            />

            <TextInput
              style={[styles.journalInput, styles.journalTextarea]}
              placeholder="Qu'as-tu envie de raconter aujourd'hui?"
              placeholderTextColor="#8B6F47"
              value={journalContent}
              onChangeText={setJournalContent}
              multiline
              numberOfLines={6}
            />

            <TouchableOpacity style={styles.saveJournalBtn} onPress={handleAddJournal}>
              <Text style={styles.saveJournalText}>💾 Sauvegarder</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4ECD8' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 0,
    backgroundColor: '#2C1A0E',
  },
  headerKicker: {
    fontSize: 10,
    letterSpacing: 3,
    color: '#B87333',
    fontWeight: '700',
    marginBottom: 4,
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F0D98C' },
  headerSubtitle: {
    fontSize: 12,
    color: '#A08870',
    marginTop: 4,
    fontStyle: 'italic',
  },

  tabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
  },
  tab: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
    marginHorizontal: 3,
  },
  tabActive: { backgroundColor: '#8B2E3C' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#A08870' },
  tabTextActive: { color: '#FFF' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 160 },
  listCount: {
    fontSize: 12,
    color: '#8B6F47',
    marginBottom: 12,
    textAlign: 'center',
  },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 32,
  },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  addBtnEmoji: { fontSize: 20, marginRight: 8 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  emptyJournal: { alignItems: 'center', paddingVertical: 40 },
  emptyJournalEmoji: { fontSize: 50, marginBottom: 12 },
  emptyJournalText: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  emptyJournalSubtext: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 6,
    textAlign: 'center',
  },
  journalCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DAA520',
  },
  journalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  journalMood: { fontSize: 24 },
  journalDate: { fontSize: 12, color: '#8B6F47' },
  journalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 6,
  },
  journalContent: { fontSize: 14, color: '#5D4037', lineHeight: 20 },

  souvenirCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  souvenirEmoji: { fontSize: 40, marginRight: 14 },
  souvenirInfo: { flex: 1 },
  souvenirTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  souvenirDesc: { fontSize: 13, color: '#5D4037', marginTop: 2 },
  souvenirDate: { fontSize: 11, color: '#8B6F47', marginTop: 4 },

  duelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  duelBtnEmoji: { fontSize: 26, marginRight: 12 },
  duelBtnTextWrap: { flex: 1, minWidth: 0 },
  duelBtnTitle: { color: '#2C1A0E', fontSize: 16, fontWeight: '800' },
  duelBtnSubtitle: { color: '#9A7040', fontSize: 12, marginTop: 3 },
  duelBtnArrow: { fontSize: 14, color: '#7A1A1A', marginLeft: 8 },

  journalSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6F47',
    marginBottom: 8,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  duelJournalCard: { borderLeftColor: '#B47CFF' },

  envAnimOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F4ECD8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  modalContainer: { flex: 1, backgroundColor: '#F4ECD8' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
  },
  closeText:      { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  modalTitleBtn:  { flex: 1, alignItems: 'center' },
  modalTitle:     { fontSize: 17, fontWeight: '700', color: '#F0D98C', letterSpacing: 0.3 },
  modalTitleHint: { fontSize: 10, color: '#B87333', marginTop: 2, letterSpacing: 0.5 },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },

  startConv: { alignItems: 'center', paddingVertical: 60 },
  startEmoji: { fontSize: 50, marginBottom: 12 },
  startText: { fontSize: 16, color: '#9A7040' },
  inputContainer: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#2C1A0E',
    borderTopWidth: 1,
    borderTopColor: '#5A3A1A',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FEFAF0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    maxHeight: 100,
    color: '#2C1A0E',
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnText:     { fontSize: 18, color: '#FFF' },
  sendBtnDisabled: { opacity: 0.4 },

  relationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#1C1208',
    borderBottomWidth: 1,
    borderBottomColor: '#3A2818',
    gap: 10,
  },
  relationBannerStars:    { fontSize: 16 },
  relationBannerText:     { flex: 1 },
  relationBannerLevel:    { fontSize: 13, fontWeight: '700', color: '#D4A862' },
  relationBannerProgress: { fontSize: 11, color: '#8B6F47', marginTop: 2, fontStyle: 'italic' },

  turnBanner: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#5A3A1A',
  },
  turnBannerMine: { backgroundColor: '#1A2E1A' },
  turnBannerWait: { backgroundColor: '#2A1A0A' },
  turnBannerText: { fontSize: 13, fontWeight: '600', color: '#C4A882' },

  journalModalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  journalModalBox: {
    backgroundColor: '#FFF8E7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%',
  },
  journalModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  journalModalTitle: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  closeX: { fontSize: 24, color: '#8B6F47' },
  moodSelector: { marginBottom: 16 },
  moodLabel: { fontSize: 14, color: '#5D4037', marginBottom: 10 },
  moodsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodBtnActive: { borderColor: '#E91E63', backgroundColor: '#FFE4EC' },
  moodBtnText: { fontSize: 24 },
  journalInput: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  journalTextarea: { height: 120, textAlignVertical: 'top' },
  saveJournalBtn: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveJournalText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});

// ── Styles du jeu des 3 questions ────────────────────────────────
const qStyles = StyleSheet.create({
  container:      { flex: 1, backgroundColor: '#FFF8E7' },
  header:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D9C6' },
  back:           { fontSize: 15, color: '#9C2F45', fontWeight: '600' },
  title:          { fontSize: 17, fontWeight: '700', color: '#2C1A0E' },
  scroll:         { padding: 20, paddingBottom: 60 },
  loading:        { alignItems: 'center', marginTop: 60, gap: 12 },
  loadingText:    { color: '#7A5C3A', fontSize: 15 },
  intro:          { fontSize: 14, color: '#5A3A1A', lineHeight: 22, marginBottom: 24, textAlign: 'center' },
  introName:      { fontWeight: '700', color: '#9C2F45' },
  questionBlock:  { backgroundColor: '#FEFAF0', borderRadius: 14, borderWidth: 1, borderColor: '#D4B896', padding: 16, marginBottom: 20 },
  questionNum:    { fontSize: 11, color: '#B87333', fontWeight: '700', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  questionText:   { fontSize: 16, fontWeight: '600', color: '#2C1A0E', marginBottom: 14, lineHeight: 22 },
  optionBtn:      { borderWidth: 1, borderColor: '#D4B896', borderRadius: 10, padding: 12, marginBottom: 8 },
  optionBtnSelected: { borderColor: '#9C2F45', backgroundColor: '#FFF0F2' },
  optionText:     { fontSize: 14, color: '#5A3A1A' },
  optionTextSelected: { color: '#9C2F45', fontWeight: '600' },
  freeInput:      { borderWidth: 1, borderColor: '#D4B896', borderRadius: 10, padding: 12, fontSize: 14, color: '#2C1A0E' },
  submitBtn:      { backgroundColor: '#9C2F45', borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText:  { color: '#FFF', fontSize: 16, fontWeight: '700' },
  resultBox:      { alignItems: 'center', paddingVertical: 40, gap: 16 },
  resultEmoji:    { fontSize: 56 },
  resultTitle:    { fontSize: 22, fontWeight: '700', color: '#2C1A0E' },
  resultSub:      { fontSize: 14, color: '#7A5C3A', textAlign: 'center', lineHeight: 22 },
  closeBtn:       { backgroundColor: '#5A3A1A', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  closeBtnSuccess:{ backgroundColor: '#9C2F45' },
  closeBtnText:   { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
