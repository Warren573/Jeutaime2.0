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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import type { Letter, Match } from '../shared/types';

const Avatar = ({ name, size = 50 }: { name: string; size?: number }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
};

const FLAP_H = 46;

const EnvelopeCard = ({
  otherName,
  lastMsg,
  unread,
  onOpen,
}: {
  otherName: string;
  lastMsg?: Letter;
  unread: number;
  onOpen: () => void;
}) => {
  const flapScale = useRef(new Animated.Value(1)).current;
  const cardScale = useRef(new Animated.Value(1)).current;
  const [opening, setOpening] = useState(false);

  const handlePress = () => {
    if (opening) return;
    setOpening(true);
    Animated.sequence([
      Animated.parallel([
        Animated.spring(cardScale, { toValue: 1.02, useNativeDriver: true, tension: 300, friction: 10 }),
        Animated.timing(flapScale, { toValue: 0, duration: 380, useNativeDriver: true }),
      ]),
      Animated.delay(180),
    ]).start(() => {
      flapScale.setValue(1);
      cardScale.setValue(1);
      setOpening(false);
      onOpen();
    });
  };

  return (
    <Animated.View style={[envS.wrapper, { transform: [{ scale: cardScale }] }]}>
      <TouchableOpacity activeOpacity={0.88} onPress={handlePress} style={envS.envelope}>

        {/* Flap doré animé */}
        <Animated.View style={[envS.flap, { transform: [{ scaleY: flapScale }] }]}>
          {/* Pointe de rabat (triangle en bas du flap) */}
          <View style={envS.flapTriLeft} />
          <View style={envS.flapTriRight} />
        </Animated.View>

        {/* Timbre (coin haut droit) */}
        <View style={envS.stamp}>
          <Text style={envS.stampEmoji}>💕</Text>
          <Text style={envS.stampLabel}>JeuTaime</Text>
        </View>

        {/* Lignes de pli en V */}
        <View style={envS.foldLeft} />
        <View style={envS.foldRight} />

        {/* Corps de l'enveloppe */}
        <View style={envS.body}>
          <Avatar name={otherName} size={46} />
          <View style={envS.bodyText}>
            <Text style={envS.senderName}>{otherName}</Text>
            <Text style={envS.preview} numberOfLines={1}>
              {lastMsg ? lastMsg.content : 'Nouvelle correspondance...'}
            </Text>
          </View>
          {/* Cachet de cire */}
          <View style={[envS.wax, unread > 0 && envS.waxUnread]}>
            <Text style={envS.waxEmoji}>{unread > 0 ? '💌' : '✉️'}</Text>
            {unread > 0 && (
              <View style={envS.waxBadge}>
                <Text style={envS.waxBadgeText}>{unread}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Lignes d'adresse */}
        <View style={envS.addressArea}>
          <View style={envS.addressLine} />
          <View style={[envS.addressLine, { width: '55%' }]} />
        </View>

      </TouchableOpacity>
    </Animated.View>
  );
};

const envS = StyleSheet.create({
  wrapper: {
    marginHorizontal: 16,
    marginBottom: 16,
    shadowColor: '#8B6F47',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 5,
  },
  envelope: {
    backgroundColor: '#FDF5E6',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#DAA520',
    overflow: 'hidden',
    paddingTop: FLAP_H,
  },
  flap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: FLAP_H,
    backgroundColor: '#C8A030',
  },
  // Triangles qui découpent le bas du rabat en pointe V
  flapTriLeft: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 0,
    height: 0,
    borderLeftWidth: 100,
    borderLeftColor: 'transparent',
    borderBottomWidth: FLAP_H,
    borderBottomColor: '#FDF5E6',
  },
  flapTriRight: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 0,
    height: 0,
    borderRightWidth: 100,
    borderRightColor: 'transparent',
    borderBottomWidth: FLAP_H,
    borderBottomColor: '#FDF5E6',
  },
  stamp: {
    position: 'absolute',
    top: 6,
    right: 10,
    width: 34,
    height: 28,
    backgroundColor: '#FFF',
    borderWidth: 1.5,
    borderColor: '#DAA520',
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stampEmoji: { fontSize: 11 },
  stampLabel: { fontSize: 5, color: '#8B6F47', fontWeight: '700', letterSpacing: 0.2 },
  // Lignes de pli en V (décoratives)
  foldLeft: {
    position: 'absolute',
    top: FLAP_H + 2,
    left: -10,
    width: '55%',
    height: 1.5,
    backgroundColor: '#DAA520',
    opacity: 0.35,
    transform: [{ rotate: '14deg' }],
  },
  foldRight: {
    position: 'absolute',
    top: FLAP_H + 2,
    right: -10,
    width: '55%',
    height: 1.5,
    backgroundColor: '#DAA520',
    opacity: 0.35,
    transform: [{ rotate: '-14deg' }],
  },
  body: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  bodyText: { flex: 1, marginLeft: 12 },
  senderName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  preview: {
    fontSize: 13,
    color: '#8B6F47',
    marginTop: 3,
    fontStyle: 'italic',
  },
  wax: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6B0E0E',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#8B1A1A',
    shadowColor: '#8B0000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  waxUnread: {
    backgroundColor: '#C41E3A',
    borderColor: '#E8274D',
  },
  waxEmoji: { fontSize: 22 },
  waxBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#E91E63',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  waxBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '700' },
  addressArea: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 5,
  },
  addressLine: {
    height: 1,
    backgroundColor: '#DAA520',
    opacity: 0.3,
    width: '78%',
  },
});

// ─── Écran principal ─────────────────────────────────────────────────────────

interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
}

export default function LettersScreen() {
  const insets = useSafeAreaInsets();
  const { matches, letters, addLetter, markLetterRead, currentUser, addPoints } = useStore();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [showConversation, setShowConversation] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'lettres' | 'journal' | 'souvenirs'>('lettres');

  const [journalEntries, setJournalEntries] = useState<JournalEntry[]>([
    { id: '1', date: '2025-03-12', title: 'Premier jour sur JeuTaime', content: "Aujourd'hui j'ai découvert cette application incroyable...", mood: '😊' },
  ]);
  const [showJournalModal, setShowJournalModal] = useState(false);
  const [journalTitle, setJournalTitle] = useState('');
  const [journalContent, setJournalContent] = useState('');
  const [journalMood, setJournalMood] = useState('😊');

  const souvenirs = [
    { id: '1', title: 'Inscription', description: 'Tu as rejoint JeuTaime!', date: '2025-03-12', emoji: '🎉' },
    { id: '2', title: 'Premier Match', description: 'Tu as eu ton premier match!', date: '2025-03-12', emoji: '💕' },
  ];

  const getOtherName = (match: Match) => (match.userAId === 'me' ? match.userBId : match.userAId);

  const getConversation = (match: Match) => {
    const otherId = getOtherName(match);
    return letters
      .filter(l => l.fromUserId === otherId || l.toUserId === otherId)
      .sort((a, b) => a.createdAt - b.createdAt);
  };

  const openConversation = (match: Match) => {
    setSelectedMatch(match);
    setShowConversation(true);
    // Marquer les messages comme lus
    const conv = getConversation(match);
    conv.forEach(l => {
      if (l.toUserId === (currentUser?.id || 'me') && !l.readAt) {
        markLetterRead(l.id);
      }
    });
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedMatch) return;
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

  const formatTime = (ts: number) => {
    const date = new Date(ts);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  const moods = ['😊', '😍', '🥰', '😢', '😤', '🤔', '😴', '🎉'];

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>

      {/* En-tête */}
      <View style={s.header}>
        <Text style={s.headerTitle}>📬 BOÎTE AUX LETTRES</Text>
        <Text style={s.headerSub}>correspondances privées</Text>
      </View>

      {/* Sous-onglets */}
      <View style={s.tabs}>
        {(['lettres', 'journal', 'souvenirs'] as const).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[s.tab, activeTab === tab && s.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[s.tabText, activeTab === tab && s.tabTextActive]}>
              {tab === 'lettres' ? '📬 Lettres' : tab === 'journal' ? '📔 Journal' : '🎁 Souvenirs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* ── LETTRES ── */}
      {activeTab === 'lettres' && (
        matches.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyEmoji}>💌</Text>
            <Text style={s.emptyTitle}>Boîte vide</Text>
            <Text style={s.emptySub}>Réussissez des matchs pour commencer des correspondances!</Text>
          </View>
        ) : (
          <ScrollView style={s.scroll} contentContainerStyle={s.scrollPad}>
            <Text style={s.count}>{matches.length} correspondance{matches.length > 1 ? 's' : ''}</Text>
            {matches.map(match => {
              const otherName = getOtherName(match);
              const conv = getConversation(match);
              const lastMsg = conv[conv.length - 1];
              const unread = conv.filter(l => l.toUserId === (currentUser?.id || 'me') && !l.readAt).length;
              return (
                <EnvelopeCard
                  key={match.id}
                  otherName={otherName}
                  lastMsg={lastMsg}
                  unread={unread}
                  onOpen={() => openConversation(match)}
                />
              );
            })}
          </ScrollView>
        )
      )}

      {/* ── JOURNAL ── */}
      {activeTab === 'journal' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollPad}>
          <TouchableOpacity style={s.addBtn} onPress={() => setShowJournalModal(true)}>
            <Text style={s.addBtnText}>✏️  Nouvelle entrée</Text>
          </TouchableOpacity>
          {journalEntries.map(e => (
            <View key={e.id} style={s.journalCard}>
              <View style={s.journalCardHead}>
                <Text style={s.journalMood}>{e.mood}</Text>
                <Text style={s.journalDate}>{e.date}</Text>
              </View>
              <Text style={s.journalTitle}>{e.title}</Text>
              <Text style={s.journalBody}>{e.content}</Text>
            </View>
          ))}
        </ScrollView>
      )}

      {/* ── SOUVENIRS ── */}
      {activeTab === 'souvenirs' && (
        <ScrollView style={s.scroll} contentContainerStyle={s.scrollPad}>
          {souvenirs.map(sv => (
            <View key={sv.id} style={s.souvenirCard}>
              <Text style={s.souvenirEmoji}>{sv.emoji}</Text>
              <View style={s.souvenirInfo}>
                <Text style={s.souvenirTitle}>{sv.title}</Text>
                <Text style={s.souvenirDesc}>{sv.description}</Text>
                <Text style={s.souvenirDate}>{sv.date}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Bouton magie */}
      <TouchableOpacity style={s.magicBtn}>
        <Text style={s.magicEmoji}>✨</Text>
        <View style={s.magicText}>
          <Text style={s.magicTitle}>Envoyer de la Magie</Text>
          <Text style={s.magicSub}>Envoie des cadeaux magiques!</Text>
        </View>
        <Text style={s.magicArrow}>▶</Text>
      </TouchableOpacity>

      {/* ── MODAL CONVERSATION (style papier à lettre) ── */}
      <Modal visible={showConversation} animationType="slide">
        <KeyboardAvoidingView
          style={[s.letterModal, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          {/* En-tête */}
          <View style={s.letterHead}>
            <TouchableOpacity onPress={() => setShowConversation(false)}>
              <Text style={s.backBtn}>← Retour</Text>
            </TouchableOpacity>
            {selectedMatch && <Avatar name={getOtherName(selectedMatch)} size={34} />}
            <Text style={s.letterHeadName}>
              {selectedMatch ? getOtherName(selectedMatch) : ''}
            </Text>
            <View style={{ flex: 1 }} />
          </View>

          {/* Papier avec lignes */}
          <ScrollView style={s.paper} contentContainerStyle={s.paperPad}>
            {/* Marge rouge (style papier ligné) */}
            <View style={s.margin} />

            {selectedMatch && getConversation(selectedMatch).length === 0 && (
              <View style={s.startConv}>
                <Text style={s.startEmoji}>🪶</Text>
                <Text style={s.startText}>Commencez la correspondance...</Text>
              </View>
            )}

            {selectedMatch && getConversation(selectedMatch).map(letter => {
              const isOwn = letter.fromUserId === (currentUser?.id || 'me');
              return (
                <View key={letter.id} style={[s.msgRow, isOwn && s.msgRowOwn]}>
                  <View style={[s.msgPaper, isOwn && s.msgPaperOwn]}>
                    <Text style={[s.msgText, isOwn && s.msgTextOwn]}>{letter.content}</Text>
                    <Text style={s.msgTime}>{formatTime(letter.createdAt)}</Text>
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Zone d'écriture */}
          <View style={[s.writeArea, { paddingBottom: Math.max(insets.bottom, 10) }]}>
            <Text style={s.quill}>🪶</Text>
            <TextInput
              style={s.writeInput}
              placeholder="Écrire votre lettre..."
              placeholderTextColor="#B8A090"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
            />
            <TouchableOpacity style={s.sendBtn} onPress={handleSend}>
              <Text style={s.sendBtnText}>📮</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── MODAL JOURNAL ── */}
      <Modal visible={showJournalModal} animationType="slide" transparent>
        <View style={s.journalModalBg}>
          <KeyboardAvoidingView
            style={s.journalModalBox}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={s.journalModalHead}>
              <Text style={s.journalModalTitle}>📔 Nouvelle entrée</Text>
              <TouchableOpacity onPress={() => setShowJournalModal(false)}>
                <Text style={s.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={s.moodPicker}>
              <Text style={s.moodLabel}>Humeur :</Text>
              <View style={s.moodRow}>
                {moods.map(m => (
                  <TouchableOpacity
                    key={m}
                    style={[s.moodBtn, journalMood === m && s.moodBtnActive]}
                    onPress={() => setJournalMood(m)}
                  >
                    <Text style={s.moodBtnText}>{m}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={s.journalInput}
              placeholder="Titre..."
              placeholderTextColor="#8B6F47"
              value={journalTitle}
              onChangeText={setJournalTitle}
            />
            <TextInput
              style={[s.journalInput, s.journalTextarea]}
              placeholder="Qu'as-tu envie de raconter?"
              placeholderTextColor="#8B6F47"
              value={journalContent}
              onChangeText={setJournalContent}
              multiline
              numberOfLines={5}
            />
            <TouchableOpacity
              style={s.saveBtn}
              onPress={() => {
                if (!journalTitle.trim() || !journalContent.trim()) return;
                setJournalEntries(prev => [{
                  id: Date.now().toString(),
                  date: new Date().toISOString().split('T')[0],
                  title: journalTitle.trim(),
                  content: journalContent.trim(),
                  mood: journalMood,
                }, ...prev]);
                addPoints(5);
                setJournalTitle('');
                setJournalContent('');
                setShowJournalModal(false);
              }}
            >
              <Text style={s.saveBtnText}>💾 Sauvegarder</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },

  header: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#E8D5B7',
    alignItems: 'center',
  },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#3A2818', letterSpacing: 1 },
  headerSub: { fontSize: 12, color: '#8B6F47', marginTop: 2, fontStyle: 'italic' },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, marginHorizontal: 3 },
  tabActive: { backgroundColor: '#8B6F47' },
  tabText: { fontSize: 11, fontWeight: '600', color: '#8B6F47' },
  tabTextActive: { color: '#FFF' },

  scroll: { flex: 1 },
  scrollPad: { paddingTop: 16, paddingBottom: 160 },
  count: { fontSize: 12, color: '#8B6F47', textAlign: 'center', marginBottom: 12, fontStyle: 'italic' },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: '700', color: '#3A2818', marginBottom: 8 },
  emptySub: { fontSize: 14, color: '#8B6F47', textAlign: 'center', lineHeight: 20 },

  magicBtn: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
    backgroundColor: '#DAA520',
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  magicEmoji: { fontSize: 26, marginRight: 12 },
  magicText: { flex: 1 },
  magicTitle: { fontSize: 15, fontWeight: '700', color: '#FFF' },
  magicSub: { fontSize: 11, color: 'rgba(255,255,255,0.85)', marginTop: 1 },
  magicArrow: { fontSize: 16, color: '#FFF' },

  addBtn: {
    marginHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  addBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  journalCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#DAA520',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  journalCardHead: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  journalMood: { fontSize: 22 },
  journalDate: { fontSize: 12, color: '#8B6F47' },
  journalTitle: { fontSize: 15, fontWeight: '700', color: '#3A2818', marginBottom: 4 },
  journalBody: { fontSize: 13, color: '#5D4037', lineHeight: 19 },

  souvenirCard: {
    marginHorizontal: 16,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  souvenirEmoji: { fontSize: 38, marginRight: 14 },
  souvenirInfo: { flex: 1 },
  souvenirTitle: { fontSize: 15, fontWeight: '700', color: '#3A2818' },
  souvenirDesc: { fontSize: 13, color: '#5D4037', marginTop: 2 },
  souvenirDate: { fontSize: 11, color: '#8B6F47', marginTop: 4 },

  // Modal conversation (papier à lettre)
  letterModal: { flex: 1, backgroundColor: '#FFFEF0' },
  letterHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E8D5B7',
    gap: 10,
  },
  backBtn: { fontSize: 15, color: '#8B6F47' },
  letterHeadName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#3A2818',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },

  paper: { flex: 1 },
  paperPad: { paddingLeft: 62, paddingRight: 16, paddingTop: 16, paddingBottom: 80 },
  margin: {
    position: 'absolute',
    left: 50,
    top: 0,
    bottom: 0,
    width: 1.5,
    backgroundColor: '#FFABAB',
    opacity: 0.55,
  },

  startConv: { alignItems: 'center', paddingVertical: 40 },
  startEmoji: { fontSize: 40, marginBottom: 10 },
  startText: { fontSize: 15, color: '#8B6F47', fontStyle: 'italic' },

  msgRow: { marginBottom: 16, alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  msgPaper: {
    backgroundColor: '#FFF',
    borderRadius: 4,
    borderTopRightRadius: 14,
    padding: 14,
    maxWidth: '78%',
    borderWidth: 1,
    borderColor: '#E8D5B7',
    shadowColor: '#8B6F47',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  msgPaperOwn: {
    backgroundColor: '#FFF8E7',
    borderColor: '#DAA520',
    borderTopRightRadius: 4,
    borderTopLeftRadius: 14,
  },
  msgText: {
    fontSize: 15,
    color: '#3A2818',
    lineHeight: 23,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  msgTextOwn: { color: '#5D3A1A' },
  msgTime: { fontSize: 10, color: '#B8A090', marginTop: 8, alignSelf: 'flex-end' },

  writeArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 12,
    paddingTop: 10,
    backgroundColor: '#FFFEF0',
    borderTopWidth: 1.5,
    borderTopColor: '#E8D5B7',
    gap: 8,
  },
  quill: { fontSize: 22, marginBottom: 8 },
  writeInput: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: '#DAA520',
    maxHeight: 100,
    color: '#3A2818',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  sendBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#DAA520',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DAA520',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 3,
  },
  sendBtnText: { fontSize: 22 },

  // Modal journal
  journalModalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  journalModalBox: {
    backgroundColor: '#FFF8E7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  journalModalHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  journalModalTitle: { fontSize: 19, fontWeight: '700', color: '#3A2818' },
  closeX: { fontSize: 22, color: '#8B6F47' },
  moodPicker: { marginBottom: 14 },
  moodLabel: { fontSize: 13, color: '#5D4037', marginBottom: 8 },
  moodRow: { flexDirection: 'row', justifyContent: 'space-between' },
  moodBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  moodBtnActive: { borderColor: '#E91E63', backgroundColor: '#FFE4EC' },
  moodBtnText: { fontSize: 22 },
  journalInput: {
    backgroundColor: '#FFF',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E8D5B7',
  },
  journalTextarea: { height: 110, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#4CAF50', borderRadius: 12, padding: 15, alignItems: 'center' },
  saveBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
