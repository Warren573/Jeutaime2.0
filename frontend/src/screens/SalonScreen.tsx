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
  useWindowDimensions,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { salonsData, SalonParticipant } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';
import { offerRegistry, V1_OFFERS } from '../avatar/config/offerRegistry';
import { magicRegistry } from '../avatar/config/magicRegistry';
import { transformationRegistry } from '../avatar/config/transformationRegistry';
import { durationToMs } from '../avatar/config/magicRegistry';
import type { MagicType, OfferType, TransformationType, OfferEvent } from '../avatar/types/avatarTypes';
import { SalonAvatarCard } from '../avatar/components/SalonAvatarCard';
import AvatarRadialMenu, { RadialAction } from '../components/AvatarRadialMenu';
import { MOCK_PROFILE_AVATARS, MOCK_AVATAR_DEFAULT } from '../avatar/data/mockAvatars';

// ── Types ─────────────────────────────────────────────────────────────────────

type ParticipantEffect = {
  magic?:                  MagicType | null;
  magicExpiresAt?:         number;
  transformation?:         TransformationType | null;
  transformationExpiresAt?: number;
};

// ============================================
// COMPOSANT PRINCIPAL SALON
// ============================================
export default function SalonScreen() {
  const router    = useRouter();
  const params    = useLocalSearchParams();
  const insets    = useSafeAreaInsets();
  const screenBg  = useStore(s => s.screenBackgrounds?.['salon'] ?? '#FFF8E7');
  const { width, height } = useWindowDimensions();

  const isLandscape = width > height;

  const flatListRef = useRef<FlatList>(null);
  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  // Récupérer le salon
  const rawSalonId = params.id as string;
  const salonId    = rawSalonId === 'cafe-paris' ? 'cafe_paris' : (rawSalonId || 'cafe_paris');
  const salon      = salonsData.find(s => s.id === salonId);

  // ── Effets par participant ─────────────────────────────────────────────────
  const [participantEffects, setParticipantEffects] =
    useState<Record<string, ParticipantEffect>>({});

  const applyMagic = useCallback((participantId: string, type: MagicType) => {
    const def = magicRegistry[type];
    setParticipantEffects(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        magic:          type,
        magicExpiresAt: Date.now() + durationToMs(def.duration),
      },
    }));
  }, []);

  const applyTransformation = useCallback((participantId: string, type: TransformationType) => {
    const def = transformationRegistry[type];
    setParticipantEffects(prev => ({
      ...prev,
      [participantId]: {
        ...prev[participantId],
        transformation:          type,
        transformationExpiresAt: Date.now() + durationToMs(def.duration),
      },
    }));
  }, []);

  // États UI
  const [messageInput,    setMessageInput]    = useState('');
  const [showMagicModal,  setShowMagicModal]  = useState(false);
  const [selectedPlayer,  setSelectedPlayer]  = useState<SalonParticipant | null>(null);
  const [magicTab,        setMagicTab]        = useState<'magic' | 'transformation'>('magic');

  // Menu radial
  const [menuState, setMenuState] = useState<{
    visible: boolean;
    anchor:  { x: number; y: number } | null;
    user:    (SalonParticipant & { isMe?: boolean }) | null;
  }>({ visible: false, anchor: null, user: null });

  const [avatarsZoneWidth, setAvatarsZoneWidth] = useState<number | undefined>(undefined);

  const openRadialMenu = (
    p: SalonParticipant & { isMe?: boolean },
    cx: number,
    cy: number,
  ) => {
    setMenuState({ visible: true, anchor: { x: cx, y: cy }, user: p });
  };

  const closeMenu = () =>
    setMenuState({ visible: false, anchor: null, user: null });

  // Radial : Profil + Magie uniquement (offrandes inline dans SalonAvatarCard)
  const SALON_ACTIONS: RadialAction[] = [
    { id: 'profile', icon: '👀', label: 'Profil' },
    { id: 'magic',   icon: '✨', label: 'Magie'  },
  ];

  const handleRadialAction = (action: RadialAction) => {
    const user = menuState.user;
    closeMenu();
    if (!user) return;
    switch (action.id) {
      case 'magic':
        setSelectedPlayer(user);
        setMagicTab('magic');
        setShowMagicModal(true);
        break;
      case 'profile':
        router.push(`/profile/${user.id}` as any);
        break;
    }
  };

  const [recentInteractions, setRecentInteractions] = useState<Array<{
    id:        string;
    from:      string;
    to:        string;
    emoji:     string;
    name:      string;
    timestamp: number;
  }>>([]);

  // Participants
  const [participants, setParticipants] =
    useState<(SalonParticipant & { isMe?: boolean })[]>([]);

  useEffect(() => {
    if (salon) {
      setParticipants([
        ...salon.participants,
        {
          id:     'me',
          name:   currentUser?.name || 'Vous',
          gender: currentUser?.gender || 'M',
          age:    currentUser?.age || 25,
          online: true,
          isMe:   true,
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
      id:        Date.now().toString(),
      salonId,
      userId:    currentUser?.id || 'me',
      userName:  currentUser?.name || 'Vous',
      username:  currentUser?.name || 'Vous',
      content:   messageInput.trim(),
      text:      messageInput.trim(),
      timestamp: Date.now(),
      type:      'message',
    };
    addMessage(salonId, newMessage);
    setMessageInput('');
    scrollToEnd();
  };

  // Callback offrande depuis SalonAvatarCard
  const handleSendOffer = useCallback((
    participantId: string,
    participantName: string,
    event: OfferEvent,
  ) => {
    const item = offerRegistry[event.type];
    if (!item) return;
    if (!removeCoins(item.cost)) {
      alert('Pas assez de pièces!');
      return;
    }

    setRecentInteractions(prev => [{
      id:        event.id,
      from:      currentUser?.name || 'Vous',
      to:        participantName,
      emoji:     item.emoji,
      name:      item.label,
      timestamp: Date.now(),
    }, ...prev].slice(0, 10));

    addMessage(salonId, {
      id:        event.id + '_msg',
      salonId,
      userId:    'system',
      userName:  'Système',
      username:  'Système',
      content:   `${currentUser?.name || 'Vous'} a offert ${item.emoji} à ${participantName}!`,
      text:      `${currentUser?.name || 'Vous'} a offert ${item.emoji} à ${participantName}!`,
      timestamp: Date.now(),
      type:      'offering',
      isSystem:  true,
      giftData:  { emoji: item.emoji, from: currentUser?.name || 'Vous' },
    } as Message);
  }, [currentUser, removeCoins, addMessage, salonId]);

  // Appliquer magie depuis la modale
  const handleApplyMagic = (type: MagicType) => {
    if (!selectedPlayer) return;
    const def = magicRegistry[type];
    if (!removeCoins(def.cost)) {
      alert('Pas assez de pièces!');
      return;
    }
    applyMagic(selectedPlayer.id, type);

    addMessage(salonId, {
      id:        Date.now().toString(),
      salonId,
      userId:    'system',
      userName:  'Système',
      username:  'Système',
      content:   `${currentUser?.name || 'Vous'} a lancé ${def.emoji} sur ${selectedPlayer.name}!`,
      text:      `${currentUser?.name || 'Vous'} a lancé ${def.emoji} sur ${selectedPlayer.name}!`,
      timestamp: Date.now(),
      type:      'power',
      isSystem:  true,
    } as Message);

    setShowMagicModal(false);
    setSelectedPlayer(null);
  };

  // Appliquer transformation depuis la modale
  const handleApplyTransformation = (type: TransformationType) => {
    if (!selectedPlayer) return;
    const def = transformationRegistry[type];
    if (!removeCoins(def.cost)) {
      alert('Pas assez de pièces!');
      return;
    }
    applyTransformation(selectedPlayer.id, type);

    addMessage(salonId, {
      id:        Date.now().toString(),
      salonId,
      userId:    'system',
      userName:  'Système',
      username:  'Système',
      content:   `${currentUser?.name || 'Vous'} a transformé ${selectedPlayer.name} en ${def.label}!`,
      text:      `${currentUser?.name || 'Vous'} a transformé ${selectedPlayer.name} en ${def.label}!`,
      timestamp: Date.now(),
      type:      'power',
      isSystem:  true,
    } as Message);

    setShowMagicModal(false);
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

  // Portrait : avatars dans le strip
  const AVATAR_STRIP_SIZE = 72;
  // Paysage : grille 2×2
  const avatarSizeLandscape = Math.min(88, (height - 180) / 2.5);

  // Participants découpés en rangées de 2 (mode paysage)
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

      {/* Strip compact — une seule ligne d'avatars */}
      <View style={styles.participantStrip}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.participantsRow}
          bounces={false}
        >
          {participants.map((p) => {
            const effects = participantEffects[p.id] ?? {};
            return (
              <View key={p.id} style={styles.participantItem}>
                <SalonAvatarCard
                  avatar={MOCK_PROFILE_AVATARS[p.id] ?? MOCK_AVATAR_DEFAULT}
                  name={p.name}
                  isOnline={p.online}
                  transformation={effects.transformation ?? null}
                  transformationExpiresAt={effects.transformationExpiresAt}
                  magic={effects.magic ?? null}
                  magicExpiresAt={effects.magicExpiresAt}
                  size={AVATAR_STRIP_SIZE}
                  availableOffers={p.isMe ? [] : V1_OFFERS.filter(t => (offerRegistry[t]?.cost ?? 0) <= coins)}
                  onSendOffer={p.isMe ? undefined : (event) => handleSendOffer(p.id, p.name, event)}
                />
                {!p.isMe && (
                  <TouchableOpacity
                    style={styles.magicChip}
                    onPress={() => openRadialMenu(p, 0, 0)}
                  >
                    <Text style={styles.magicChipText}>✨</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
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
          const isOwn   = item.userId === 'me' || item.userId === currentUser?.id;
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
        {/* Zone des avatars (gauche) - grille 2×2 */}
        <View style={styles.avatarsZone} onLayout={e => setAvatarsZoneWidth(e.nativeEvent.layout.width)}>
          <Text style={styles.tapHintLandscape}>Appuie sur un avatar 👆</Text>
          <View style={styles.avatarsGrid}>
            {participantRows.map((row, ri) => (
              <View key={ri} style={styles.avatarsGridRow}>
                {row.map((p) => {
                  const effects = participantEffects[p.id] ?? {};
                  return (
                    <View key={p.id} style={styles.avatarGridItem}>
                      <SalonAvatarCard
                        avatar={MOCK_PROFILE_AVATARS[p.id] ?? MOCK_AVATAR_DEFAULT}
                        name={p.name}
                        isOnline={p.online}
                        transformation={effects.transformation ?? null}
                        transformationExpiresAt={effects.transformationExpiresAt}
                        magic={effects.magic ?? null}
                        magicExpiresAt={effects.magicExpiresAt}
                        size={avatarSizeLandscape}
                        availableOffers={p.isMe ? [] : V1_OFFERS.filter(t => (offerRegistry[t]?.cost ?? 0) <= coins)}
                        onSendOffer={p.isMe ? undefined : (event) => handleSendOffer(p.id, p.name, event)}
                      />
                      {!p.isMe && (
                        <TouchableOpacity
                          style={styles.magicChip}
                          onPress={() => openRadialMenu(p, 0, 0)}
                        >
                          <Text style={styles.magicChipText}>✨</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            ))}
          </View>
        </View>

        {/* Zone des interactions (droite) */}
        <View style={styles.interactionsZone}>
          <Text style={styles.interactionsTitle}>📜 INTERACTIONS RÉCENTES</Text>

          <ScrollView style={styles.interactionsList} showsVerticalScrollIndicator={false}>
            {recentInteractions.length === 0 ? (
              <Text style={styles.noInteractions}>Aucune interaction récente{'\n'}Appuie sur un avatar!</Text>
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
  // MODAL MAGIE + TRANSFORMATIONS (2 onglets)
  // ============================================
  const renderMagicModal = () => (
    <Modal visible={showMagicModal} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { maxHeight: isLandscape ? '90%' : '75%' }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✨ Magie sur {selectedPlayer?.name}</Text>
            <TouchableOpacity onPress={() => { setShowMagicModal(false); setSelectedPlayer(null); }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Onglets */}
          <View style={styles.tabBar}>
            <TouchableOpacity
              style={[styles.tabBtn, magicTab === 'magic' && styles.tabBtnActive]}
              onPress={() => setMagicTab('magic')}
            >
              <Text style={[styles.tabBtnText, magicTab === 'magic' && styles.tabBtnTextActive]}>
                ✨ Magie
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tabBtn, magicTab === 'transformation' && styles.tabBtnActive]}
              onPress={() => setMagicTab('transformation')}
            >
              <Text style={[styles.tabBtnText, magicTab === 'transformation' && styles.tabBtnTextActive]}>
                🎭 Transformations
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.offeringsGrid} contentContainerStyle={styles.offeringsGridContent}>
            {magicTab === 'magic'
              ? (Object.entries(magicRegistry) as [MagicType, typeof magicRegistry[MagicType]][]).map(([type, def]) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.offeringItem}
                    onPress={() => handleApplyMagic(type)}
                  >
                    <Text style={styles.offeringEmoji}>{def.emoji}</Text>
                    <View style={styles.offeringInfo}>
                      <Text style={styles.offeringName}>{def.label}</Text>
                      <Text style={styles.offeringCost}>💰 {def.cost}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              : (Object.entries(transformationRegistry) as [TransformationType, typeof transformationRegistry[TransformationType]][]).map(([type, def]) => (
                  <TouchableOpacity
                    key={type}
                    style={styles.offeringItem}
                    onPress={() => handleApplyTransformation(type)}
                  >
                    <Text style={styles.offeringEmoji}>{def.emoji}</Text>
                    <View style={styles.offeringInfo}>
                      <Text style={styles.offeringName}>{def.label}</Text>
                      <Text style={styles.offeringCost}>💰 {def.cost}</Text>
                    </View>
                  </TouchableOpacity>
                ))
            }
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={{ flex: 1 }}>
      {isLandscape ? renderLandscapeMode() : renderPortraitMode()}
      {renderMagicModal()}

      <AvatarRadialMenu
        visible={menuState.visible}
        anchor={menuState.anchor}
        actions={SALON_ACTIONS}
        onClose={closeMenu}
        onActionPress={handleRadialAction}
        maxX={avatarsZoneWidth}
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

  // Portrait strip
  participantStrip: {
    backgroundColor: '#FFF',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
    overflow: 'visible',
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
  magicChip: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: 'rgba(156,39,176,0.12)',
    borderRadius: 10,
  },
  magicChipText: {
    fontSize: 12,
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
  tapHintLandscape: {
    fontSize: 12,
    color: '#8B6F47',
    textAlign: 'center',
    marginBottom: 8,
    fontStyle: 'italic',
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
    paddingBottom: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D8',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#2A1A0E',
  },
  modalClose: {
    fontSize: 20,
    color: '#8B6F47',
    padding: 4,
  },

  // Onglets
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0E8D8',
    marginHorizontal: 16,
    marginTop: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#9C27B0',
  },
  tabBtnText: {
    fontSize: 14,
    color: '#8B6F47',
    fontWeight: '500',
  },
  tabBtnTextActive: {
    color: '#9C27B0',
    fontWeight: '700',
  },

  offeringsGrid: {
    marginTop: 4,
  },
  offeringsGridContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  offeringItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF8F0',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E8D8',
  },
  offeringEmoji: {
    fontSize: 28,
    marginRight: 14,
  },
  offeringInfo: {
    flex: 1,
  },
  offeringName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2A1A0E',
    marginBottom: 2,
  },
  offeringCost: {
    fontSize: 13,
    color: '#8B6F47',
  },
});
