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
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';

interface Bottle {
  id: string;
  message: string;
  fromId: string;
  fromRevealed: boolean;
  toId: string;
  toRevealed: boolean;
  timestamp: number;
  replies: { id: string; message: string; fromId: string; timestamp: number }[];
}

// Bouteilles mockées
const mockBottles: Bottle[] = [
  {
    id: '1',
    message: 'Si tu pouvais voyager n\'importe où demain, où irais-tu et pourquoi ? ✈️',
    fromId: 'stranger1',
    fromRevealed: false,
    toId: 'me',
    toRevealed: false,
    timestamp: Date.now() - 3600000,
    replies: [],
  },
  {
    id: '2', 
    message: 'Je cherche quelqu\'un pour parler de musique et partager nos playlists préférées 🎵',
    fromId: 'stranger2',
    fromRevealed: false,
    toId: 'me',
    toRevealed: false,
    timestamp: Date.now() - 7200000,
    replies: [
      { id: 'r1', message: 'J\'adore la musique! Quel genre tu écoutes?', fromId: 'me', timestamp: Date.now() - 6000000 }
    ],
  },
];

export default function BottleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, addPoints, removeCoins, coins } = useStore();
  
  const [bottles, setBottles] = useState(mockBottles);
  const [showWrite, setShowWrite] = useState(false);
  const [selectedBottle, setSelectedBottle] = useState<Bottle | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [replyMessage, setReplyMessage] = useState('');

  const handleSendBottle = () => {
    if (!newMessage.trim() || newMessage.length < 20) return;
    
    // Coût: 10 pièces pour envoyer une bouteille
    if (!removeCoins(10)) {
      alert('Il te faut 10 pièces pour envoyer une bouteille!');
      return;
    }
    
    addPoints(5);
    setNewMessage('');
    setShowWrite(false);
    alert('🍾 Ta bouteille a été jetée à la mer! Elle trouvera quelqu\'un bientôt...');
  };

  const handleReply = () => {
    if (!replyMessage.trim() || !selectedBottle) return;
    
    const newReply = {
      id: Date.now().toString(),
      message: replyMessage.trim(),
      fromId: 'me',
      timestamp: Date.now(),
    };
    
    setBottles(prev => prev.map(b => 
      b.id === selectedBottle.id 
        ? { ...b, replies: [...b.replies, newReply] }
        : b
    ));
    
    addPoints(3);
    setReplyMessage('');
  };

  const handleReveal = (bottleId: string) => {
    // Coût: 50 pièces pour se dévoiler
    if (!removeCoins(50)) {
      alert('Il te faut 50 pièces pour te dévoiler!');
      return;
    }
    
    setBottles(prev => prev.map(b => 
      b.id === bottleId ? { ...b, toRevealed: true } : b
    ));
    
    addPoints(10);
  };

  const formatTime = (ts: number) => {
    const diff = Math.floor((Date.now() - ts) / 1000 / 60);
    if (diff < 60) return `${diff}min`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}j`;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🍾 Bouteille à la mer</Text>
        <Text style={styles.subtitle}>Messages anonymes, rencontres mystérieuses</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Explication */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>💌 Comment ça marche ?</Text>
          <Text style={styles.infoText}>• Envoyez un message anonyme à un inconnu</Text>
          <Text style={styles.infoText}>• Discutez sans connaître l'identité de l'autre</Text>
          <Text style={styles.infoText}>• Décidez ensemble de vous dévoiler ou non</Text>
          <Text style={styles.infoCost}>📤 Envoyer: 10 🪙 | 🔓 Se dévoiler: 50 🪙</Text>
        </View>

        {/* Bouton envoyer */}
        <TouchableOpacity style={styles.sendBtn} onPress={() => setShowWrite(true)}>
          <Text style={styles.sendBtnEmoji}>🍾</Text>
          <View style={styles.sendBtnContent}>
            <Text style={styles.sendBtnText}>Jeter une bouteille</Text>
            <Text style={styles.sendBtnCost}>10 🪙</Text>
          </View>
        </TouchableOpacity>

        {/* Bouteilles reçues */}
        <Text style={styles.sectionTitle}>📬 Bouteilles reçues ({bottles.length})</Text>
        
        {bottles.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyEmoji}>🌊</Text>
            <Text style={styles.emptyText}>Aucune bouteille pour l'instant</Text>
            <Text style={styles.emptySubtext}>La mer est calme... Revenez plus tard!</Text>
          </View>
        ) : (
          bottles.map(bottle => (
            <TouchableOpacity 
              key={bottle.id} 
              style={styles.bottleCard}
              onPress={() => setSelectedBottle(bottle)}
            >
              <View style={styles.bottleHeader}>
                <Text style={styles.bottleEmoji}>🍾</Text>
                <Text style={styles.bottleFrom}>
                  {bottle.fromRevealed ? 'Sophie, 28 ans' : 'Inconnu(e) mystérieux(se)'}
                </Text>
                <Text style={styles.bottleTime}>{formatTime(bottle.timestamp)}</Text>
              </View>
              <Text style={styles.bottleMessage} numberOfLines={2}>{bottle.message}</Text>
              {bottle.replies.length > 0 && (
                <Text style={styles.bottleReplies}>💬 {bottle.replies.length} réponse(s)</Text>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Modal écrire */}
      <Modal visible={showWrite} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView 
            style={styles.modalBox}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>🍾 Nouvelle bouteille</Text>
              <TouchableOpacity onPress={() => setShowWrite(false)}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <Text style={styles.modalSubtitle}>Écrivez un message qui sera envoyé à un inconnu</Text>
            
            <TextInput
              style={styles.messageInput}
              placeholder="Votre message mystérieux (min 20 car.)..."
              placeholderTextColor="#8B6F47"
              value={newMessage}
              onChangeText={setNewMessage}
              multiline
              numberOfLines={6}
            />
            <Text style={styles.charCount}>{newMessage.length}/20 min</Text>
            
            <TouchableOpacity 
              style={[styles.submitBtn, newMessage.length < 20 && styles.submitBtnDisabled]} 
              onPress={handleSendBottle}
              disabled={newMessage.length < 20}
            >
              <Text style={styles.submitBtnText}>🌊 Jeter à la mer (10 🪙)</Text>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* Modal conversation */}
      <Modal visible={!!selectedBottle} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <KeyboardAvoidingView 
            style={styles.modalBoxFull}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedBottle(null)}>
                <Text style={styles.backText}>← Retour</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>💬 Conversation</Text>
              <View style={{ width: 60 }} />
            </View>

            {selectedBottle && (
              <ScrollView style={styles.convScroll}>
                {/* Message original */}
                <View style={styles.originalMessage}>
                  <Text style={styles.originalEmoji}>🍾</Text>
                  <Text style={styles.originalText}>{selectedBottle.message}</Text>
                  <Text style={styles.originalFrom}>
                    — {selectedBottle.fromRevealed ? 'Sophie, 28 ans' : 'Inconnu(e)'}
                  </Text>
                </View>

                {/* Réponses */}
                {selectedBottle.replies.map(reply => (
                  <View 
                    key={reply.id} 
                    style={[styles.replyBubble, reply.fromId === 'me' && styles.replyBubbleMine]}
                  >
                    <Text style={[styles.replyText, reply.fromId === 'me' && styles.replyTextMine]}>
                      {reply.message}
                    </Text>
                    <Text style={styles.replyTime}>{formatTime(reply.timestamp)}</Text>
                  </View>
                ))}

                {/* Bouton dévoiler */}
                {!selectedBottle.toRevealed && (
                  <TouchableOpacity style={styles.revealBtn} onPress={() => handleReveal(selectedBottle.id)}>
                    <Text style={styles.revealBtnText}>🔓 Me dévoiler (50 🪙)</Text>
                  </TouchableOpacity>
                )}
                
                {selectedBottle.toRevealed && (
                  <View style={styles.revealedBox}>
                    <Text style={styles.revealedEmoji}>✨</Text>
                    <Text style={styles.revealedText}>Tu t'es dévoilé(e)!</Text>
                    {selectedBottle.fromRevealed && (
                      <Text style={styles.revealedMatch}>🎉 Match mutuel! Vous pouvez vous voir!</Text>
                    )}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Input réponse */}
            <View style={styles.replyInputContainer}>
              <TextInput
                style={styles.replyInput}
                placeholder="Votre réponse..."
                placeholderTextColor="#8B6F47"
                value={replyMessage}
                onChangeText={setReplyMessage}
              />
              <TouchableOpacity style={styles.replySendBtn} onPress={handleReply}>
                <Text style={styles.replySendText}>➤</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E3F2FD' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#90CAF9', backgroundColor: '#FFF' },
  backText: { fontSize: 16, color: '#1976D2' },
  title: { fontSize: 28, fontWeight: '700', color: '#1565C0', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#64B5F6', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Info box
  infoBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#2196F3' },
  infoTitle: { fontSize: 17, fontWeight: '700', color: '#1565C0', marginBottom: 10 },
  infoText: { fontSize: 14, color: '#5D4037', marginBottom: 6 },
  infoCost: { fontSize: 13, color: '#E91E63', fontWeight: '600', marginTop: 8 },
  
  // Send button
  sendBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2196F3', borderRadius: 20, padding: 18, marginBottom: 20 },
  sendBtnEmoji: { fontSize: 36, marginRight: 14 },
  sendBtnContent: { flex: 1 },
  sendBtnText: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  sendBtnCost: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  
  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#1565C0', marginBottom: 12 },
  
  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyEmoji: { fontSize: 60, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#1565C0' },
  emptySubtext: { fontSize: 14, color: '#64B5F6', marginTop: 6 },
  
  // Bottle card
  bottleCard: { backgroundColor: '#FFF', borderRadius: 18, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  bottleHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  bottleEmoji: { fontSize: 24, marginRight: 10 },
  bottleFrom: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1565C0', fontStyle: 'italic' },
  bottleTime: { fontSize: 12, color: '#90CAF9' },
  bottleMessage: { fontSize: 15, color: '#37474F', lineHeight: 22 },
  bottleReplies: { fontSize: 13, color: '#2196F3', marginTop: 10, fontWeight: '600' },
  
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  modalBoxFull: { flex: 1, backgroundColor: '#E3F2FD', marginTop: 50, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#90CAF9', backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  modalTitle: { fontSize: 20, fontWeight: '700', color: '#1565C0' },
  closeX: { fontSize: 26, color: '#64B5F6' },
  modalSubtitle: { fontSize: 14, color: '#64B5F6', marginBottom: 16 },
  
  // Message input
  messageInput: { backgroundColor: '#F5F5F5', borderRadius: 16, padding: 16, fontSize: 16, height: 150, textAlignVertical: 'top', borderWidth: 1, borderColor: '#90CAF9' },
  charCount: { fontSize: 12, color: '#64B5F6', textAlign: 'right', marginTop: 4 },
  submitBtn: { backgroundColor: '#2196F3', borderRadius: 16, padding: 18, alignItems: 'center', marginTop: 16 },
  submitBtnDisabled: { backgroundColor: '#BDBDBD' },
  submitBtnText: { color: '#FFF', fontWeight: '700', fontSize: 17 },
  
  // Conversation
  convScroll: { flex: 1, padding: 16 },
  originalMessage: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, alignItems: 'center' },
  originalEmoji: { fontSize: 40, marginBottom: 10 },
  originalText: { fontSize: 16, color: '#37474F', textAlign: 'center', lineHeight: 24 },
  originalFrom: { fontSize: 13, color: '#90CAF9', fontStyle: 'italic', marginTop: 12 },
  
  // Reply bubbles
  replyBubble: { backgroundColor: '#FFF', borderRadius: 18, padding: 14, marginBottom: 10, maxWidth: '80%', alignSelf: 'flex-start' },
  replyBubbleMine: { backgroundColor: '#2196F3', alignSelf: 'flex-end' },
  replyText: { fontSize: 15, color: '#37474F' },
  replyTextMine: { color: '#FFF' },
  replyTime: { fontSize: 10, color: '#90CAF9', marginTop: 6 },
  
  // Reveal
  revealBtn: { backgroundColor: '#FF9800', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 20 },
  revealBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  revealedBox: { backgroundColor: '#E8F5E9', borderRadius: 16, padding: 20, alignItems: 'center', marginTop: 20 },
  revealedEmoji: { fontSize: 40, marginBottom: 8 },
  revealedText: { fontSize: 16, fontWeight: '700', color: '#4CAF50' },
  revealedMatch: { fontSize: 14, color: '#2E7D32', marginTop: 8, textAlign: 'center' },
  
  // Reply input
  replyInputContainer: { flexDirection: 'row', padding: 12, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#90CAF9' },
  replyInput: { flex: 1, backgroundColor: '#F5F5F5', borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15 },
  replySendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  replySendText: { fontSize: 18, color: '#FFF' },
});
