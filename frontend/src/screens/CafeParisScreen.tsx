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
import { allOfferings, allPowers } from '../data/offerings';
import { useStore, Message } from '../store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface Player {
  id: string;
  name: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  isMe?: boolean;
  online: boolean;
  transformation?: string;
  offerings: { emoji: string; from: string }[];
}

// Composant Avatar simple
const Avatar = ({ name, size = 50, transformation }: { name: string; size?: number; transformation?: string }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: transformation ? '#E8E8E8' : bgColor }]}>
      {transformation ? (
        <Text style={{ fontSize: size * 0.5 }}>{transformation}</Text>
      ) : (
        <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
      )}
    </View>
  );
};

// Grille d'offrandes 2x3
const OfferingsGrid = ({ offerings, side }: { offerings: { emoji: string }[]; side: 'left' | 'right' }) => {
  const slots = Array(6).fill(null).map((_, i) => offerings[i] || null);
  
  return (
    <View style={[styles.offeringsGrid, side === 'left' ? styles.offeringsGridLeft : styles.offeringsGridRight]}>
      {slots.map((item, idx) => (
        <View key={idx} style={styles.offeringSlot}>
          {item && <Text style={styles.offeringEmoji}>{item.emoji}</Text>}
        </View>
      ))}
    </View>
  );
};

// Joueur avec avatar et grille d'offrandes
const PlayerSlot = ({ 
  player, 
  onPress,
  offeringsPosition 
}: { 
  player: Player; 
  onPress: () => void;
  offeringsPosition: 'left' | 'right';
}) => {
  const isRight = offeringsPosition === 'right';
  
  return (
    <TouchableOpacity style={styles.playerSlot} onPress={onPress} disabled={player.isMe}>
      {/* Si offrandes à gauche, les mettre avant l'avatar */}
      {!isRight && <OfferingsGrid offerings={player.offerings} side="left" />}
      
      <View style={styles.avatarContainer}>
        <Avatar name={player.name} size={50} transformation={player.transformation} />
        <Text style={styles.playerName}>{player.name}</Text>
        {player.isMe && <Text style={styles.meBadge}>👑</Text>}
        {player.online && <View style={styles.onlineDot} />}
      </View>
      
      {/* Si offrandes à droite, les mettre après l'avatar */}
      {isRight && <OfferingsGrid offerings={player.offerings} side="right" />}
    </TouchableOpacity>
  );
};

export default function CafeParisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  const [messageInput, setMessageInput] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [showMagicModal, setShowMagicModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);

  // 4 joueurs dans les positions fixes
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Sophie', position: 'top-left', online: true, offerings: [] },
    { id: 'p2', name: 'Emma', position: 'top-right', online: true, offerings: [] },
    { id: 'p3', name: 'Alex', position: 'bottom-left', online: true, offerings: [] },
    { id: 'me', name: currentUser?.name || 'Vous', position: 'bottom-right', online: true, isMe: true, offerings: [] },
  ]);

  const messages = messagesBySalon['cafe_paris'] || [];

  useEffect(() => {
    loadMessages('cafe_paris');
  }, []);

  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true);
      scrollToEnd();
    });
    const hideSub = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false);
    });
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  }, []);

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

  const handleSendOffering = (item: any) => {
    if (!selectedPlayer) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    setPlayers(prev => prev.map(p => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          offerings: [...p.offerings, { emoji: item.emoji, from: currentUser?.name || 'Vous' }].slice(-6),
        };
      }
      return p;
    }));

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
    setShowMagicModal(false);
    setSelectedPlayer(null);
  };

  const handleUseMagic = (item: any) => {
    if (!selectedPlayer) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    setPlayers(prev => prev.map(p => {
      if (p.id === selectedPlayer.id) {
        return { ...p, transformation: item.emoji };
      }
      return p;
    }));

    const sysMsg: Message = {
      id: Date.now().toString(),
      username: 'Système',
      text: `${currentUser?.name || 'Vous'} a utilisé ${item.emoji} ${item.name} sur ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      isSystem: true,
      giftData: item,
    };
    addMessage('cafe_paris', sysMsg);
    setShowMagicModal(false);
    setSelectedPlayer(null);
  };

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

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

  // Récupérer les joueurs par position
  const topLeft = players.find(p => p.position === 'top-left')!;
  const topRight = players.find(p => p.position === 'top-right')!;
  const bottomLeft = players.find(p => p.position === 'bottom-left')!;
  const bottomRight = players.find(p => p.position === 'bottom-right')!;

  const openPlayerModal = (player: Player, modalType: 'offerings' | 'magic') => {
    if (player.isMe) return;
    setSelectedPlayer(player);
    if (modalType === 'offerings') setShowOfferingsModal(true);
    else setShowMagicModal(true);
  };

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

      {/* Zone de jeu - Cachée quand clavier visible */}
      {!isKeyboardVisible && (
        <View style={styles.gameZone}>
          {/* LIGNE 1 : Sophie (gauche) et Emma (droite) */}
          <View style={styles.playersRowTop}>
            {/* Sophie : avatar + offrandes à droite */}
            <PlayerSlot 
              player={topLeft} 
              onPress={() => openPlayerModal(topLeft, 'offerings')}
              offeringsPosition="right"
            />
            {/* Emma : offrandes à gauche + avatar */}
            <PlayerSlot 
              player={topRight} 
              onPress={() => openPlayerModal(topRight, 'offerings')}
              offeringsPosition="left"
            />
          </View>

          {/* LIGNE 2 : Discussion horizontale */}
          <View style={styles.chatZone}>
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
                  <Text style={styles.emptyChatText}>Bienvenue au Café! ☕</Text>
                </View>
              }
            />
          </View>

          {/* LIGNE 3 : Alex (gauche) et Vous (droite) */}
          <View style={styles.playersRowBottom}>
            {/* Alex : avatar + offrandes à droite */}
            <PlayerSlot 
              player={bottomLeft} 
              onPress={() => openPlayerModal(bottomLeft, 'offerings')}
              offeringsPosition="right"
            />
            {/* Vous : offrandes à gauche + avatar */}
            <PlayerSlot 
              player={bottomRight} 
              onPress={() => {}}
              offeringsPosition="left"
            />
          </View>
        </View>
      )}

      {/* Boutons Offrandes et Magie */}
      {!isKeyboardVisible && (
        <View style={styles.actionButtons}>
          <TouchableOpacity 
            style={styles.actionButton} 
            onPress={() => setShowOfferingsModal(true)}
          >
            <Text style={styles.actionButtonText}>🎁 Offrandes</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.actionButton, styles.magicButton]} 
            onPress={() => setShowMagicModal(true)}
          >
            <Text style={styles.actionButtonText}>✨ Magie</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Zone de saisie */}
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
                {selectedPlayer ? `🎁 Envoyer à ${selectedPlayer.name}` : '🎁 Offrandes'}
              </Text>
              <TouchableOpacity onPress={() => { setShowOfferingsModal(false); setSelectedPlayer(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedPlayer && (
              <View style={styles.playerSelector}>
                <Text style={styles.sectionTitle}>Choisir un joueur</Text>
                <View style={styles.playerSelectorRow}>
                  {players.filter(p => !p.isMe).map(p => (
                    <TouchableOpacity key={p.id} style={styles.playerSelectorItem} onPress={() => setSelectedPlayer(p)}>
                      <Avatar name={p.name} size={50} />
                      <Text style={styles.playerSelectorName}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedPlayer && (
              <ScrollView style={styles.itemsList}>
                <Text style={styles.sectionTitle}>🍹 Boissons</Text>
                <View style={styles.itemsGrid}>
                  {allOfferings.filter(o => o.category === 'boisson').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemCard, coins < o.cost && styles.itemDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemEmoji}>{o.emoji}</Text>
                      <Text style={styles.itemName}>{o.name}</Text>
                      <Text style={styles.itemCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>🍔 Nourriture</Text>
                <View style={styles.itemsGrid}>
                  {allOfferings.filter(o => o.category === 'nourriture').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemCard, coins < o.cost && styles.itemDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemEmoji}>{o.emoji}</Text>
                      <Text style={styles.itemName}>{o.name}</Text>
                      <Text style={styles.itemCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>💌 Symbolique</Text>
                <View style={styles.itemsGrid}>
                  {allOfferings.filter(o => o.category === 'symbolique').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemCard, coins < o.cost && styles.itemDisabled]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemEmoji}>{o.emoji}</Text>
                      <Text style={styles.itemName}>{o.name}</Text>
                      <Text style={styles.itemCost}>{o.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal Magie */}
      <Modal visible={showMagicModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {selectedPlayer ? `✨ Magie sur ${selectedPlayer.name}` : '✨ Pouvoirs Magiques'}
              </Text>
              <TouchableOpacity onPress={() => { setShowMagicModal(false); setSelectedPlayer(null); }}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedPlayer && (
              <View style={styles.playerSelector}>
                <Text style={styles.sectionTitle}>Choisir une cible</Text>
                <View style={styles.playerSelectorRow}>
                  {players.filter(p => !p.isMe).map(p => (
                    <TouchableOpacity key={p.id} style={styles.playerSelectorItem} onPress={() => setSelectedPlayer(p)}>
                      <Avatar name={p.name} size={50} transformation={p.transformation} />
                      <Text style={styles.playerSelectorName}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {selectedPlayer && (
              <ScrollView style={styles.itemsList}>
                <Text style={styles.sectionTitle}>🐸 Transformations</Text>
                <View style={styles.itemsGrid}>
                  {allPowers.filter(p => p.type === 'transformation').map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.itemCard, styles.magicCard, coins < p.cost && styles.itemDisabled]}
                      onPress={() => handleUseMagic(p)}
                      disabled={coins < p.cost}
                    >
                      <Text style={styles.itemEmoji}>{p.emoji}</Text>
                      <Text style={styles.itemName}>{p.name}</Text>
                      <Text style={styles.itemCost}>{p.cost} 💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>✨ Effets</Text>
                <View style={styles.itemsGrid}>
                  {allPowers.filter(p => p.type === 'effect' || p.type === 'weather').map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.itemCard, styles.magicCard, coins < p.cost && styles.itemDisabled]}
                      onPress={() => handleUseMagic(p)}
                      disabled={coins < p.cost}
                    >
                      <Text style={styles.itemEmoji}>{p.emoji}</Text>
                      <Text style={styles.itemName}>{p.name}</Text>
                      <Text style={styles.itemCost}>{p.cost} 💰</Text>
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
    backgroundColor: '#5D4037',
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

  // Zone de jeu principale
  gameZone: {
    flex: 1,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },

  // Rangées de joueurs
  playersRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playersRowBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  // Slot joueur
  playerSlot: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFF',
    fontWeight: '700',
  },
  playerName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  meBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  onlineDot: {
    position: 'absolute',
    top: 0,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#5D4037',
  },

  // Grille d'offrandes 2x3
  offeringsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: 60,
    height: 60,
  },
  offeringsGridLeft: {
    marginRight: 6,
  },
  offeringsGridRight: {
    marginLeft: 6,
  },
  offeringSlot: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 6,
    margin: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offeringEmoji: {
    fontSize: 16,
  },

  // Zone de discussion
  chatZone: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    marginVertical: 8,
    overflow: 'hidden',
  },
  messagesList: {
    padding: 10,
  },
  emptyChat: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyChatText: {
    fontSize: 14,
    color: '#8B6F47',
    fontStyle: 'italic',
  },
  messageRow: {
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageUsername: {
    fontSize: 10,
    color: '#8B6F47',
    marginBottom: 2,
    marginHorizontal: 6,
  },
  messageBubble: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    maxWidth: '85%',
  },
  messageBubbleOwn: {
    backgroundColor: '#8D6E63',
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 14,
    color: '#333',
  },
  messageTextOwn: {
    color: '#FFF',
  },
  systemMessageContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  giftMessage: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    alignItems: 'center',
  },
  giftEmoji: {
    fontSize: 20,
  },
  giftText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },

  // Boutons d'action
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    gap: 8,
    marginBottom: 8,
  },
  actionButton: {
    flex: 1,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  magicButton: {
    backgroundColor: '#9C27B0',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A2818',
  },

  // Zone de saisie
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingTop: 8,
    backgroundColor: '#4E342E',
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#3A2818',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8D6E63',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonText: {
    fontSize: 18,
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
    maxHeight: '80%',
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
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#FFF',
    borderRadius: 12,
  },
  playerSelectorName: {
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
    color: '#3A2818',
  },
  itemsList: {
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5D4037',
    marginTop: 16,
    marginBottom: 12,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  itemCard: {
    width: (SCREEN_WIDTH - 62) / 3,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
  },
  magicCard: {
    backgroundColor: '#F3E5F5',
  },
  itemDisabled: {
    opacity: 0.5,
  },
  itemEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  itemName: {
    fontSize: 10,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },
  itemCost: {
    fontSize: 10,
    color: '#DAA520',
    fontWeight: '700',
    marginTop: 2,
  },
});
