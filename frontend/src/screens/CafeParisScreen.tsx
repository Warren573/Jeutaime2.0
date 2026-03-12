import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Dimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import AvatarWithEffects from '../components/AvatarWithEffects';
import { allOfferings, allPowers, Offering, Power } from '../data/offerings';
import { useStore, Message } from '../store/useStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  gender: 'M' | 'F';
  online: boolean;
  isMe?: boolean;
  transformation?: string;
  effects?: string[];
  offerings: { emoji: string; from: string; timestamp: number }[];
}

export default function CafeParisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  // État
  const [messageInput, setMessageInput] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [activeTab, setActiveTab] = useState<'discuss' | 'story'>('discuss');

  // 4 joueurs face à face
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Sophie', gender: 'F', online: true, offerings: [] },
    { id: 'p2', name: 'Emma', gender: 'F', online: true, offerings: [] },
    { id: 'p3', name: 'Alex', gender: 'M', online: true, offerings: [] },
    { id: 'me', name: currentUser?.name || 'Vous', gender: 'M', online: true, isMe: true, offerings: [] },
  ]);

  const messages = messagesBySalon['cafe_paris'] || [];

  useEffect(() => {
    loadMessages('cafe_paris');
  }, []);

  // Gestion du clavier
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      scrollToEnd();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  // Envoyer un message
  const sendMessage = () => {
    if (!messageInput.trim()) return;
    const newMessage: Message = {
      id: Date.now().toString(),
      username: currentUser?.name || 'Vous',
      text: messageInput.trim(),
      timestamp: Date.now(),
    };
    addMessage('cafe_paris', newMessage);
    setMessageInput('');
    scrollToEnd();
  };

  // Envoyer une offrande
  const handleSendOffering = (item: Offering | Power) => {
    if (!selectedPlayer) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    // Ajouter l'offrande à la grille du joueur
    setPlayers(prev => prev.map(p => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          offerings: [...p.offerings, { emoji: item.emoji, from: currentUser?.name || 'Vous', timestamp: Date.now() }].slice(-6),
          transformation: 'type' in item && item.type === 'transformation' ? item.emoji : p.transformation,
          effects: 'type' in item && item.type === 'effect' ? [...(p.effects || []), item.emoji] : p.effects,
        };
      }
      return p;
    }));

    // Message système
    const sysMsg: Message = {
      id: Date.now().toString(),
      username: 'Système',
      text: `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} ${item.name} à ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      isSystem: true,
      giftData: item,
    };
    addMessage('cafe_paris', sysMsg);
    setShowOfferingsModal(false);
    setSelectedPlayer(null);
  };

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.username === (currentUser?.name || 'Vous');
    const isSystem = item.isSystem;

    if (isSystem) {
      return (
        <View style={styles.systemMessageContainer}>
          <LinearGradient colors={['#FFD700', '#FFA500']} style={styles.giftMessage}>
            {item.giftData && <Text style={styles.giftEmoji}>{item.giftData.emoji}</Text>}
            <Text style={styles.giftText}>{item.text}</Text>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <Text style={styles.messageUsername}>{item.username} • {formatTime(item.timestamp)}</Text>
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  // Layout 4 joueurs : 2 en haut, 2 en bas
  const topPlayers = players.slice(0, 2);
  const bottomPlayers = players.slice(2, 4);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#8D6E63', '#5D4037']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>☕ Café de Paris</Text>
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Zone des joueurs - cachée quand clavier visible */}
      {!isKeyboardVisible && (
        <View style={styles.playersZone}>
          {/* Rangée du haut */}
          <View style={styles.playersRow}>
            {topPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={styles.playerSlot}
                onPress={() => {
                  if (!player.isMe) {
                    setSelectedPlayer(player);
                    setShowOfferingsModal(true);
                  }
                }}
              >
                <AvatarWithEffects
                  name={player.name}
                  size={55}
                  online={player.online}
                  transformation={player.transformation}
                  effects={player.effects}
                  offerings={player.offerings}
                />
                {player.isMe && <Text style={styles.youBadge}>👑</Text>}
              </TouchableOpacity>
            ))}
          </View>

          {/* Rangée du bas */}
          <View style={styles.playersRow}>
            {bottomPlayers.map((player) => (
              <TouchableOpacity
                key={player.id}
                style={styles.playerSlot}
                onPress={() => {
                  if (!player.isMe) {
                    setSelectedPlayer(player);
                    setShowOfferingsModal(true);
                  }
                }}
              >
                <AvatarWithEffects
                  name={player.name}
                  size={55}
                  online={player.online}
                  transformation={player.transformation}
                  effects={player.effects}
                  offerings={player.offerings}
                />
                {player.isMe && <Text style={styles.youBadge}>👑</Text>}
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Bouton offrandes - caché quand clavier visible */}
      {!isKeyboardVisible && (
        <TouchableOpacity
          style={styles.magicButton}
          onPress={() => setShowOfferingsModal(true)}
        >
          <Text style={styles.magicButtonText}>✨ Offrandes & Pouvoirs</Text>
        </TouchableOpacity>
      )}

      {/* Zone de chat */}
      <View style={styles.chatContainer}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyChat}>
              <Text style={styles.emptyChatText}>Bienvenue au Café de Paris! ☕</Text>
            </View>
          }
        />
      </View>

      {/* Input */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TextInput
          ref={inputRef}
          style={styles.input}
          placeholder="Écrire un message..."
          placeholderTextColor="#8B6F47"
          value={messageInput}
          onChangeText={setMessageInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendButtonText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Offrandes */}
      <Modal visible={showOfferingsModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPlayer ? `Envoyer à ${selectedPlayer.name}` : '✨ Offrandes & Pouvoirs'}
              </Text>
              <TouchableOpacity onPress={() => { setShowOfferingsModal(false); setSelectedPlayer(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Sélection du joueur si pas déjà sélectionné */}
            {!selectedPlayer && (
              <View style={styles.playerSelector}>
                <Text style={styles.sectionTitle}>Choisir un joueur</Text>
                <View style={styles.playerSelectorRow}>
                  {players.filter(p => !p.isMe).map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={styles.playerSelectorItem}
                      onPress={() => setSelectedPlayer(p)}
                    >
                      <AvatarWithEffects name={p.name} size={45} online={p.online} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedPlayer && (
              <ScrollView style={styles.offeringsList}>
                <Text style={styles.sectionTitle}>🍹 Boissons</Text>
                <View style={styles.offeringsGrid}>
                  {allOfferings.filter(o => o.category === 'boisson').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.offeringItem, coins < o.cost && styles.offeringDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.offeringEmoji}>{o.emoji}</Text>
                      <Text style={styles.offeringName}>{o.name}</Text>
                      <Text style={styles.offeringCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>🍔 Nourriture</Text>
                <View style={styles.offeringsGrid}>
                  {allOfferings.filter(o => o.category === 'nourriture').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.offeringItem, coins < o.cost && styles.offeringDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.offeringEmoji}>{o.emoji}</Text>
                      <Text style={styles.offeringName}>{o.name}</Text>
                      <Text style={styles.offeringCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>💌 Symbolique</Text>
                <View style={styles.offeringsGrid}>
                  {allOfferings.filter(o => o.category === 'symbolique').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.offeringItem, coins < o.cost && styles.offeringDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.offeringEmoji}>{o.emoji}</Text>
                      <Text style={styles.offeringName}>{o.name}</Text>
                      <Text style={styles.offeringCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>🪄 Pouvoirs</Text>
                <View style={styles.offeringsGrid}>
                  {allPowers.map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.offeringItem, styles.powerItem, coins < p.cost && styles.offeringDisabled]}
                      onPress={() => handleSendOffering(p)}
                      disabled={coins < p.cost}
                    >
                      <Text style={styles.offeringEmoji}>{p.emoji}</Text>
                      <Text style={styles.offeringName}>{p.name}</Text>
                      <Text style={styles.offeringCost}>{p.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    position: 'absolute',
    left: 12,
    top: 48,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#5D4037',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFF',
    marginTop: 8,
  },
  coinsContainer: {
    position: 'absolute',
    right: 12,
    top: 48,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DAA520',
  },
  playersZone: {
    backgroundColor: '#5D4037',
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  playersRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 6,
  },
  playerSlot: {
    alignItems: 'center',
    position: 'relative',
  },
  youBadge: {
    position: 'absolute',
    top: -5,
    right: 5,
    fontSize: 14,
  },
  magicButton: {
    backgroundColor: '#FFD700',
    marginHorizontal: 16,
    marginVertical: 8,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  magicButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
  },
  chatContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  messagesList: {
    padding: 12,
    paddingBottom: 20,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyChatText: {
    fontSize: 16,
    color: '#8B6F47',
    fontStyle: 'italic',
  },
  messageRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageUsername: {
    fontSize: 11,
    color: '#8B6F47',
    marginBottom: 4,
    marginHorizontal: 8,
  },
  messageBubble: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: '80%',
  },
  messageBubbleOwn: {
    backgroundColor: '#8D6E63',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
  },
  messageTextOwn: {
    color: '#FFF',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  giftMessage: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: 'center',
  },
  giftEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  giftText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFF8E7',
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 2,
    borderColor: '#8D6E63',
    color: '#3A2818',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8D6E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFF',
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF8E7',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 30,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
  },
  closeBtn: {
    fontSize: 22,
    color: '#8B6F47',
    fontWeight: '600',
  },
  playerSelector: {
    padding: 16,
  },
  playerSelectorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
  },
  playerSelectorItem: {
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  offeringsList: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
    marginTop: 16,
    marginBottom: 12,
  },
  offeringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  offeringItem: {
    width: (SCREEN_WIDTH - 62) / 3,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  powerItem: {
    backgroundColor: '#F3E5F5',
  },
  offeringDisabled: {
    opacity: 0.5,
  },
  offeringEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  offeringName: {
    fontSize: 11,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },
  offeringCost: {
    fontSize: 10,
    color: '#DAA520',
    fontWeight: '700',
    marginTop: 2,
  },
});
