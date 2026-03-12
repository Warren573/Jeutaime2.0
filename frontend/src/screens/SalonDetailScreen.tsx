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
import { useRouter, useLocalSearchParams } from 'expo-router';
import AvatarWithEffects from '../components/AvatarWithEffects';
import { allOfferings, allPowers, metalOfferings, metalPowers } from '../data/offerings';
import { salonsData, SalonParticipant } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface StoryEntry {
  id: string;
  author: string;
  text: string;
  timestamp: number;
}

export default function SalonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList>(null);
  const storyListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  // Récupérer le salon
  const salonId = params.id as string;
  const salon = salonsData.find(s => s.id === salonId);

  // États
  const [messageInput, setMessageInput] = useState('');
  const [storyInput, setStoryInput] = useState('');
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<SalonParticipant | null>(null);
  const [activeTab, setActiveTab] = useState<'discuss' | 'story'>('discuss');

  // Histoire collaborative
  const [story, setStory] = useState<StoryEntry[]>([]);
  const [currentTurnIndex, setCurrentTurnIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(24 * 60 * 60); // 24h en secondes

  // Participants (avec l'utilisateur actuel)
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
  const currentPlayer = participants[currentTurnIndex];
  const isMyTurn = currentPlayer?.id === 'me';
  const isMetal = salon?.type === 'metal';

  // Charger les messages
  useEffect(() => {
    if (salonId) loadMessages(salonId);
  }, [salonId]);

  // Timer pour l'histoire
  useEffect(() => {
    if (activeTab !== 'story') return;
    const interval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 0) {
          handleSkipTurn();
          return 24 * 60 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTab, currentTurnIndex]);

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
      if (activeTab === 'discuss') {
        flatListRef.current?.scrollToEnd({ animated: true });
      } else {
        storyListRef.current?.scrollToEnd({ animated: true });
      }
    }, 100);
  }, [activeTab]);

  // Passer le tour
  const handleSkipTurn = () => {
    const nextIndex = (currentTurnIndex + 1) % participants.length;
    setCurrentTurnIndex(nextIndex);
    // TODO: gérer l'expulsion après 2 tours ratés
  };

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

  // Soumettre une phrase de l'histoire
  const submitStoryEntry = () => {
    if (!storyInput.trim() || storyInput.length < 10) {
      alert('⚠️ La phrase doit faire au moins 10 caractères!');
      return;
    }

    const newEntry: StoryEntry = {
      id: Date.now().toString(),
      author: currentUser?.name || 'Vous',
      text: storyInput.trim(),
      timestamp: Date.now(),
    };

    setStory(prev => [...prev, newEntry]);
    setStoryInput('');
    setTimeRemaining(24 * 60 * 60);
    
    // Passer au joueur suivant
    const nextIndex = (currentTurnIndex + 1) % participants.length;
    setCurrentTurnIndex(nextIndex);

    // Bonus si histoire complète (15 phrases)
    if (story.length + 1 >= 15) {
      alert('🎉 Histoire complétée! +50 points +100 💰');
    }
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
          transformation: item.type === 'transformation' ? item.emoji : p.transformation,
          effects: item.type === 'effect' ? [...(p.effects || []), item.emoji] : p.effects,
        };
      }
      return p;
    }));

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

  const formatTime = (ts: number) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  
  const formatCountdown = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  if (!salon) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Salon non trouvé</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.errorLink}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const offerings = isMetal ? [...allOfferings, ...metalOfferings] : allOfferings;
  const powers = isMetal ? [...allPowers, ...metalPowers] : allPowers;

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

  const renderStoryEntry = ({ item }: { item: StoryEntry }) => (
    <View style={styles.storyEntry}>
      <Text style={styles.storyAuthor}>{item.author}</Text>
      <Text style={styles.storyText}>{item.text}</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient
        colors={salon.gradient}
        style={[styles.header, { paddingTop: insets.top + 8 }, isKeyboardVisible && styles.headerCompact]}
      >
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={[styles.title, isKeyboardVisible && styles.titleCompact]}>
          {salon.icon} {salon.name}
        </Text>
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>

        {/* Timer histoire */}
        {activeTab === 'story' && !isKeyboardVisible && (
          <View style={styles.timerBadge}>
            <Text style={styles.timerText}>⏱️ {formatCountdown(timeRemaining)}</Text>
          </View>
        )}

        {/* Membres */}
        {!isKeyboardVisible && (
          <View style={styles.membersRow}>
            {participants.slice(0, 5).map((p) => (
              <TouchableOpacity
                key={p.id}
                style={styles.memberSlot}
                onPress={() => {
                  if (!p.isMe) {
                    setSelectedPlayer(p);
                    setShowOfferingsModal(true);
                  }
                }}
              >
                <AvatarWithEffects
                  name={p.name}
                  size={50}
                  online={p.online}
                  transformation={p.transformation}
                  effects={p.effects}
                  offerings={p.offerings}
                />
                {p.isMe && <Text style={styles.meBadge}>👑</Text>}
                {activeTab === 'story' && p.id === currentPlayer?.id && (
                  <View style={styles.turnIndicator} />
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
            <Text style={styles.tabText}>💬 {isKeyboardVisible ? '' : 'Discussion'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'story' && styles.tabActive]}
            onPress={() => setActiveTab('story')}
          >
            <Text style={styles.tabText}>📖 {isKeyboardVisible ? '' : 'Histoire'}</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton Magie */}
        {!isKeyboardVisible && (
          <TouchableOpacity style={styles.magicButton} onPress={() => setShowOfferingsModal(true)}>
            <Text style={styles.magicButtonText}>✨ Offrandes & Pouvoirs</Text>
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Contenu */}
      {activeTab === 'discuss' ? (
        <>
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
                  <Text style={styles.emptyChatText}>Commencez la discussion! 💬</Text>
                </View>
              }
            />
          </View>
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
        </>
      ) : (
        <>
          {/* Mode Histoire */}
          <View style={styles.storyContainer}>
            {/* Indicateur de tour */}
            <View style={[styles.turnBanner, isMyTurn && styles.turnBannerMyTurn]}>
              <Text style={styles.turnBannerText}>
                {isMyTurn ? '✍️ À toi de jouer!' : `Tour de ${currentPlayer?.name}`}
              </Text>
            </View>

            <FlatList
              ref={storyListRef}
              data={story}
              renderItem={renderStoryEntry}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.storyList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyStory}>
                  <Text style={styles.emptyStoryText}>L'histoire n'a pas encore commencé...</Text>
                  <Text style={styles.emptyStoryHint}>Écrivez la première phrase!</Text>
                </View>
              }
            />

            {/* Progression */}
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(story.length / 15) * 100}%` }]} />
              <Text style={styles.progressText}>{story.length}/15 phrases</Text>
            </View>
          </View>

          {/* Input histoire (seulement si c'est mon tour) */}
          {isMyTurn && (
            <View style={[styles.storyInputContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
              <TextInput
                style={styles.storyInput}
                placeholder="Écrivez votre phrase (min. 10 car.)..."
                placeholderTextColor="#8B6F47"
                value={storyInput}
                onChangeText={setStoryInput}
                multiline
                maxLength={200}
              />
              <View style={styles.storyInputFooter}>
                <Text style={styles.charCount}>{storyInput.length}/200</Text>
                <TouchableOpacity
                  style={[styles.submitButton, storyInput.length < 10 && styles.submitButtonDisabled]}
                  onPress={submitStoryEntry}
                  disabled={storyInput.length < 10}
                >
                  <Text style={styles.submitButtonText}>Envoyer ✨</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}

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

            {!selectedPlayer && (
              <View style={styles.playerSelector}>
                <Text style={styles.sectionTitle}>Choisir un joueur</Text>
                <View style={styles.playerSelectorRow}>
                  {participants.filter(p => !p.isMe).map(p => (
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
                  {offerings.filter(o => o.category === 'boisson').map(o => (
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
                  {offerings.filter(o => o.category === 'nourriture').map(o => (
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
                  {offerings.filter(o => o.category === 'symbolique').map(o => (
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
                  {powers.map(p => (
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
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 18, color: '#654321', marginBottom: 16 },
  errorLink: { fontSize: 16, color: '#667EEA' },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  headerCompact: { paddingBottom: 8 },
  backButton: { position: 'absolute', left: 12, top: 48, width: 36, height: 36, borderRadius: 18, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  backButtonText: { fontSize: 20, fontWeight: '700', color: '#654321' },
  title: { fontSize: 20, fontWeight: '700', color: '#FFF', textAlign: 'center', marginTop: 8 },
  titleCompact: { fontSize: 16 },
  coinsContainer: { position: 'absolute', right: 12, top: 48, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  coinsText: { fontSize: 14, fontWeight: '700', color: '#DAA520' },
  timerBadge: { position: 'absolute', right: 12, top: 80, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  timerText: { fontSize: 12, color: '#FFF', fontWeight: '600' },
  membersRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, marginBottom: 8 },
  memberSlot: { alignItems: 'center', position: 'relative' },
  meBadge: { position: 'absolute', top: -5, right: 5, fontSize: 12 },
  turnIndicator: { position: 'absolute', bottom: 15, left: '50%', marginLeft: -8, width: 16, height: 4, borderRadius: 2, backgroundColor: '#FFD700' },
  tabs: { flexDirection: 'row', marginTop: 8, gap: 8 },
  tab: { flex: 1, paddingVertical: 8, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center' },
  tabActive: { backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  tabText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  magicButton: { marginTop: 10, backgroundColor: '#FFD700', paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  magicButtonText: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  chatContainer: { flex: 1, backgroundColor: '#FFF' },
  messagesList: { padding: 12, paddingBottom: 20 },
  emptyChat: { alignItems: 'center', paddingVertical: 60 },
  emptyChatText: { fontSize: 16, color: '#8B6F47', fontStyle: 'italic' },
  messageRow: { marginBottom: 12, alignItems: 'flex-start' },
  messageRowOwn: { alignItems: 'flex-end' },
  messageUsername: { fontSize: 11, color: '#8B6F47', marginBottom: 4, marginHorizontal: 8 },
  messageBubble: { backgroundColor: '#F0F0F0', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderBottomLeftRadius: 4, maxWidth: '80%' },
  messageBubbleOwn: { backgroundColor: '#667EEA', borderBottomLeftRadius: 18, borderBottomRightRadius: 4 },
  messageText: { fontSize: 15, color: '#333' },
  messageTextOwn: { color: '#FFF' },
  systemMessageContainer: { alignItems: 'center', marginVertical: 12 },
  giftMessage: { paddingHorizontal: 20, paddingVertical: 12, borderRadius: 20, alignItems: 'center' },
  giftEmoji: { fontSize: 24, marginBottom: 4 },
  giftText: { fontSize: 13, fontWeight: '600', color: '#3A2818', textAlign: 'center' },
  inputContainer: { flexDirection: 'row', paddingHorizontal: 12, paddingTop: 8, backgroundColor: '#FFF8E7', borderTopWidth: 1, borderTopColor: '#E8D5B7', gap: 8 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 24, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, borderWidth: 2, borderColor: '#8B6F47', color: '#3A2818' },
  sendButton: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#667EEA', alignItems: 'center', justifyContent: 'center' },
  sendButtonText: { fontSize: 20, color: '#FFF' },
  // Histoire
  storyContainer: { flex: 1, backgroundColor: '#FFF' },
  turnBanner: { backgroundColor: '#E8D5B7', paddingVertical: 10, alignItems: 'center' },
  turnBannerMyTurn: { backgroundColor: '#4CAF50' },
  turnBannerText: { fontSize: 14, fontWeight: '700', color: '#3A2818' },
  storyList: { padding: 16 },
  emptyStory: { alignItems: 'center', paddingVertical: 60 },
  emptyStoryText: { fontSize: 16, color: '#8B6F47', fontStyle: 'italic' },
  emptyStoryHint: { fontSize: 14, color: '#B8860B', marginTop: 8 },
  storyEntry: { backgroundColor: '#FFF8E7', padding: 12, borderRadius: 12, marginBottom: 12, borderLeftWidth: 3, borderLeftColor: '#FFD700' },
  storyAuthor: { fontSize: 11, fontWeight: '700', color: '#8B6F47', marginBottom: 4 },
  storyText: { fontSize: 15, color: '#3A2818', lineHeight: 22 },
  progressBar: { height: 24, backgroundColor: '#E8D5B7', marginHorizontal: 16, borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: '#4CAF50' },
  progressText: { position: 'absolute', width: '100%', textAlign: 'center', lineHeight: 24, fontSize: 12, fontWeight: '700', color: '#3A2818' },
  storyInputContainer: { padding: 12, backgroundColor: '#FFF8E7', borderTopWidth: 2, borderTopColor: '#FFD700' },
  storyInput: { backgroundColor: '#FFF', borderRadius: 12, padding: 12, fontSize: 15, borderWidth: 2, borderColor: '#8B6F47', minHeight: 60, textAlignVertical: 'top' },
  storyInputFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  charCount: { fontSize: 12, color: '#8B6F47' },
  submitButton: { backgroundColor: '#4CAF50', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  submitButtonDisabled: { backgroundColor: '#CCC' },
  submitButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: '#FFF8E7', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%', paddingBottom: 30 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  closeBtn: { fontSize: 22, color: '#8B6F47', fontWeight: '600' },
  playerSelector: { padding: 16 },
  playerSelectorRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12 },
  playerSelectorItem: { padding: 8, backgroundColor: '#FFF', borderRadius: 12 },
  offeringsList: { paddingHorizontal: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#654321', marginTop: 16, marginBottom: 12 },
  offeringsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  offeringItem: { width: (SCREEN_WIDTH - 62) / 3, backgroundColor: '#FFF', borderRadius: 12, padding: 10, alignItems: 'center' },
  powerItem: { backgroundColor: '#F3E5F5' },
  offeringDisabled: { opacity: 0.5 },
  offeringEmoji: { fontSize: 28, marginBottom: 4 },
  offeringName: { fontSize: 11, fontWeight: '600', color: '#3A2818', textAlign: 'center' },
  offeringCost: { fontSize: 10, color: '#DAA520', fontWeight: '700', marginTop: 2 },
});
