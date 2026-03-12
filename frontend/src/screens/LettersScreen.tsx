import React, { useState } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import type { Letter, Match } from '../shared/types';

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

type TabType = 'lettres' | 'journal' | 'souvenirs';

// Journal entries mock data
interface JournalEntry {
  id: string;
  date: string;
  title: string;
  content: string;
  mood: string;
}

// Souvenirs mock data
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
  const { matches, letters, addLetter, markLetterRead, currentUser, addPoints } = useStore();
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

  const getConversation = (matchId: string) => {
    return letters.filter(l => l.fromUserId === matchId || l.toUserId === matchId).sort((a, b) => a.createdAt - b.createdAt);
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
    
    if (diffDays === 0) return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
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
            {matches.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>💌</Text>
                <Text style={styles.emptyText}>Aucune conversation</Text>
                <Text style={styles.emptySubtext}>Envoyez des sourires et réussissez des matchs pour commencer des conversations!</Text>
              </View>
            ) : (
              <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                <Text style={styles.listCount}>{matches.length} conversations</Text>
                {matches.map((match) => {
                  const conv = getConversation(match.odId);
                  const lastMsg = conv[conv.length - 1];
                  const unread = conv.filter(l => l.toId === currentUser?.id && !l.read).length;
                  
                  return (
                    <TouchableOpacity
                      key={match.odId}
                      style={styles.convCard}
                      onPress={() => { setSelectedMatch(match); setShowCompose(true); }}
                    >
                      <View style={styles.avatarContainer}>
                        <Avatar name={match.odName} size={55} />
                        {unread > 0 && (
                          <View style={styles.unreadBadge}>
                            <Text style={styles.unreadText}>{unread}</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.convInfo}>
                        <Text style={styles.convName}>{match.odName}</Text>
                        <Text style={styles.convMsg} numberOfLines={1}>
                          {lastMsg ? lastMsg.content : '✨ Nouveau match! Envoyez la première lettre'}
                        </Text>
                      </View>
                      <Text style={styles.convTime}>{lastMsg ? formatTime(lastMsg.timestamp) : 'Nouveau'}</Text>
                    </TouchableOpacity>
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
            
            {journalEntries.length === 0 ? (
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
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💌 LETTRES</Text>
        <Text style={styles.headerSubtitle}>Vos conversations et messages privés</Text>
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
            <Text style={styles.modalTitle}>{selectedMatch?.odName}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.messagesContainer}>
            {selectedMatch && getConversation(selectedMatch.odId).map((letter) => {
              const isOwn = letter.fromId === currentUser?.id || letter.fromId === 'me';
              return (
                <View key={letter.id} style={[styles.letterRow, isOwn && styles.letterRowOwn]}>
                  <View style={[styles.letterBubble, isOwn && styles.letterBubbleOwn]}>
                    <Text style={[styles.letterText, isOwn && styles.letterTextOwn]}>{letter.content}</Text>
                    <Text style={styles.letterTime}>{formatTime(letter.timestamp)}</Text>
                  </View>
                </View>
              );
            })}
            {selectedMatch && getConversation(selectedMatch.odId).length === 0 && (
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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 2, borderBottomColor: '#E8D5B7', alignItems: 'center' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 13, color: '#8B6F47', marginTop: 4, fontStyle: 'italic' },
  
  // Tabs
  tabsContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 8, marginHorizontal: 4 },
  tabActive: { backgroundColor: '#8B6F47' },
  tabText: { fontSize: 12, fontWeight: '600', color: '#8B6F47' },
  tabTextActive: { color: '#FFF' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 160 },
  listCount: { fontSize: 12, color: '#8B6F47', marginBottom: 12, textAlign: 'center' },
  
  convCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  avatarContainer: { position: 'relative' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E91E63', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  convInfo: { flex: 1, marginLeft: 14 },
  convName: { fontSize: 17, fontWeight: '700', color: '#3A2818' },
  convMsg: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  convTime: { fontSize: 12, color: '#B8860B' },
  
  // Empty
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
});
