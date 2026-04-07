import React, { useState, useRef, useEffect } from 'react';
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
import { PremiumLetterAnimation } from '../components/PremiumLetterAnimation';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';

const { width: SCREEN_W } = Dimensions.get('window');
const CARD_W = SCREEN_W - 32;
const MINI_FLAP_H = 54;
const LARGE_FLAP_H = 92;


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
  return (
    <>
      {/* ── Carte dans la liste ── */}
      <TouchableOpacity style={envStyles.card} onPress={onOpen} activeOpacity={0.82}>
        {/* Zone rabat */}
        <View style={envStyles.flapMini}>
          <View style={envStyles.foldLinesWrap}>
            <View style={[envStyles.foldLine, envStyles.foldLineLL]} />
            <View style={[envStyles.foldLine, envStyles.foldLineLR]} />
          </View>
          {unread > 0
            ? <View style={envStyles.sealMini}><Text style={envStyles.sealEmoji}>⚜️</Text></View>
            : <Text style={envStyles.sealEmpty}>✉️</Text>
          }
        </View>
        <View style={envStyles.divider} />
        {/* Infos */}
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

    </>
  );
};

// ─── Styles enveloppe ─────────────────────────────────────────────────────────

const envStyles = StyleSheet.create({
  // Carte liste
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
  preview: { fontSize: 13, color: '#7A5C3A', marginTop: 2 },
  time: { fontSize: 11, color: '#9A7040' },

  // Overlay d'ouverture
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

  // Rabat animé
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

  // Particules
  particle: {
    position: 'absolute',
    fontSize: 22,
    bottom: '45%',
  },
});

// ─── LetterCard — carte lettre avec animation si nouvelle ─────────────────────

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

  // Animation enveloppe — overlay plein écran à l'ouverture d'une nouvelle lettre
  const [envAnimVisible, setEnvAnimVisible] = useState(false);
  const [envAnimSender, setEnvAnimSender] = useState('');

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
    { id: '2', type: 'match', title: 'Premier Match', description: 'Tu as eu ton premier match!', date: '2025-03-12', emoji: '🌟' },
  ]);

  const getOtherUserName = (match: Match) =>
    match.userAId === 'me' ? match.userBId : match.userAId;

  const getConversation = (match: Match) => {
    const otherId = getOtherUserName(match);
    return letters
      .filter(l => l.fromUserId === otherId || l.toUserId === otherId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  // Tour par tour : c'est mon tour si aucune lettre n'a été échangée,
  // ou si la dernière lettre reçue vient de l'autre personne.
  const isMyTurn = (match: Match): boolean => {
    const myId = currentUser?.id || 'me';
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
      fromUserId: currentUser?.id || 'me',
      toUserId: selectedMatch.userBId === 'me' ? selectedMatch.userAId : selectedMatch.userBId,
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
                <Text style={styles.emptySubtext}>Réussissez des matchs pour recevoir vos premières enveloppes!</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.listCount}>{matches.length} enveloppe{matches.length > 1 ? 's' : ''}</Text>
                {matches.map((match) => {
                  const otherName = getOtherUserName(match);
                  const conv      = getConversation(match);
                  const lastMsg   = conv[conv.length - 1];
                  const unread    = conv.filter(l => l.toUserId === (currentUser?.id || 'me') && !l.readAt).length;
                  return (
                    <EnvelopeCard
                      key={match.id}
                      otherName={otherName}
                      lastMsg={lastMsg}
                      unread={unread}
                      myTurn={isMyTurn(match)}
                      onOpen={() => {
                        const conv = getConversation(match);
                        const unread = conv.filter(
                          l => (l.toUserId === (currentUser?.id || 'me')) && !l.readAt
                        );
                        setSelectedMatch(match);
                        setShowCompose(true);
                        if (unread.length > 0) {
                          setEnvAnimSender(getOtherUserName(match));
                          setEnvAnimVisible(true);
                          setTimeout(() => {
                            setEnvAnimVisible(false);
                            unread.forEach(l => markLetterRead(l.id));
                          }, 1700);
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
        <Text style={styles.headerKicker}>JEUTAIME</Text>
        <Text style={styles.headerTitle}>Boîte aux lettres</Text>
        <Text style={styles.headerSubtitle}>Correspondances privées</Text>
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


      {/* Modal conversation */}
      <Modal visible={showCompose} animationType="slide">
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCompose(false)}>
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
            {selectedMatch && getConversation(selectedMatch).map((letter) => {
              const isOwn     = letter.fromUserId === currentUser?.id || letter.fromUserId === 'me';
              const otherName = getOtherUserName(selectedMatch);
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
              <View style={styles.startConv}>
                <Text style={styles.startEmoji}>✨</Text>
                <Text style={styles.startText}>Commencez la conversation!</Text>
              </View>
            )}
          </ScrollView>

          <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
            <TextInput
              style={styles.input}
              placeholder="Écrivez votre lettre..."
              placeholderTextColor="#8B6F47"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
              <Text style={styles.sendBtnText}>➤</Text>
            </TouchableOpacity>
          </View>
          {/* Overlay animation enveloppe — centré, couvre toute la conversation */}
          {envAnimVisible && (
            <View style={styles.envAnimOverlay}>
              <PremiumLetterAnimation senderName={envAnimSender} />
            </View>
          )}
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
  container: { flex: 1, backgroundColor: '#F4ECD8' },
  header: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 0, backgroundColor: '#2C1A0E' },
  headerKicker: { fontSize: 10, letterSpacing: 3, color: '#B87333', fontWeight: '700', marginBottom: 4 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#F0D98C' },
  headerSubtitle: { fontSize: 12, color: '#A08870', marginTop: 4, fontStyle: 'italic' },

  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#C4A882', backgroundColor: '#2C1A0E' },
  tab: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 10, marginHorizontal: 3 },
  tabActive: { backgroundColor: '#8B2E3C' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#A08870' },
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
  duelBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEFAF0', borderRadius: 16, padding: 16, marginHorizontal: 16, marginTop: 12, marginBottom: 4, borderWidth: 1.5, borderColor: '#B8956A', shadowColor: '#5A3A1A', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.18, shadowRadius: 8, elevation: 4 },
  duelBtnEmoji: { fontSize: 26, marginRight: 12 },
  duelBtnTextWrap: { flex: 1, minWidth: 0 },
  duelBtnTitle: { color: '#2C1A0E', fontSize: 16, fontWeight: '800' },
  duelBtnSubtitle: { color: '#9A7040', fontSize: 12, marginTop: 3 },
  duelBtnArrow: { fontSize: 14, color: '#7A1A1A', marginLeft: 8 },

  journalSectionTitle: { fontSize: 13, fontWeight: '700', color: '#8B6F47', marginBottom: 8, marginTop: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  duelJournalCard: { borderLeftColor: '#B47CFF' },


  // Overlay animation enveloppe
  envAnimOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: '#F4ECD8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 50,
  },

  // Modal conversation
  modalContainer: { flex: 1, backgroundColor: '#F4ECD8' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#C4A882', backgroundColor: '#2C1A0E' },
  closeText: { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#F0D98C', letterSpacing: 0.3 },
  messagesContainer: { flex: 1, paddingHorizontal: 16, paddingTop: 20 },

  // (letter cards → voir lcStyles)

  startConv: { alignItems: 'center', paddingVertical: 60 },
  startEmoji: { fontSize: 50, marginBottom: 12 },
  startText: { fontSize: 16, color: '#9A7040' },
  inputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#2C1A0E', borderTopWidth: 1, borderTopColor: '#5A3A1A', gap: 8 },
  input: { flex: 1, backgroundColor: '#FEFAF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, fontSize: 15, borderWidth: 1.5, borderColor: '#B8956A', maxHeight: 100, color: '#2C1A0E' },
  sendBtn: { width: 46, height: 46, borderRadius: 12, backgroundColor: '#8B2E3C', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#FFF' },

  // Tour par tour
  turnBanner: { paddingHorizontal: 16, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#5A3A1A' },
  turnBannerMine: { backgroundColor: '#1A2E1A' },
  turnBannerWait: { backgroundColor: '#2A1A0A' },
  turnBannerText: { fontSize: 13, fontWeight: '600', color: '#C4A882' },

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
});
