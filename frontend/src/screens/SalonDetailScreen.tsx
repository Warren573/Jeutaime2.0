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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Avatar from '../components/Avatar';
import GiftModal from '../components/GiftModal';
import { salons, Salon, Participant } from '../data/appData';
import { useStore, Message } from '../store/useStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Member extends Participant {
  id: number;
  isPatron?: boolean;
}

export default function SalonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  // Store
  const { currentUser, addMessage, messagesBySalon, loadMessages, coins } = useStore();

  // Récupérer le salon
  const salonId = Number(params.id);
  const salon = salons.find(s => s.id === salonId);

  // States
  const [messageInput, setMessageInput] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [activeTab, setActiveTab] = useState<'discuss' | 'story'>('discuss');

  // Messages
  const messages = messagesBySalon[String(salonId)] || [];

  // Membres du salon
  const [members] = useState<Member[]>(() => {
    if (!salon) return [];
    const salonMembers = salon.participants.map((p, index) => ({
      ...p,
      id: index + 1,
      isPatron: false,
    }));
    return [
      ...salonMembers,
      {
        id: salonMembers.length + 1,
        name: currentUser?.name || 'Vous',
        gender: currentUser?.gender || 'M',
        age: currentUser?.age || 25,
        online: true,
        isPatron: true,
      },
    ];
  });

  // Charger les messages au montage
  useEffect(() => {
    loadMessages(String(salonId));
  }, [salonId]);

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

    addMessage(String(salonId), newMessage);
    setMessageInput('');
    scrollToEnd();
  };

  // Envoyer un cadeau
  const handleSendGift = (gift: any) => {
    const giftMessage: Message = {
      id: Date.now().toString(),
      username: 'Système',
      text: `${currentUser?.name || 'Quelqu\'un'} a envoyé ${gift.emoji} ${gift.name} à ${selectedMember?.name} !`,
      timestamp: Date.now(),
      isSystem: true,
      giftData: gift,
    };
    addMessage(String(salonId), giftMessage);
    setSelectedMember(null);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  if (!salon) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Salon non trouvé</Text>
      </View>
    );
  }

  const renderMessage = ({ item }: { item: Message }) => {
    const isOwn = item.username === (currentUser?.name || 'Vous');
    const isSystem = item.isSystem;

    if (isSystem && item.giftData) {
      return (
        <View style={styles.systemMessageContainer}>
          <LinearGradient
            colors={['#FFD700', '#FFA500']}
            style={styles.giftMessage}
          >
            <Text style={styles.giftEmoji}>{item.giftData.emoji}</Text>
            <Text style={styles.giftText}>{item.text}</Text>
            <Text style={styles.giftTime}>{formatTime(item.timestamp)}</Text>
          </LinearGradient>
        </View>
      );
    }

    return (
      <View style={[styles.messageRow, isOwn && styles.messageRowOwn]}>
        <Text style={styles.messageUsername}>
          {item.username} • {formatTime(item.timestamp)}
        </Text>
        <View style={[styles.messageBubble, isOwn && styles.messageBubbleOwn]}>
          <Text style={[styles.messageText, isOwn && styles.messageTextOwn]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      {/* Header avec gradient */}
      <LinearGradient
        colors={salon.gradient}
        style={[
          styles.header,
          { paddingTop: insets.top + 8 },
          isKeyboardVisible && styles.headerCompact,
        ]}
      >
        {/* Bouton retour */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        {/* Titre */}
        <Text style={[styles.title, isKeyboardVisible && styles.titleCompact]}>
          {salon.icon} {salon.name}
        </Text>

        {/* Solde */}
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>

        {/* Membres - cachés quand clavier visible */}
        {!isKeyboardVisible && (
          <View style={styles.membersGrid}>
            {members.slice(0, 4).map((member) => (
              <TouchableOpacity
                key={member.id}
                style={styles.memberCard}
                onPress={() => {
                  if (!member.isPatron) {
                    setSelectedMember(member);
                    setShowGiftModal(true);
                  }
                }}
              >
                <Avatar
                  name={member.name}
                  size={50}
                  online={member.online}
                  gender={member.gender}
                />
                <Text style={styles.memberName} numberOfLines={1}>
                  {member.name}
                </Text>
                {member.isPatron && <Text style={styles.patronBadge}>👑</Text>}
                {!member.isPatron && (
                  <View style={styles.giftBtnSmall}>
                    <Text style={styles.giftBtnSmallText}>🎁</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'discuss' && styles.tabActive]}
            onPress={() => setActiveTab('discuss')}
          >
            <Text style={styles.tabText}>
              💬 {isKeyboardVisible ? '' : 'Discussion'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'story' && styles.tabActive]}
            onPress={() => setActiveTab('story')}
          >
            <Text style={styles.tabText}>
              📖 {isKeyboardVisible ? '' : 'Histoire'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Bouton Magie - caché quand clavier visible */}
        {!isKeyboardVisible && (
          <TouchableOpacity
            style={styles.magicButton}
            onPress={() => setShowGiftModal(true)}
          >
            <Text style={styles.magicButtonText}>✨ Magie & Offrandes</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

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
              <Text style={styles.emptyChatText}>Commencez la discussion ! 💬</Text>
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

      {/* Modal cadeau */}
      <GiftModal
        visible={showGiftModal}
        onClose={() => {
          setShowGiftModal(false);
          setSelectedMember(null);
        }}
        recipientName={selectedMember?.name}
        onSendGift={handleSendGift}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 18,
    color: '#654321',
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerCompact: {
    paddingBottom: 8,
  },
  backButton: {
    position: 'absolute',
    top: 48,
    left: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  backButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#654321',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFF',
    textAlign: 'center',
    marginTop: 8,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  titleCompact: {
    fontSize: 18,
    marginTop: 4,
  },
  coinsContainer: {
    position: 'absolute',
    top: 48,
    right: 12,
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
  membersGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    marginBottom: 8,
  },
  memberCard: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 12,
    padding: 8,
    minWidth: 70,
  },
  memberName: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
    maxWidth: 60,
  },
  patronBadge: {
    fontSize: 12,
    marginTop: 2,
  },
  giftBtnSmall: {
    marginTop: 4,
    backgroundColor: 'rgba(255,215,0,0.9)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  giftBtnSmallText: {
    fontSize: 12,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 8,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },
  tabText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  magicButton: {
    marginTop: 10,
    backgroundColor: '#FFD700',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
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
    backgroundColor: '#667EEA',
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#333',
    lineHeight: 20,
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
    maxWidth: '85%',
  },
  giftEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  giftText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3A2818',
    textAlign: 'center',
  },
  giftTime: {
    fontSize: 10,
    color: 'rgba(0,0,0,0.5)',
    marginTop: 4,
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
    borderColor: '#8B6F47',
    color: '#3A2818',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#667EEA',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#667EEA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  sendButtonText: {
    fontSize: 20,
    color: '#FFF',
  },
});
