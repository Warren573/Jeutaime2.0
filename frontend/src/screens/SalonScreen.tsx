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
  useWindowDimensions,
  Modal,
  ScrollView,
  Animated,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { salonsData, SalonParticipant } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';
import { allOfferings, allPowers } from '../data/offerings';

// ============================================
// AVATARS CARTOON - URLs d'images
// ============================================
const AVATAR_IMAGES: Record<string, string> = {
  'zoe': 'https://api.dicebear.com/7.x/adventurer/png?seed=Zoe&backgroundColor=b6e3f4',
  'valerie': 'https://api.dicebear.com/7.x/adventurer/png?seed=Valerie&backgroundColor=ffd5dc',
  'kevin': 'https://api.dicebear.com/7.x/adventurer/png?seed=Kevin&backgroundColor=c0aede',
  'marc': 'https://api.dicebear.com/7.x/adventurer/png?seed=Marc&backgroundColor=d1f4d1',
  'sophie': 'https://api.dicebear.com/7.x/adventurer/png?seed=Sophie&backgroundColor=ffe8b8',
  'lucas': 'https://api.dicebear.com/7.x/adventurer/png?seed=Lucas&backgroundColor=b8d4ff',
  'emma': 'https://api.dicebear.com/7.x/adventurer/png?seed=Emma&backgroundColor=ffb8d4',
  'default': 'https://api.dicebear.com/7.x/adventurer/png?seed=Default&backgroundColor=e8e8e8',
};

// ============================================
// COMPOSANT AVATAR AVEC ANIMATION BREATHING
// ============================================
interface AvatarProps {
  participant: SalonParticipant & { isMe?: boolean };
  size: number;
  showBadges?: boolean;
  onPress?: () => void;
  isSelected?: boolean;
}

const AnimatedAvatar: React.FC<AvatarProps> = ({ participant, size, showBadges, onPress, isSelected }) => {
  const breathAnim = useRef(new Animated.Value(1)).current;
  
  useEffect(() => {
    const breathing = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1.05,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: true,
        }),
      ])
    );
    breathing.start();
    return () => breathing.stop();
  }, []);

  const avatarKey = participant.name.toLowerCase().replace(/[^a-z]/g, '');
  const imageUrl = AVATAR_IMAGES[avatarKey] || AVATAR_IMAGES['default'];
  const initial = participant.name.charAt(0).toUpperCase();

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Animated.View style={[
        styles.avatarContainer,
        { width: size, height: size, transform: [{ scale: breathAnim }] },
        isSelected && styles.avatarSelected,
      ]}>
        <Image
          source={{ uri: `${imageUrl}&size=${size * 2}` }}
          style={[styles.avatarImage, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2 }]}
          defaultSource={{ uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==' }}
        />
        {participant.online && <View style={styles.onlineDot} />}
        {participant.isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>Moi</Text>
          </View>
        )}
      </Animated.View>
      <Text style={styles.avatarName} numberOfLines={1}>{participant.name}</Text>
      {showBadges && participant.offerings && participant.offerings.length > 0 && (
        <View style={styles.badgesRow}>
          {participant.offerings.slice(-3).map((o, idx) => (
            <Text key={idx} style={styles.badgeEmoji}>{o.emoji}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// COMPOSANT PRINCIPAL SALON
// ============================================
export default function SalonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const flatListRef = useRef<FlatList>(null);
  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages, addCoins } = useStore();

  // Récupérer le salon - gestion de "cafe-paris" vs "cafe_paris"
  const rawSalonId = params.id as string;
  const salonId = rawSalonId === 'cafe-paris' ? 'cafe_paris' : (rawSalonId || 'cafe_paris');
  const salon = salonsData.find(s => s.id === salonId);

  // États
  const [messageInput, setMessageInput] = useState('');
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [showPowersModal, setShowPowersModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<SalonParticipant | null>(null);
  const [recentInteractions, setRecentInteractions] = useState<Array<{
    id: string;
    from: string;
    to: string;
    emoji: string;
    name: string;
    timestamp: number;
  }>>([]);

  // Participants
  const [participants, setParticipants] = useState<(SalonParticipant & { isMe?: boolean })[]>(() => {
    if (!salon) return [];
    return [
      ...salon.participants,
      {
        id: 'me',
        name: currentUser?.name || 'Vous',
        gender: currentUser?.gender || 'M',
        age: currentUser?.age || 25,
        online: true,
        offerings: [],
        isMe: true,
      } as SalonParticipant & { isMe: boolean },
    ];
  });

  const messages = messagesBySalon[salonId] || [];

  useEffect(() => {
    if (salonId) loadMessages(salonId);
  }, [salonId]);

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
      salonId: salonId,
      userId: currentUser?.id || 'me',
      userName: currentUser?.name || 'Vous',
      username: currentUser?.name || 'Vous',
      content: messageInput.trim(),
      text: messageInput.trim(),
      timestamp: Date.now(),
      type: 'message',
    };
    addMessage(salonId, newMessage);
    setMessageInput('');
    scrollToEnd();
  };

  // Envoyer une offrande
  const handleSendOffering = (item: any) => {
    if (!selectedPlayer) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    // Ajouter l'offrande au joueur
    setParticipants(prev => prev.map(p => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          offerings: [...(p.offerings || []), { emoji: item.emoji, from: currentUser?.name || 'Vous', timestamp: Date.now() }].slice(-6),
        };
      }
      return p;
    }));

    // Ajouter à l'historique des interactions
    setRecentInteractions(prev => [{
      id: Date.now().toString(),
      from: currentUser?.name || 'Vous',
      to: selectedPlayer.name,
      emoji: item.emoji,
      name: item.name,
      timestamp: Date.now(),
    }, ...prev].slice(0, 10));

    // Message système
    const sysMsg: Message = {
      id: Date.now().toString(),
      salonId: salonId,
      userId: 'system',
      userName: 'Système',
      username: 'Système',
      content: `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} ${item.name} à ${selectedPlayer.name}!`,
      text: `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} ${item.name} à ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      type: 'offering',
      isSystem: true,
      giftData: item,
    };
    addMessage(salonId, sysMsg);
    
    setShowOfferingsModal(false);
    setSelectedPlayer(null);
  };

  // Envoyer un pouvoir magique
  const handleSendPower = (item: any) => {
    if (!selectedPlayer) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    setRecentInteractions(prev => [{
      id: Date.now().toString(),
      from: currentUser?.name || 'Vous',
      to: selectedPlayer.name,
      emoji: item.emoji,
      name: item.name,
      timestamp: Date.now(),
    }, ...prev].slice(0, 10));

    const sysMsg: Message = {
      id: Date.now().toString(),
      salonId: salonId,
      userId: 'system',
      userName: 'Système',
      username: 'Système',
      content: `${currentUser?.name || 'Vous'} a lancé ${item.emoji} sur ${selectedPlayer.name}!`,
      text: `${currentUser?.name || 'Vous'} a lancé ${item.emoji} sur ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      type: 'power',
      isSystem: true,
      giftData: item,
    };
    addMessage(salonId, sysMsg);
    
    setShowPowersModal(false);
    setSelectedPlayer(null);
  };

  if (!salon) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Salon introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ============================================
  // RENDU MODE PORTRAIT (DISCUSSION)
  // ============================================
  const renderPortraitMode = () => (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header avec gradient */}
      <LinearGradient
        colors={salon.gradient || ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={[styles.header, { paddingTop: insets.top + 10 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{salon.emoji}</Text>
          <Text style={styles.headerTitle}>{salon.name}</Text>
        </View>
        <View style={styles.coinsDisplay}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Barre des participants */}
      <View style={styles.participantStrip}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {participants.map((p) => (
            <TouchableOpacity
              key={p.id}
              style={styles.participantItem}
              onPress={() => {
                if (!p.isMe) {
                  setSelectedPlayer(p);
                }
              }}
            >
              <AnimatedAvatar participant={p} size={44} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Zone de messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messagesList}
        contentContainerStyle={styles.messagesContent}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => {
          const isOwn = item.userId === 'me' || item.userId === currentUser?.id;
          const isSystem = item.type !== 'message';
          
          if (isSystem) {
            return (
              <View style={styles.systemMessage}>
                <Text style={styles.systemText}>{item.giftData?.emoji} {item.content || item.text}</Text>
              </View>
            );
          }

          return (
            <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
              {!isOwn && <Text style={styles.messageSender}>{item.userName || item.username}</Text>}
              <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
                <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
                  {item.content || item.text}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyMessages}>
            <Text style={styles.emptyEmoji}>💬</Text>
            <Text style={styles.emptyText}>Commencez la conversation!</Text>
          </View>
        }
      />

      {/* Barre d'input */}
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            if (selectedPlayer) {
              setShowOfferingsModal(true);
            } else {
              alert('Sélectionnez d\'abord un participant!');
            }
          }}
        >
          <Text style={styles.actionEmoji}>🎁</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => {
            if (selectedPlayer) {
              setShowPowersModal(true);
            } else {
              alert('Sélectionnez d\'abord un participant!');
            }
          }}
        >
          <Text style={styles.actionEmoji}>✨</Text>
        </TouchableOpacity>
        <TextInput
          style={styles.textInput}
          placeholder="Message..."
          placeholderTextColor="#999"
          value={messageInput}
          onChangeText={setMessageInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
          <Text style={styles.sendText}>↑</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );

  // ============================================
  // RENDU MODE PAYSAGE (INTERACTIONS)
  // ============================================
  const renderLandscapeMode = () => (
    <View style={[styles.landscapeContainer, { paddingTop: insets.top }]}>
      {/* Header compact */}
      <LinearGradient
        colors={salon.gradient || ['#667eea', '#764ba2']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.landscapeHeader}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.landscapeTitle}>{salon.emoji} {salon.name}</Text>
        <Text style={styles.coinsText}>💰 {coins}</Text>
      </LinearGradient>

      <View style={styles.landscapeContent}>
        {/* Zone des avatars (gauche) */}
        <View style={styles.avatarsZone}>
          <View style={styles.avatarsGrid}>
            {participants.map((p, index) => (
              <View key={p.id} style={styles.avatarGridItem}>
                <AnimatedAvatar
                  participant={p}
                  size={70}
                  showBadges={true}
                  onPress={() => !p.isMe && setSelectedPlayer(p)}
                  isSelected={selectedPlayer?.id === p.id}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Zone des interactions (droite) */}
        <View style={styles.interactionsZone}>
          <Text style={styles.interactionsTitle}>INTERACTIONS RÉCENTES</Text>
          <ScrollView style={styles.interactionsList}>
            {recentInteractions.length === 0 ? (
              <Text style={styles.noInteractions}>Aucune interaction récente</Text>
            ) : (
              recentInteractions.map((interaction) => (
                <View key={interaction.id} style={styles.interactionItem}>
                  <Text style={styles.interactionEmoji}>{interaction.emoji}</Text>
                  <Text style={styles.interactionText}>
                    {interaction.from} → {interaction.to}
                  </Text>
                </View>
              ))
            )}
          </ScrollView>

          {/* Boutons d'action */}
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[styles.bigActionButton, styles.giftButton]}
              onPress={() => {
                if (selectedPlayer) {
                  setShowOfferingsModal(true);
                } else {
                  alert('Sélectionnez d\'abord un participant!');
                }
              }}
            >
              <Text style={styles.bigActionEmoji}>🎁</Text>
              <Text style={styles.bigActionText}>Offrir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.bigActionButton, styles.magicButton]}
              onPress={() => {
                if (selectedPlayer) {
                  setShowPowersModal(true);
                } else {
                  alert('Sélectionnez d\'abord un participant!');
                }
              }}
            >
              <Text style={styles.bigActionEmoji}>✨</Text>
              <Text style={styles.bigActionText}>Magie</Text>
            </TouchableOpacity>
          </View>

          {selectedPlayer && (
            <View style={styles.selectedInfo}>
              <Text style={styles.selectedText}>Sélectionné: {selectedPlayer.name}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );

  // ============================================
  // MODALS
  // ============================================
  const renderOfferingsModal = () => (
    <Modal visible={showOfferingsModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎁 Offrir à {selectedPlayer?.name}</Text>
            <TouchableOpacity onPress={() => setShowOfferingsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.offeringsGrid}>
            {allOfferings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendOffering(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <Text style={styles.offeringName}>{item.name}</Text>
                <Text style={styles.offeringCost}>💰 {item.cost}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderPowersModal = () => (
    <Modal visible={showPowersModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✨ Magie sur {selectedPlayer?.name}</Text>
            <TouchableOpacity onPress={() => setShowPowersModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.offeringsGrid}>
            {allPowers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendPower(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <Text style={styles.offeringName}>{item.name}</Text>
                <Text style={styles.offeringCost}>💰 {item.cost}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <>
      {isLandscape ? renderLandscapeMode() : renderPortraitMode()}
      {renderOfferingsModal()}
      {renderPowersModal()}
    </>
  );
}

// ============================================
// STYLES
// ============================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  errorText: {
    fontSize: 18,
    color: '#8B6F47',
    textAlign: 'center',
    marginTop: 100,
  },
  backLink: {
    fontSize: 16,
    color: '#667eea',
    textAlign: 'center',
    marginTop: 20,
  },

  // Header Portrait
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    padding: 8,
  },
  backText: {
    fontSize: 24,
    color: '#FFF',
    fontWeight: '600',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  coinsDisplay: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
  },

  // Participant Strip
  participantStrip: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  participantItem: {
    alignItems: 'center',
    marginHorizontal: 8,
  },

  // Avatar
  avatarContainer: {
    backgroundColor: '#F0F0F0',
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatarSelected: {
    borderColor: '#FFD700',
    borderWidth: 4,
  },
  avatarImage: {
    backgroundColor: '#E8E8E8',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  meBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: '#667eea',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  meBadgeText: {
    fontSize: 9,
    color: '#FFF',
    fontWeight: '600',
  },
  avatarName: {
    fontSize: 11,
    color: '#5D4037',
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 4,
    maxWidth: 60,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 2,
  },
  badgeEmoji: {
    fontSize: 12,
    marginHorizontal: 1,
  },

  // Messages
  messagesList: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },
  messageRow: {
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  messageRowOwn: {
    alignItems: 'flex-end',
  },
  messageSender: {
    fontSize: 12,
    color: '#8B6F47',
    marginBottom: 4,
    fontWeight: '600',
  },
  messageBubble: {
    backgroundColor: '#FFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    borderTopLeftRadius: 4,
    maxWidth: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  messageBubbleOwn: {
    backgroundColor: '#667eea',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#3A2818',
    lineHeight: 20,
  },
  messageTextOwn: {
    color: '#FFF',
  },
  systemMessage: {
    alignSelf: 'center',
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginVertical: 8,
  },
  systemText: {
    fontSize: 13,
    color: '#667eea',
    fontStyle: 'italic',
  },
  emptyMessages: {
    alignItems: 'center',
    marginTop: 60,
  },
  emptyEmoji: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#8B6F47',
  },

  // Input Bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionEmoji: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    height: 40,
    backgroundColor: '#F5F0E6',
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#3A2818',
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendText: {
    fontSize: 20,
    color: '#FFF',
    fontWeight: '600',
  },

  // Landscape Mode
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  landscapeTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  landscapeContent: {
    flex: 1,
    flexDirection: 'row',
  },
  avatarsZone: {
    flex: 1.2,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    maxWidth: 320,
  },
  avatarGridItem: {
    margin: 12,
    alignItems: 'center',
  },
  interactionsZone: {
    flex: 1,
    backgroundColor: '#FFF',
    borderLeftWidth: 1,
    borderLeftColor: '#E8D5B7',
    padding: 16,
  },
  interactionsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#8B6F47',
    marginBottom: 12,
    letterSpacing: 1,
  },
  interactionsList: {
    flex: 1,
  },
  noInteractions: {
    fontSize: 13,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  interactionEmoji: {
    fontSize: 20,
    marginRight: 10,
  },
  interactionText: {
    fontSize: 13,
    color: '#5D4037',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E8D5B7',
  },
  bigActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  giftButton: {
    backgroundColor: '#FF6B6B',
  },
  magicButton: {
    backgroundColor: '#9C27B0',
  },
  bigActionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  bigActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  selectedInfo: {
    marginTop: 12,
    alignItems: 'center',
  },
  selectedText: {
    fontSize: 13,
    color: '#667eea',
    fontWeight: '500',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
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
  modalClose: {
    fontSize: 24,
    color: '#999',
  },
  offeringsGrid: {
    padding: 16,
  },
  offeringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  offeringEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  offeringName: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#3A2818',
  },
  offeringCost: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DAA520',
  },
});
