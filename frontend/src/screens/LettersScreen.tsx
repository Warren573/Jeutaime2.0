import React, { useState, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import type { Letter, Match } from '../shared/types';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const MINI_FLAP_H = 54;
const LARGE_FLAP_H = 92;

// ─── Avatar ──────────────────────────────────────────────────────────────────

const Avatar = ({ name, size = 55 }: { name: string; size?: number }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={[avatarStyles.container, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[avatarStyles.text, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

const avatarStyles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  text: { color: '#FFF', fontWeight: '700' },
});

// ─── EnvelopeCard ─────────────────────────────────────────────────────────────

interface EnvelopeCardProps {
  otherName: string;
  lastMsg?: Letter;
  unread: number;
  myTurn: boolean;
  onOpen: () => void;
  formatTime: (ts: number) => string;
}

const EnvelopeCard = ({ otherName, lastMsg, unread, myTurn, onOpen, formatTime }: EnvelopeCardProps) => {
  const [opening, setOpening] = useState(false);
  const flapY  = useRef(new Animated.Value(0)).current;
  const flapOp = useRef(new Animated.Value(1)).current;
  const bgOp   = useRef(new Animated.Value(0)).current;

  const handlePress = () => {
    setOpening(true);
    Animated.sequence([
      Animated.timing(bgOp, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.parallel([
        Animated.timing(flapY,  { toValue: -(LARGE_FLAP_H + 60), duration: 520, useNativeDriver: true }),
        Animated.timing(flapOp, { toValue: 0,                     duration: 400, useNativeDriver: true }),
      ]),
    ]).start(() => {
      setTimeout(() => {
        setOpening(false);
        flapY.setValue(0);
        flapOp.setValue(1);
        bgOp.setValue(0);
        onOpen();
      }, 120);
    });
  };

  return (
    <>
      {/* ── Carte dans la liste ── */}
      <TouchableOpacity style={envStyles.card} onPress={handlePress} activeOpacity={0.85}>
        {/* Zone rabat */}
        <View style={envStyles.flapMini}>
          <View style={envStyles.foldLinesWrap}>
            <View style={[envStyles.foldLine, envStyles.foldLineLL]} />
            <View style={[envStyles.foldLine, envStyles.foldLineLR]} />
          </View>
          {unread > 0
            ? <View style={envStyles.sealMini}><Text style={envStyles.sealEmoji}>💌</Text></View>
            : <Text style={envStyles.sealEmpty}>✉️</Text>
          }
        </View>
        <View style={envStyles.divider} />
        {/* Infos */}
        <View style={envStyles.infoRow}>
          <Avatar name={otherName} size={42} />
          <View style={envStyles.texts}>
            <View style={envStyles.nameRow}>
              <Text style={envStyles.name}>{otherName}</Text>
              {unread > 0 && (
                <View style={envStyles.badge}>
                  <Text style={envStyles.badgeTxt}>{unread}</Text>
                </View>
              )}
            </View>
            <Text style={envStyles.preview} numberOfLines={1}>
              {!lastMsg
                ? '✨ Envoyez la première lettre!'
                : myTurn
                  ? (unread > 0 ? '📨 Nouvelle lettre reçue!' : '✍️ À vous d\'écrire...')
                  : '⏳ En attente de réponse...'}
            </Text>
          </View>
          <Text style={envStyles.time}>
            {!lastMsg ? 'Nouveau' : myTurn ? (unread > 0 ? 'Non lu' : formatTime(lastMsg.createdAt)) : 'Envoyé'}
          </Text>
        </View>
      </TouchableOpacity>

      {/* ── Overlay d'ouverture ── */}
      <Modal visible={opening} transparent animationType="none">
        <Animated.View style={[envStyles.overlay, { opacity: bgOp }]}>
          {/* Enveloppe agrandie */}
          <View style={envStyles.largeWrapper}>
            {/* Corps révélé sous le rabat */}
            <View style={envStyles.largeBody}>
              <View style={envStyles.largeContent}>
                <Avatar name={otherName} size={68} />
                <Text style={envStyles.largeName}>{otherName}</Text>
                <Text style={envStyles.largePreview} numberOfLines={3}>
                  {lastMsg ? lastMsg.content : '✨ Commencez la conversation!'}
                </Text>
                <Text style={envStyles.largeTap}>Ouverture…</Text>
              </View>
            </View>

            {/* Rabat animé (se lève vers le haut) */}
            <Animated.View
              style={[
                envStyles.largeFlap,
                { transform: [{ translateY: flapY }], opacity: flapOp },
              ]}
            >
              <View style={envStyles.foldLinesWrap}>
                <View style={[envStyles.foldLine, envStyles.foldLineLLLarge]} />
                <View style={[envStyles.foldLine, envStyles.foldLineLRLarge]} />
              </View>
              <View style={envStyles.sealLarge}>
                <Text style={envStyles.sealLargeEmoji}>💌</Text>
              </View>
            </Animated.View>
          </View>
        </Animated.View>
      </Modal>
    </>
  );
};

// ─── Styles enveloppe ─────────────────────────────────────────────────────────

const envStyles = StyleSheet.create({
  // Carte liste
  card: {
    backgroundColor: '#FDF5E6',
    borderRadius: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#C8A96E',
    shadowColor: '#8B6F47',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 4,
    overflow: 'hidden',
  },
  flapMini: {
    height: MINI_FLAP_H,
    backgroundColor: '#EEC97A',
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
    backgroundColor: '#A07030',
    opacity: 0.45,
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
    backgroundColor: '#8B1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 4,
  },
  sealEmoji: { fontSize: 20 },
  sealEmpty: { fontSize: 20, opacity: 0.4 },
  divider: { height: 1.5, backgroundColor: '#C8A96E' },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  texts: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  badge: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#E91E63',
    alignItems: 'center', justifyContent: 'center',
  },
  badgeTxt: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  preview: { fontSize: 13, color: '#8B6F47', marginTop: 2 },
  time: { fontSize: 11, color: '#B8860B' },

  // Overlay d'ouverture
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 3, 0.80)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  largeWrapper: {
    width: SCREEN_W - 32,
  },
  largeBody: {
    backgroundColor: '#FDF5E6',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#C8A96E',
    paddingTop: LARGE_FLAP_H + 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  largeContent: {
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  largeName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3A2818',
    marginTop: 4,
  },
  largePreview: {
    fontSize: 15,
    color: '#5D4037',
    textAlign: 'center',
    lineHeight: 22,
    fontStyle: 'italic',
    paddingHorizontal: 8,
  },
  largeTap: {
    fontSize: 12,
    color: '#B8860B',
    marginTop: 8,
    letterSpacing: 1,
  },

  // Rabat animé
  largeFlap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: LARGE_FLAP_H + 4,
    backgroundColor: '#EEC97A',
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderWidth: 2,
    borderColor: '#C8A96E',
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
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#7B1515',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  sealLargeEmoji: { fontSize: 30 },
});

// ─── Types internes ───────────────────────────────────────────────────────────

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

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function LettersScreen() {
  const insets  = useSafeAreaInsets();
  const router  = useRouter();
  const { matches, letters, addLetter, markLetterRead, currentUser, addPoints, duelEntries } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['letters'] ?? '#FFF8E7');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('lettres');

  // Journal state
  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    { id: '1', date: '2025-03-12', title: 'Premier jour sur JeuTaime', content: 'Aujourd\'hui j\'ai découvert cette application incroyable...', mood: '😊' },
  ]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('😊');

  // Souvenirs state
  const [souvenirs] = useState<Souvenir[]>([
    { id: '1', type: 'milestone', title: 'Inscription', description: 'Tu as rejoint JeuTaime!', date: '2025-03-12', emoji: '🎉' },
    { id: '2', type: 'match', title: 'Premier Match', description: 'Tu as eu ton premier match!', date: '2025-03-12', emoji: '💕' },
  ]);

  const myId = currentUser?.id || 'me';

  const getOtherUserName = (match: Match) =>
    match.userAId === myId ? match.userBId : match.userAId;

  const getConversation = (match: Match) => {
    const otherId = getOtherUserName(match);
    return letters
      .filter(l => l.fromUserId === otherId || l.toUserId === otherId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  // Tour par tour : c'est mon tour si aucune lettre n'a été échangée,
  // ou si la dernière lettre reçue vient de l'autre personne.
  const isMyTurn = (match: Match): boolean => {
    const conv = getConversation(match);
    if (conv.length === 0) return true;
    return conv[conv.length - 1].fromUserId !== myId;
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedMatch) return;
    if (!isMyTurn(selectedMatch)) return; // bloqué si pas mon tour
    const letter: Letter = {
      id: Date.now().toString(),
      threadId: selectedMatch.id,
      fromUserId: myId,
      toUserId: selectedMatch.userBId === myId ? selectedMatch.userAId : selectedMatch.userBId,
      content: newMessage.trim(),
      createdAt: Date.now(),
    };
    addLetter(letter);
    setNewMessage('');
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
    const now  = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7)  return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const moods = ['😊', '😍', '🥰', '😢', '😤', '🤔', '😴', '🎉'];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'lettres':
        return (
          <>
            {/* Bouton duel */}
            <TouchableOpacity style={styles.duelBtn} onPress={() => router.push('/duel/create')}>
              <Text style={styles.duelBtnEmoji}>🎮</Text>
              <View style={styles.duelBtnTextWrap}>
                <Text style={styles.duelBtnTitle}>Lancer un duel</Text>
                <Text style={styles.duelBtnSubtitle}>Défiez un contact en Pierre • Papier • Ciseaux</Text>
              </View>
              <Text style={styles.duelBtnArrow}>▶</Text>
            </TouchableOpacity>

            {matches.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💌</Text>
                <Text style={styles.emptyText}>Aucune lettre</Text>
                <Text style={styles.emptySubtext}>Réussissez des matchs pour recevoir vos premières enveloppes!</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.listCount}>{matches.length} enveloppe{matches.length > 1 ? 's' : ''}</Text>
                {matches.map((match) => {
                  const otherName = getOtherUserName(match);
                  const conv      = getConversation(match);
                  const lastMsg   = conv[conv.length - 1];
                  const unread    = conv.filter(l => l.toUserId === myId && !l.readAt).length;
                  return (
                    <EnvelopeCard
                      key={match.id}
                      otherName={otherName}
                      lastMsg={lastMsg}
                      unread={unread}
                      myTurn={isMyTurn(match)}
                      onOpen={() => { setSelectedMatch(match); setShowCompose(true); }}
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
                      <Text style={styles.journalMood}>🎮</Text>
                      <Text style={styles.journalDate}>{new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</Text>
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
                <Text style={styles.emptyJournalSubtext}>Écris tes pensées et garde un souvenir de ton aventure</Text>
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
        <Text style={styles.headerTitle}>📬 BOÎTE AUX LETTRES</Text>
        <Text style={styles.headerSubtitle}>Vos lettres et correspondances privées</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'lettres' && styles.tabActive]}
          onPress={() => setActiveTab('lettres')}
        >
          <Text style={[styles.tabText, activeTab === 'lettres' && styles.tabTextActive]}>📬 Lettres</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'journal' && styles.tabActive]}
          onPress={() => setActiveTab('journal')}
        >
          <Text style={[styles.tabText, activeTab === 'journal' && styles.tabTextActive]}>📔 Journal</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'souvenirs' && styles.tabActive]}
          onPress={() => setActiveTab('souvenirs')}
        >
          <Text style={[styles.tabText, activeTab === 'souvenirs' && styles.tabTextActive]}>🎁 Souvenirs</Text>
        </TouchableOpacity>
      </View>

      {renderTabContent()}

      {/* Magic button */}
      <TouchableOpacity style={styles.magicBtn}>
        <Text style={styles.magicBtnEmoji}>✨</Text>
        <Text style={styles.magicBtnText}>Envoyer de la Magie</Text>
        <Text style={styles.magicBtnSubtext}>Envoie des cadeaux magiques!</Text>
        <Text style={styles.magicArrow}>▶</Text>
      </TouchableOpacity>

      {/* Modal conversation — tour par tour */}
      <Modal visible={showCompose} animationType="slide">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => { setShowCompose(false); setNewMessage(''); }}>
              <Text style={styles.closeText}>← Retour</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>{selectedMatch ? getOtherUserName(selectedMatch) : ''}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* Bandeau de statut tour */}
          {selectedMatch && (
            <View style={[
              styles.turnBanner,
              isMyTurn(selectedMatch) ? styles.turnBannerMine : styles.turnBannerWait,
            ]}>
              <Text style={styles.turnBannerText}>
                {getConversation(selectedMatch).length === 0
                  ? '🪶  Écrivez la première lettre'
                  : isMyTurn(selectedMatch)
                    ? '📬  C\'est votre tour — répondez à la lettre reçue'
                    : '⏳  Lettre envoyée — en attente de réponse'}
              </Text>
            </View>
          )}

          <ScrollView style={styles.messagesContainer}>
            {selectedMatch && getConversation(selectedMatch).map((letter, idx, arr) => {
              const isOwn = letter.fromUserId === myId;
              const isLast = idx === arr.length - 1;
              return (
                <View key={letter.id} style={[styles.letterRow, isOwn && styles.letterRowOwn]}>
                  <Text style={[styles.letterLabel, isOwn && styles.letterLabelOwn]}>
                    {isOwn ? 'Ma lettre' : `Lettre de ${getOtherUserName(selectedMatch!)}`}  ·  {formatTime(letter.createdAt)}
                  </Text>
                  <View style={[styles.letterBubble, isOwn && styles.letterBubbleOwn]}>
                    <Text style={[styles.letterText, isOwn && styles.letterTextOwn]}>{letter.content}</Text>
                    {isLast && isOwn && !isMyTurn(selectedMatch!) && (
                      <Text style={styles.letterSentStamp}>⏳ En attente de réponse</Text>
                    )}
                  </View>
                </View>
              );
            })}
            {selectedMatch && getConversation(selectedMatch).length === 0 && (
              <View style={styles.startConv}>
                <Text style={styles.startEmoji}>🪶</Text>
                <Text style={styles.startText}>Commencez la correspondance!</Text>
              </View>
            )}
          </ScrollView>

          {/* Zone d'écriture — seulement si c'est mon tour */}
          {selectedMatch && isMyTurn(selectedMatch) ? (
            <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TextInput
                style={styles.input}
                placeholder={
                  getConversation(selectedMatch).length === 0
                    ? 'Écrivez votre première lettre...'
                    : 'Répondez à sa lettre...'
                }
                placeholderTextColor="#8B6F47"
                value={newMessage}
                onChangeText={setNewMessage}
                multiline
              />
              <TouchableOpacity
                style={[styles.sendBtn, !newMessage.trim() && { opacity: 0.4 }]}
                onPress={handleSend}
                disabled={!newMessage.trim()}
              >
                <Text style={styles.sendBtnText}>➤</Text>
              </TouchableOpacity>
            </View>
          ) : selectedMatch ? (
            <View style={[styles.waitingBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <Text style={styles.waitingBarText}>
                ⏳  Vous pourrez écrire dès que {getOtherUserName(selectedMatch)} vous répond
              </Text>
            </View>
          ) : null}
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal Journal */}
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

// ─── Styles écran ─────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 2, borderBottomColor: '#E8D5B7', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 13, color: '#8B6F47', marginTop: 4, fontStyle: 'italic' },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginHorizontal: 4 },
  tabActive: { backgroundColor: '#8B6F47' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#8B6F47' },
  tabTextActive: { color: '#FFF' },

  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 160 },
  listCount: { fontSize: 12, color: '#8B6F47', marginBottom: 12, textAlign: 'center' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: { fontSize: 14, color: '#8B6F47', marginTop: 8, textAlign: 'center', paddingHorizontal: 32 },

  // Journal
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#4CAF50', borderRadius: 12, padding: 14, marginBottom: 16 },
  addBtnEmoji: { fontSize: 20, marginRight: 8 },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  emptyJournal: { alignItems: 'center', paddingVertical: 40 },
  emptyJournalEmoji: { fontSize: 50, marginBottom: 12 },
  emptyJournalText: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  emptyJournalSubtext: { fontSize: 14, color: '#8B6F47', marginTop: 6, textAlign: 'center' },
  journalCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12, borderLeftWidth: 4, borderLeftColor: '#DAA520' },
  journalHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  journalMood: { fontSize: 24 },
  journalDate: { fontSize: 12, color: '#8B6F47' },
  journalTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818', marginBottom: 6 },
  journalContent: { fontSize: 14, color: '#5D4037', lineHeight: 20 },

  // Souvenirs
  souvenirCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginBottom: 12 },
  souvenirEmoji: { fontSize: 40, marginRight: 14 },
  souvenirInfo: { flex: 1 },
  souvenirTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  souvenirDesc: { fontSize: 13, color: '#5D4037', marginTop: 2 },
  souvenirDate: { fontSize: 11, color: '#8B6F47', marginTop: 4 },

  // Duel button
  duelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1A1B2E', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1, borderColor: 'rgba(180,124,255,0.3)' },
  duelBtnEmoji: { fontSize: 26, marginRight: 12 },
  duelBtnTextWrap: { flex: 1, minWidth: 0 },
  duelBtnTitle: { color: '#F8F6FF', fontSize: 16, fontWeight: '800' },
  duelBtnSubtitle: { color: 'rgba(255,255,255,0.55)', fontSize: 12, marginTop: 3 },
  duelBtnArrow: { fontSize: 14, color: '#B47CFF', marginLeft: 8 },

  journalSectionTitle: { fontSize: 13, fontWeight: '700', color: '#8B6F47', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  duelJournalCard: { borderLeftColor: '#B47CFF' },

  // Magic button
  magicBtn: { position: 'absolute', bottom: 100, left: 16, right: 16, backgroundColor: '#DAA520', borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center' },
  magicBtnEmoji: { fontSize: 24, marginRight: 12 },
  magicBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
  magicBtnSubtext: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginLeft: 8, flex: 1 },
  magicArrow: { fontSize: 16, color: '#FFF' },

  // Modal conversation
  modalContainer: { flex: 1, backgroundColor: '#FFF8E7' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  closeText: { fontSize: 16, color: '#8B6F47' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  messagesContainer: { flex: 1, padding: 16 },
  letterRow: { marginBottom: 12, alignItems: 'flex-start' },
  letterRowOwn: { alignItems: 'flex-end' },
  letterBubble: { backgroundColor: '#FFF', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, maxWidth: '80%', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  letterBubbleOwn: { backgroundColor: '#E91E63' },
  letterText: { fontSize: 15, color: '#3A2818', lineHeight: 22 },
  letterTextOwn: { color: '#FFF' },
  letterTime: { fontSize: 10, color: '#8B6F47', marginTop: 6, alignSelf: 'flex-end' },
  startConv: { alignItems: 'center', paddingVertical: 60 },
  startEmoji: { fontSize: 50, marginBottom: 12 },
  startText: { fontSize: 16, color: '#8B6F47' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5B7', gap: 8 },
  input: { flex: 1, backgroundColor: '#FFF8E7', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, borderWidth: 1, borderColor: '#E8D5B7', maxHeight: 100 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E91E63', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#FFF' },

  // Journal Modal
  journalModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  journalModalBox: { backgroundColor: '#FFF8E7', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '80%' },
  journalModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  journalModalTitle: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  closeX: { fontSize: 24, color: '#8B6F47' },
  moodSelector: { marginBottom: 16 },
  moodLabel: { fontSize: 14, color: '#5D4037', marginBottom: 10 },
  moodsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent' },
  moodBtnActive: { borderColor: '#E91E63', backgroundColor: '#FFE4EC' },
  moodBtnText: { fontSize: 24 },
  journalInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12, borderWidth: 1, borderColor: '#E8D5B7' },
  journalTextarea: { height: 120, textAlignVertical: 'top' },
  saveJournalBtn: { backgroundColor: '#4CAF50', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 8 },
  saveJournalText: { color: '#FFF', fontWeight: '700', fontSize: 16 },

  // Tour par tour
  turnBanner: { paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  turnBannerMine: { backgroundColor: '#E8F5E9' },
  turnBannerWait: { backgroundColor: '#FFF8E1' },
  turnBannerText: { fontSize: 13, fontWeight: '600', color: '#5D4037' },
  letterLabel: { fontSize: 10, color: '#8B6F47', fontStyle: 'italic', marginBottom: 3, marginLeft: 2 },
  letterLabelOwn: { textAlign: 'right', marginRight: 2, marginLeft: 0 },
  letterSentStamp: { fontSize: 11, color: '#B8860B', marginTop: 8, fontStyle: 'italic', textAlign: 'right' },
  waitingBar: { paddingHorizontal: 20, paddingTop: 14, backgroundColor: '#FFF8E1', borderTopWidth: 1.5, borderTopColor: '#E8D5B7', alignItems: 'center' },
  waitingBarText: { fontSize: 13, color: '#8B6F47', fontStyle: 'italic', textAlign: 'center', lineHeight: 20 },
});
