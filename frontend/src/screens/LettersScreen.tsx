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
import { useStore, Letter, Match } from '../store/useStore';

const Avatar = ({ name, size = 55 }: { name: string; size?: number }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

export default function LettersScreen() {
  const insets = useSafeAreaInsets();
  const { matches, letters, addLetter, markLetterRead, currentUser } = useStore();
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [showCompose, setShowCompose] = useState(false);

  const getConversation = (matchId: string) => {
    return letters.filter(l => l.fromId === matchId || l.toId === matchId).sort((a, b) => a.timestamp - b.timestamp);
  };

  const handleSend = () => {
    if (!newMessage.trim() || !selectedMatch) return;
    
    const letter: Letter = {
      id: Date.now().toString(),
      fromId: currentUser?.id || 'me',
      fromName: currentUser?.name || 'Vous',
      toId: selectedMatch.odId,
      toName: selectedMatch.odName,
      content: newMessage.trim(),
      timestamp: Date.now(),
      read: false,
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

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>💌 Lettres</Text>
        <Text style={styles.headerSubtitle}>{matches.length} matchs</Text>
      </View>

      {matches.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>💌</Text>
          <Text style={styles.emptyText}>Pas encore de matchs</Text>
          <Text style={styles.emptySubtext}>Souriez à des profils pour matcher!</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  convCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 14, padding: 14, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  avatarContainer: { position: 'relative' },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700' },
  unreadBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#E91E63', width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  unreadText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  convInfo: { flex: 1, marginLeft: 14 },
  convName: { fontSize: 17, fontWeight: '700', color: '#3A2818' },
  convMsg: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  convTime: { fontSize: 12, color: '#B8860B' },
  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: { fontSize: 14, color: '#8B6F47', marginTop: 8, textAlign: 'center' },
  // Modal
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
});
