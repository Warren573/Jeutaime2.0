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
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { salonsData, SalonParticipant } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';
import { allOfferings, allPowers } from '../data/offerings';
import SalonAvatar from '../components/SalonAvatar';
import AvatarRadialMenu, { RadialAction } from '../components/AvatarRadialMenu';

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
  'julie': 'https://api.dicebear.com/7.x/adventurer/png?seed=Julie&backgroundColor=ffc8e8',
  'thomas': 'https://api.dicebear.com/7.x/adventurer/png?seed=Thomas&backgroundColor=c8ffc8',
  'clara': 'https://api.dicebear.com/7.x/adventurer/png?seed=Clara&backgroundColor=fff0b8',
  'default': 'https://api.dicebear.com/7.x/adventurer/png?seed=Default&backgroundColor=e8e8e8',
  'vous': 'https://api.dicebear.com/7.x/adventurer/png?seed=Me&backgroundColor=667eea',
  'moi': 'https://api.dicebear.com/7.x/adventurer/png?seed=Me&backgroundColor=667eea',
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
  showName?: boolean;
}

const AnimatedAvatar: React.FC<AvatarProps> = ({
  participant,
  size,
  showBadges = true,
  onPress,
  isSelected,
  showName = true
}) => {
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

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={styles.avatarWrapper}>
      <Animated.View style={[
        styles.avatarContainer,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          transform: [{ scale: breathAnim }]
        },
        isSelected && styles.avatarSelected,
      ]}>
        <Image
          source={{ uri: `${imageUrl}&size=${size * 2}` }}
          style={[
            styles.avatarImage,
            {
              width: size - 8,
              height: size - 8,
              borderRadius: (size - 8) / 2
            }
          ]}
        />
        {participant.online && (
          <View style={[styles.onlineDot, { width: size * 0.2, height: size * 0.2, borderRadius: size * 0.1 }]} />
        )}
        {participant.isMe && (
          <View style={styles.meBadge}>
            <Text style={styles.meBadgeText}>Moi</Text>
          </View>
        )}
      </Animated.View>
      {showName && (
        <Text style={[styles.avatarName, { maxWidth: size + 20 }]} numberOfLines={1}>
          {participant.name}
        </Text>
      )}
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
  const screenBg = useStore(s => s.screenBackgrounds?.['salon'] ?? '#FFF8E7');
  const { width, height } = useWindowDimensions();

  // Détection de l'orientation - plus fiable
  const isLandscape = width > height;

  // Debug orientation
  console.log(`📱 Orientation: ${isLandscape ? 'PAYSAGE' : 'PORTRAIT'} (${width}x${height})`);

  const flatListRef = useRef<FlatList>(null);
  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  // Récupérer le salon
  const rawSalonId = params.id as string;
  const salonId = rawSalonId === 'cafe-paris' ? 'cafe_paris' : (rawSalonId || 'cafe_paris');
  const salon = salonsData.find(s => s.id === salonId);

  // États
  const [messageInput, setMessageInput] = useState('');
  const [showOfferingsModal, setShowOfferingsModal] = useState(false);
  const [showPowersModal, setShowPowersModal] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<SalonParticipant | null>(null);

  // Menu radial
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    anchor: { x: number; y: number } | null;
    user: (SalonParticipant & { isMe?: boolean }) | null;
  }>({ visible: false, anchor: null, user: null });

  const openRadialMenu = (
    p: SalonParticipant & { isMe?: boolean },
    cx: number,
    cy: number
  ) => setMenuState({ visible: true, anchor: { x: cx, y: cy }, user: p });

  const closeMenu = () =>
    setMenuState({ visible: false, anchor: null, user: null });

  // Actions disponibles dans le menu radial (ordre = position fixe)
  // index 0 → gauche (Profil), index 1 → haut (Magie), index 2 → droite (Offrir)
  const SALON_ACTIONS: RadialAction[] = [
    { id: 'profile', icon: '👀', label: 'Profil'  },
    { id: 'magic',   icon: '✨', label: 'Magie'   },
    { id: 'gift',    icon: '🎁', label: 'Offrir'  },
  ];

  // URL de l'avatar sélectionné pour l'afficher au centre du menu
  const selectedAvatarUrl = React.useMemo(() => {
    if (!menuState.user) return undefined;
    const key = menuState.user.name.toLowerCase().replace(/[^a-z]/g, '');
    return (AVATAR_IMAGES[key] ?? AVATAR_IMAGES['default']) + '&size=132';
  }, [menuState.user]);

  const handleRadialAction = (action: RadialAction) => {
    const user = menuState.user;
    closeMenu();
    if (!user) return;
    switch (action.id) {
      case 'gift':
        setSelectedPlayer(user);
        setShowOfferingsModal(true);
        break;
      case 'magic':
        setSelectedPlayer(user);
        setShowPowersModal(true);
        break;
      case 'profile':
        router.push(`/profile/${user.id}` as any);
        break;
    }
  };
  const [recentInteractions, setRecentInteractions] = useState<Array<{
    id: string;
    from: string;
    to: string;
    emoji: string;
    name: string;
    timestamp: number;
  }>>([]);

  // Participants
  const [participants, setParticipants] = useState<(SalonParticipant & { isMe?: boolean })[]>([]);

  useEffect(() => {
    if (salon) {
      setParticipants([
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
      ]);
    }
  }, [salon, currentUser]);

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

    setParticipants(prev => prev.map(p => {
      if (p.id === selectedPlayer.id) {
        return {
          ...p,
          offerings: [...(p.offerings || []), { emoji: item.emoji, from: currentUser?.name || 'Vous', timestamp: Date.now() }].slice(-6),
        };
      }
      return p;
    }));

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
      content: `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} à ${selectedPlayer.name}!`,
      text: `${currentUser?.name || 'Vous'} a envoyé ${item.emoji} à ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      type: 'offering',
      isSystem: true,
      giftData: item,
    };
    addMessage(salonId, sysMsg);

    setShowOfferingsModal(false);
    setSelectedPlayer(null);
  };

  // Envoyer un pouvoir
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
      <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        <Text style={styles.errorText}>Salon introuvable</Text>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backLink}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Portrait : petits avatars fixes dans le strip
  const AVATAR_STRIP_SIZE = 54;
  // Paysage : 2 colonnes dans la zone gauche
  const avatarSizeLandscape = Math.min(88, (height - 180) / 2.5);

  // Participants découpés en rangées de 2
  const participantRows = [participants.slice(0, 2), participants.slice(2, 4)].filter(r => r.length > 0);

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
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerEmoji}>{salon.icon}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>{salon.name}</Text>
        </View>
        <View style={styles.coinsDisplay}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Strip compact — une seule ligne d'avatars, tous alignés */}
      <View style={styles.participantStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.participantsRow}
          bounces={false}
        >
          {participants.map((p) => (
            <View key={p.id} style={styles.participantItem}>
              <SalonAvatar
                participant={p}
                size={AVATAR_STRIP_SIZE}
                isSelected={menuState.user?.id === p.id}
                showBadges={false}
                onMeasuredPress={undefined}
              />
            </View>
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
      <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
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
    <View style={[styles.landscapeContainer, { paddingTop: insets.top, paddingLeft: insets.left, paddingRight: insets.right }]}>
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
        <Text style={styles.landscapeTitle}>{salon.icon} {salon.name}</Text>
        <Text style={styles.coinsText}>💰 {coins}</Text>
      </LinearGradient>

      <View style={styles.landscapeContent}>
        {/* Zone des avatars (gauche) - GRANDE */}
        <View style={styles.avatarsZone}>
          <Text style={styles.tapHintLandscape}>Appuie sur un avatar 👆</Text>
          {/* Grille 2×2 en paysage */}
          <View style={styles.avatarsGrid}>
            {participantRows.map((row, ri) => (
              <View key={ri} style={styles.avatarsGridRow}>
                {row.map((p) => (
                  <View key={p.id} style={styles.avatarGridItem}>
                    <SalonAvatar
                      participant={p}
                      size={avatarSizeLandscape}
                      isSelected={menuState.user?.id === p.id}
                      showBadges={true}
                      onMeasuredPress={!p.isMe ? openRadialMenu : undefined}
                    />
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>

        {/* Zone des interactions (droite) */}
        <View style={styles.interactionsZone}>
          <Text style={styles.interactionsTitle}>📜 INTERACTIONS RÉCENTES</Text>

          <ScrollView style={styles.interactionsList} showsVerticalScrollIndicator={false}>
            {recentInteractions.length === 0 ? (
              <Text style={styles.noInteractions}>Aucune interaction récente{'\n'}Appuie sur un avatar pour offrir ou lancer de la magie!</Text>
            ) : (
              recentInteractions.map((interaction) => (
                <View key={interaction.id} style={styles.interactionItem}>
                  <Text style={styles.interactionEmoji}>{interaction.emoji}</Text>
                  <Text style={styles.interactionText}>
                    <Text style={styles.interactionFrom}>{interaction.from}</Text>
                    {' → '}
                    <Text style={styles.interactionTo}>{interaction.to}</Text>
                  </Text>
                </View>
              ))
            )}
          </ScrollView>
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
        <View style={[styles.modalContent, { maxHeight: isLandscape ? '90%' : '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>🎁 Offrir à {selectedPlayer?.name}</Text>
            <TouchableOpacity onPress={() => setShowOfferingsModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.offeringsGrid} contentContainerStyle={styles.offeringsGridContent}>
            {allOfferings.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendOffering(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <View style={styles.offeringInfo}>
                  <Text style={styles.offeringName}>{item.name}</Text>
                  <Text style={styles.offeringCost}>💰 {item.cost}</Text>
                </View>
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
        <View style={[styles.modalContent, { maxHeight: isLandscape ? '90%' : '70%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✨ Magie sur {selectedPlayer?.name}</Text>
            <TouchableOpacity onPress={() => setShowPowersModal(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.offeringsGrid} contentContainerStyle={styles.offeringsGridContent}>
            {allPowers.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.offeringItem}
                onPress={() => handleSendPower(item)}
              >
                <Text style={styles.offeringEmoji}>{item.emoji}</Text>
                <View style={styles.offeringInfo}>
                  <Text style={styles.offeringName}>{item.name}</Text>
                  <Text style={styles.offeringCost}>💰 {item.cost}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      {isLandscape ? renderLandscapeMode() : renderPortraitMode()}
      {renderOfferingsModal()}
      {renderPowersModal()}
      <AvatarRadialMenu
        visible={menuState.visible && isLandscape}
        anchor={menuState.anchor}
        actions={SALON_ACTIONS}
        onClose={closeMenu}
        onActionPress={handleRadialAction}
        avatarUrl={selectedAvatarUrl}
      />
    </View>
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
    fontSize: 22,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
    maxWidth: 150,
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

  // Portrait strip — ligne compacte, avatars petits et uniformes
  participantStrip: {
    backgroundColor: '#FFF',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  participantsRow: {
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingHorizontal: 8,
  },
  participantItem: {
    alignItems: 'center',
    padding: 4,
    borderRadius: 12,
  },
  participantSelected: {
    backgroundColor: 'rgba(102, 126, 234, 0.1)',
  },
  selectedHint: {
    textAlign: 'center',
    fontSize: 12,
    color: '#667eea',
    fontWeight: '600',
    marginTop: 8,
  },

  // Avatar
  avatarWrapper: {
    alignItems: 'center',
  },
  avatarContainer: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 4,
  },
  avatarSelected: {
    borderColor: '#FFD700',
    borderWidth: 4,
    shadowColor: '#FFD700',
    shadowOpacity: 0.4,
  },
  avatarImage: {
    backgroundColor: '#E8E8E8',
  },
  onlineDot: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: '#FFF',
  },
  meBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: '#667eea',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  meBadgeText: {
    fontSize: 10,
    color: '#FFF',
    fontWeight: '700',
  },
  avatarName: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 6,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 4,
  },
  badgeEmoji: {
    fontSize: 14,
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
    textAlign: 'center',
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
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F5F0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  actionButtonDisabled: {
    opacity: 0.5,
  },
  actionEmoji: {
    fontSize: 22,
  },
  textInput: {
    flex: 1,
    height: 44,
    backgroundColor: '#F5F0E6',
    borderRadius: 22,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#3A2818',
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#667eea',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendText: {
    fontSize: 22,
    color: '#FFF',
    fontWeight: '600',
  },

  // ============================================
  // LANDSCAPE MODE
  // ============================================
  landscapeContainer: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  landscapeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  landscapeTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  landscapeContent: {
    flex: 1,
    flexDirection: 'row',
  },

  // Zone avatars (gauche) — grille 2×2
  avatarsZone: {
    flex: 1.5,
    padding: 16,
    justifyContent: 'center',
    backgroundColor: '#FFF8E7',
  },
  avatarsGrid: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  avatarsGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
  },
  avatarGridItem: {
    alignItems: 'center',
    flex: 1,
  },

  // Zone interactions (droite)
  interactionsZone: {
    flex: 1,
    backgroundColor: '#FFF',
    borderLeftWidth: 2,
    borderLeftColor: '#E8D5B7',
    padding: 12,
  },
  interactionsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#8B6F47',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  interactionsList: {
    flex: 1,
  },
  noInteractions: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 20,
    lineHeight: 18,
  },
  interactionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F0E6',
  },
  interactionEmoji: {
    fontSize: 18,
    marginRight: 10,
  },
  interactionText: {
    fontSize: 12,
    color: '#5D4037',
    flex: 1,
  },
  interactionFrom: {
    fontWeight: '700',
    color: '#667eea',
  },
  interactionTo: {
    fontWeight: '700',
    color: '#E91E63',
  },

  selectedBanner: {
    backgroundColor: '#667eea',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 8,
    alignItems: 'center',
  },
  selectedBannerText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },

  actionButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  bigActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginHorizontal: 4,
  },
  bigActionButtonDisabled: {
    opacity: 0.5,
  },
  giftButton: {
    backgroundColor: '#FF6B6B',
  },
  magicButton: {
    backgroundColor: '#9C27B0',
  },
  bigActionEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  bigActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },

  // ============================================
  // MODALS
  // ============================================
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
    padding: 4,
  },
  offeringsGrid: {
    padding: 12,
  },
  offeringsGridContent: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  offeringItem: {
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F0E6',
    padding: 12,
    borderRadius: 12,
    marginBottom: 10,
  },
  offeringEmoji: {
    fontSize: 28,
    marginRight: 10,
  },

  // Hint tap
  participantHint: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAA',
    marginBottom: 6,
    fontStyle: 'italic',
  },
  tapHintLandscape: {
    textAlign: 'center',
    fontSize: 11,
    color: '#AAA',
    marginBottom: 8,
    fontStyle: 'italic',
  },

  // Menu d'action (bottom sheet)
  actionMenuContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
  },
  actionMenuHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#DDD',
    alignSelf: 'center',
    marginBottom: 16,
  },
  actionMenuTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    textAlign: 'center',
    marginBottom: 20,
  },
  actionMenuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5E6',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FFD899',
  },
  actionMenuButtonMagic: {
    backgroundColor: '#F3E8FF',
    borderColor: '#D4AAFF',
  },
  actionMenuEmoji: {
    fontSize: 32,
    marginRight: 14,
  },
  actionMenuLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 2,
  },
  actionMenuSub: {
    fontSize: 12,
    color: '#999',
  },
  actionMenuCancel: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
  },
  actionMenuCancelText: {
    fontSize: 15,
    color: '#999',
    fontWeight: '600',
  },
  offeringInfo: {
    flex: 1,
  },
  offeringName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#3A2818',
    marginBottom: 2,
  },
  offeringCost: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DAA520',
  },
});
