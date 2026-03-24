/**
 * SalonDetailScreen
 *
 * Deux expériences produit distinctes :
 *  - VERTICAL  → chat social avec fil de messages
 *  - HORIZONTAL → présence + interactions (offrandes/magie), zéro chat
 */

import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
  ScrollView,
  Modal,
  Easing,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { allOfferings, allPowers, metalOfferings, metalPowers } from '../data/offerings';
import { salonsData } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SCREEN_W } = Dimensions.get('window');

const COLORS = {
  bg: '#F7F7F8',
  white: '#FFFFFF',
  border: '#E5E5EA',
  text: '#111111',
  textSecondary: '#8E8E93',
  online: '#34C759',
  offline: '#C7C7CC',
  bubble: '#F0F0F0',
  ownBubble: '#007AFF',
};

const AVATAR_PALETTE = [
  '#5AC8FA', '#34C759', '#FF9500', '#FF3B30',
  '#AF52DE', '#FF2D55', '#5856D6', '#007AFF',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
}

function initials(name: string): string {
  return name.split(' ').map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2);
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  isMe?: boolean;
  badges: { id: string; emoji: string }[];   // gifts / effects received
  avatarConfig?: { skinColor: string; expression: string; accessory?: string };
}

interface GiftFlight {
  id: string;
  emoji: string;
  anim: Animated.Value;
  from: { x: number; y: number };
  to: { x: number; y: number };
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

// ── HeaderBar ─────────────────────────────────────────────────────────────────

function HeaderBar({
  title,
  icon,
  coins,
  gradient,
  paddingTop,
  onBack,
}: {
  title: string;
  icon: string;
  coins: number;
  gradient: [string, string];
  paddingTop: number;
  onBack?: () => void;
}) {
  return (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{ paddingTop: paddingTop + 4, paddingBottom: 12, paddingHorizontal: 16 }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
        >
          <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '400' }}>‹</Text>
        </TouchableOpacity>

        <Text style={s.headerTitle} numberOfLines={1}>
          {icon} {title}
        </Text>

        <View style={s.coinsBadge}>
          <Text style={s.coinsText}>💰 {coins}</Text>
        </View>
      </View>
    </LinearGradient>
  );
}

// ── ParticipantAvatar ─────────────────────────────────────────────────────────

function ParticipantAvatar({
  participant,
  size = 44,
  showName = true,
  onPress,
}: {
  participant: Participant;
  size?: number;
  showName?: boolean;
  onPress?: () => void;
}) {
  const bg = nameColor(participant.name);
  const dotSize = Math.max(size * 0.22, 8);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
      style={{ alignItems: 'center', gap: 5 }}
    >
      <View style={{ position: 'relative' }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: participant.avatarConfig?.skinColor ?? bg,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {participant.avatarConfig ? (
            <>
              <Text style={{ fontSize: size * 0.5 }}>{participant.avatarConfig.expression}</Text>
              {!!participant.avatarConfig.accessory && (
                <Text style={{ position: 'absolute', fontSize: size * 0.28, top: 0, right: 0 }}>
                  {participant.avatarConfig.accessory}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ fontSize: size * 0.35, fontWeight: '600', color: '#FFF' }}>
              {initials(participant.name)}
            </Text>
          )}
        </View>
        {/* Online dot */}
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: participant.isOnline ? COLORS.online : COLORS.offline,
            borderWidth: 2,
            borderColor: '#FFF',
          }}
        />
        {participant.isMe && (
          <View style={[s.meBadge, { top: -(dotSize / 2), left: -(dotSize / 2) }]}>
            <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>Moi</Text>
          </View>
        )}
      </View>

      {showName && (
        <Text style={[s.avatarName, { maxWidth: size + 20 }]} numberOfLines={1}>
          {participant.name}
        </Text>
      )}
    </TouchableOpacity>
  );
}

// ── InputBar ──────────────────────────────────────────────────────────────────

function InputBar({
  value,
  onChange,
  onSend,
  onOffrandes,
  onMagie,
  paddingBottom,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onOffrandes: () => void;
  onMagie: () => void;
  paddingBottom: number;
}) {
  return (
    <View style={[s.inputBar, { paddingBottom: Math.max(paddingBottom, 10) }]}>
      {/* Action buttons — small, non-dominant */}
      <TouchableOpacity onPress={onOffrandes} style={s.actionIconBtn}>
        <Text style={{ fontSize: 16 }}>🎁</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onMagie} style={s.actionIconBtn}>
        <Text style={{ fontSize: 16 }}>✨</Text>
      </TouchableOpacity>

      {/* Text field */}
      <TextInput
        style={s.textInput}
        placeholder="Message…"
        placeholderTextColor={COLORS.textSecondary}
        value={value}
        onChangeText={onChange}
        onSubmitEditing={onSend}
        returnKeyType="send"
        multiline={false}
      />

      {/* Send button */}
      <TouchableOpacity
        onPress={onSend}
        disabled={!value.trim()}
        style={[s.sendBtn, { backgroundColor: value.trim() ? COLORS.ownBubble : COLORS.border }]}
      >
        <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '600' }}>↑</Text>
      </TouchableOpacity>
    </View>
  );
}

// ── InteractionBadge ──────────────────────────────────────────────────────────

function InteractionBadge({ emoji }: { emoji: string }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, damping: 12 }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ scale }] }}>
      <Text style={{ fontSize: 18 }}>{emoji}</Text>
    </Animated.View>
  );
}

// ── OfferingsModal ────────────────────────────────────────────────────────────

function OfferingsModal({
  visible,
  onClose,
  participants,
  myName,
  coins,
  isMetal,
  onSend,
  defaultRecipient,
  defaultTab = 'offrandes',
}: {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  myName: string;
  coins: number;
  isMetal: boolean;
  onSend: (recipient: Participant, item: any) => void;
  defaultRecipient?: Participant | null;
  defaultTab?: 'offrandes' | 'magie';
}) {
  const [recipient, setRecipient] = useState<Participant | null>(null);
  const [tab, setTab] = useState<'offrandes' | 'magie'>('offrandes');

  useEffect(() => {
    if (visible) {
      setRecipient(defaultRecipient ?? null);
      setTab(defaultTab);
    }
  }, [visible, defaultRecipient, defaultTab]);

  const others = participants.filter(p => !p.isMe);
  const offerings = isMetal ? [...allOfferings, ...metalOfferings] : allOfferings;
  const powers = isMetal ? [...allPowers, ...metalPowers] : allPowers;

  const ItemRow = ({ items, label }: { items: any[]; label: string }) => {
    if (!items.length) return null;
    return (
      <View style={{ marginBottom: 20 }}>
        <Text style={s.modalSection}>{label}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
          {items.map((item: any) => {
            const disabled = !recipient || coins < item.cost;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => recipient && onSend(recipient, item)}
                disabled={disabled}
                style={[s.modalItem, { opacity: disabled ? 0.4 : 1 }]}
              >
                <Text style={{ fontSize: 22 }}>{item.emoji}</Text>
                <Text style={s.modalItemName} numberOfLines={2}>{item.name}</Text>
                <Text style={s.modalItemCost}>{item.cost}💰</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.modalOverlay}>
        <View style={s.modalSheet}>
          {/* Handle */}
          <View style={s.modalHandle} />

          {/* Title */}
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>
              {recipient ? `Envoyer à ${recipient.name}` : 'Choisir un destinataire'}
            </Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={{ fontSize: 22, color: COLORS.textSecondary }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Recipients */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 16, paddingBottom: 4 }}>
            {others.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setRecipient(p)} style={{ alignItems: 'center', gap: 4 }}>
                <View style={[
                  s.recipientRing,
                  { borderColor: recipient?.id === p.id ? COLORS.ownBubble : 'transparent' },
                ]}>
                  <ParticipantAvatar participant={p} size={42} showName={false} />
                </View>
                <Text style={[s.avatarName, { color: recipient?.id === p.id ? COLORS.ownBubble : COLORS.textSecondary }]}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Tabs */}
          <View style={s.tabRow}>
            {(['offrandes', 'magie'] as const).map(t => (
              <TouchableOpacity key={t} onPress={() => setTab(t)} style={[s.tabBtn, tab === t && s.tabBtnActive]}>
                <Text style={[s.tabLabel, tab === t && s.tabLabelActive]}>
                  {t === 'offrandes' ? '🎁 Offrandes' : '✨ Magie'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Items */}
          <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
            {tab === 'offrandes' ? (
              <>
                <ItemRow items={offerings.filter(o => o.category === 'boisson')} label="🥂 Boissons" />
                <ItemRow items={offerings.filter(o => o.category === 'nourriture')} label="🍽 Nourriture" />
                <ItemRow items={offerings.filter(o => o.category === 'symbolique')} label="💌 Symbolique" />
                <ItemRow items={offerings.filter(o => o.category === 'humour')} label="😄 Humour" />
              </>
            ) : (
              <ItemRow items={powers} label="🪄 Pouvoirs" />
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ── GiftAnimation ─────────────────────────────────────────────────────────────

function GiftAnimation({ flights }: { flights: GiftFlight[] }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flights.map(f => {
        const left = f.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [f.from.x, f.to.x],
        });
        const top = f.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [f.from.y, f.to.y],
        });
        const opacity = f.anim.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const scale = f.anim.interpolate({
          inputRange: [0, 0.4, 1],
          outputRange: [0.8, 1.3, 0.9],
        });
        return (
          <Animated.View
            key={f.id}
            style={{ position: 'absolute', left, top, opacity, transform: [{ scale }] }}
          >
            <Text style={{ fontSize: 24 }}>{f.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// VERTICAL SALON — chat social avec fil de messages
// ══════════════════════════════════════════════════════════════════════════════

// Rangée de participants — toujours visible sous le header
function ParticipantStrip({
  participants,
  onPress,
}: {
  participants: Participant[];
  onPress: (p: Participant) => void;
}) {
  return (
    <View style={s.strip}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.stripContent}
        bounces={false}
      >
        {participants.map(p => (
          <ParticipantAvatar
            key={p.id}
            participant={p}
            size={40}
            showName
            onPress={!p.isMe ? () => onPress(p) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// Bulle de message dans le salon vertical
function ChatMessage({
  message,
  isOwn,
  sender,
}: {
  message: Message;
  isOwn: boolean;
  sender: Participant | undefined;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, []);

  if (message.isSystem) {
    return (
      <Animated.View style={[s.systemRow, { opacity }]}>
        <Text style={s.systemText}>
          {message.giftData?.emoji ? `${message.giftData.emoji}  ` : ''}
          {message.text ?? message.content}
        </Text>
      </Animated.View>
    );
  }

  const timeStr = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isOwn) {
    return (
      <Animated.View style={[s.ownRow, { opacity }]}>
        <View style={s.ownBubble}>
          <Text style={s.ownBubbleText}>{message.text ?? message.content}</Text>
        </View>
        <Text style={s.timeLabel}>{timeStr}</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[s.otherRow, { opacity }]}>
      {/* Avatar du sender */}
      <View style={s.msgAvatarWrap}>
        {sender ? (
          <View
            style={[
              s.msgAvatar,
              { backgroundColor: nameColor(sender.name) },
            ]}
          >
            <Text style={s.msgAvatarText}>{initials(sender.name)}</Text>
          </View>
        ) : (
          <View style={s.msgAvatar} />
        )}
      </View>

      <View style={{ flexShrink: 1 }}>
        {sender && (
          <Text style={s.senderName}>{sender.name}</Text>
        )}
        <View style={s.otherBubble}>
          <Text style={s.otherBubbleText}>{message.text ?? message.content}</Text>
        </View>
        <Text style={s.timeLabel}>{timeStr}</Text>
      </View>
    </Animated.View>
  );
}

// ── SalonVerticalScreen ───────────────────────────────────────────────────────

function SalonVerticalScreen({
  salon,
  participants,
  messages,
  myName,
  coins,
  messageInput,
  setMessageInput,
  sendMessage,
  openOffrandes,
  giftFlights,
  showOfferings,
  setShowOfferings,
  defaultRecipient,
  handleSendOffering,
  insets,
}: SharedProps) {
  const listRef = useRef<FlatList>(null);
  const router = useRouter();

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages.length]);

  const findSender = (msg: Message): Participant | undefined =>
    participants.find(p => p.name === (msg.username ?? msg.userName));

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <HeaderBar
        title={salon.name}
        icon={salon.icon}
        coins={coins}
        gradient={salon.gradient as [string, string]}
        paddingTop={insets.top}
        onBack={() => router.back()}
      />

      {/* Rangée participants — toujours visible */}
      <ParticipantStrip
        participants={participants}
        onPress={p => openOffrandes(p)}
      />

      {/* Fil de messages */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={scrollToEnd}
        renderItem={({ item }) => (
          <ChatMessage
            message={item}
            isOwn={item.userId === 'me' || (item.username ?? item.userName) === myName}
            sender={findSender(item)}
          />
        )}
        ListEmptyComponent={
          <View style={s.emptyChat}>
            <Text style={s.emptyChatEmoji}>💬</Text>
            <Text style={s.emptyChatText}>Commencez la discussion</Text>
          </View>
        }
      />

      {/* Barre de saisie */}
      <InputBar
        value={messageInput}
        onChange={setMessageInput}
        onSend={sendMessage}
        onOffrandes={() => openOffrandes()}
        onMagie={() => openOffrandes()}
        paddingBottom={insets.bottom}
      />

      <GiftAnimation flights={giftFlights} />

      <OfferingsModal
        visible={showOfferings}
        onClose={() => setShowOfferings(false)}
        participants={participants}
        myName={myName}
        coins={coins}
        isMetal={salon.type === 'metal'}
        onSend={handleSendOffering}
        defaultRecipient={defaultRecipient}
      />
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HORIZONTAL SALON — présence + interactions, zéro chat
// ══════════════════════════════════════════════════════════════════════════════

// Carte d'avatar dans le layout horizontal
function AvatarCard({
  participant,
  size = 68,
  onPress,
  onMeasuredPress,
}: {
  participant: Participant;
  size?: number;
  onPress?: () => void;
  onMeasuredPress?: (p: Participant, cx: number, cy: number) => void;
}) {
  const bg = nameColor(participant.name);
  const dotSize = size * 0.22;
  const cardRef = useRef<View>(null);

  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.04,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const handlePress = () => {
    if (onMeasuredPress) {
      cardRef.current?.measureInWindow(
        (x: number, y: number, w: number, h: number) => {
          onMeasuredPress(participant, x + w / 2, y + h / 2);
        }
      );
    } else {
      onPress?.();
    }
  };

  const badges = participant.badges.slice(-3);

  return (
    <View ref={cardRef}>
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress && !onMeasuredPress}
      activeOpacity={0.75}
      style={{ alignItems: 'center', gap: 8 }}
    >
      <Animated.View style={{ transform: [{ scale }] }}>
        <View
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: participant.avatarConfig?.skinColor ?? bg,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: participant.avatarConfig?.skinColor ?? bg,
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.28,
            shadowRadius: 8,
            elevation: 4,
          }}
        >
          {participant.avatarConfig ? (
            <>
              <Text style={{ fontSize: size * 0.5 }}>{participant.avatarConfig.expression}</Text>
              {!!participant.avatarConfig.accessory && (
                <Text style={{ position: 'absolute', fontSize: size * 0.28, top: 0, right: 0 }}>
                  {participant.avatarConfig.accessory}
                </Text>
              )}
            </>
          ) : (
            <Text style={{ fontSize: size * 0.34, fontWeight: '600', color: '#FFF' }}>
              {initials(participant.name)}
            </Text>
          )}
        </View>
        {/* Online dot */}
        <View
          style={{
            position: 'absolute',
            bottom: 2,
            right: 2,
            width: dotSize,
            height: dotSize,
            borderRadius: dotSize / 2,
            backgroundColor: participant.isOnline ? COLORS.online : COLORS.offline,
            borderWidth: 2.5,
            borderColor: COLORS.white,
          }}
        />
      </Animated.View>

      {/* Name */}
      <Text style={s.cardName} numberOfLines={1}>
        {participant.isMe ? `${participant.name} (moi)` : participant.name}
      </Text>

      {/* Badges — gifts / effects reçus, collés visuellement à l'avatar */}
      <View style={s.badgeRow}>
        {badges.map(b => (
          <InteractionBadge key={b.id} emoji={b.emoji} />
        ))}
        {badges.length === 0 && (
          <View style={{ height: 22 }} />
        )}
      </View>

      {/* Hint tap */}
      {(onPress || onMeasuredPress) && !participant.isMe && (
        <Text style={s.tapHint}>appuyer pour interagir</Text>
      )}
    </TouchableOpacity>
    </View>
  );
}

// ── AvatarContextMenu ─────────────────────────────────────────────────────────

interface MenuState {
  participant: Participant;
  cx: number; // centre X de l'avatar (coordonnées page)
  cy: number; // centre Y de l'avatar (coordonnées page)
}

const MENU_BTN_SIZE = 68;
const MENU_WIDTH = MENU_BTN_SIZE * 2 + 20; // largeur totale du menu (2 boutons + gap)

function AvatarContextMenu({
  state,
  onClose,
  onOffrandes,
  onMagie,
}: {
  state: MenuState;
  onClose: () => void;
  onOffrandes: () => void;
  onMagie: () => void;
}) {
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const scaleO    = useRef(new Animated.Value(0)).current;
  const scaleM    = useRef(new Animated.Value(0)).current;
  const translateO = useRef(new Animated.Value(20)).current;
  const translateM = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.spring(scaleO, { toValue: 1, tension: 220, friction: 10, useNativeDriver: true }),
      Animated.spring(translateO, { toValue: 0, tension: 220, friction: 10, useNativeDriver: true }),
      Animated.spring(scaleM, { toValue: 1, tension: 220, friction: 10, delay: 70, useNativeDriver: true }),
      Animated.spring(translateM, { toValue: 0, tension: 220, friction: 10, delay: 70, useNativeDriver: true }),
    ]).start();
  }, []);

  const dismiss = (cb?: () => void) => {
    Animated.parallel([
      Animated.timing(bgOpacity, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(scaleO, { toValue: 0, duration: 110, useNativeDriver: true }),
      Animated.timing(scaleM, { toValue: 0, duration: 110, useNativeDriver: true }),
    ]).start(() => { onClose(); cb?.(); });
  };

  // Ancre le menu au-dessus de l'avatar, centré sur son axe X
  const left = Math.max(12, Math.min(state.cx - MENU_WIDTH / 2, SCREEN_W - MENU_WIDTH - 12));
  const top  = Math.max(80, state.cy - MENU_BTN_SIZE - 56);

  return (
    <Modal transparent animationType="none" onRequestClose={() => dismiss()}>
      {/* Conteneur plein écran — nécessaire pour que position:absolute s'ancre correctement */}
      <View style={StyleSheet.absoluteFill}>
        {/* Fond semi-transparent — tap pour fermer */}
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={() => dismiss()}
        >
          <Animated.View
            style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)', opacity: bgOpacity }]}
          />
        </TouchableOpacity>

        {/* Menu flottant */}
        <View style={[s.ctxMenu, { left, top }]}>
        {/* Label du destinataire */}
        <View style={s.ctxLabel}>
          <Text style={s.ctxLabelText} numberOfLines={1}>{state.participant.name}</Text>
        </View>

        {/* Deux boutons */}
        <View style={s.ctxBtnRow}>
          {/* Offrandes */}
          <Animated.View style={{ transform: [{ scale: scaleO }, { translateY: translateO }] }}>
            <TouchableOpacity
              style={[s.ctxBtn, { backgroundColor: '#FF9500' }]}
              onPress={() => dismiss(onOffrandes)}
              activeOpacity={0.82}
            >
              <Text style={{ fontSize: 28 }}>🎁</Text>
              <Text style={s.ctxBtnLabel}>Offrandes</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Magie */}
          <Animated.View style={{ transform: [{ scale: scaleM }, { translateY: translateM }] }}>
            <TouchableOpacity
              style={[s.ctxBtn, { backgroundColor: '#5856D6' }]}
              onPress={() => dismiss(onMagie)}
              activeOpacity={0.82}
            >
              <Text style={{ fontSize: 28 }}>✨</Text>
              <Text style={s.ctxBtnLabel}>Magie</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
        {/* Fin ctxBtnRow */}
        </View>
        {/* Fin ctxMenu */}
      </View>
      {/* Fin conteneur absoluteFill */}
    </Modal>
  );
}

// ── SalonHorizontalScreen ─────────────────────────────────────────────────────

function SalonHorizontalScreen({
  salon,
  participants,
  messages,
  myName,
  coins,
  openOffrandes,
  giftFlights,
  showOfferings,
  setShowOfferings,
  defaultRecipient,
  handleSendOffering,
  insets,
}: SharedProps) {
  const router = useRouter();

  // Menu contextuel au tap d'un avatar
  const [menuState, setMenuState] = useState<MenuState | null>(null);
  const [offeringsTab, setOfferingsTab] = useState<'offrandes' | 'magie'>('offrandes');

  // Interactions récentes (offrandes/magie uniquement)
  const interactions = useMemo(
    () => messages.filter(m => m.isSystem).slice(-12).reverse(),
    [messages]
  );

  const others = participants.filter(p => !p.isMe);
  const me = participants.find(p => p.isMe);

  // Grille 2×2 : [other0, other1] / [other2, me]
  const gridRows = useMemo((): (Participant | null)[][] => {
    const slots: (Participant | null)[] = [
      others[0] ?? null,
      others[1] ?? null,
      others[2] ?? null,
      me ?? null,
    ];
    return [slots.slice(0, 2), slots.slice(2, 4)];
  }, [others, me]);

  const openAvatarMenu = (p: Participant, cx: number, cy: number) => {
    setMenuState({ participant: p, cx, cy });
  };

  const openFromMenu = (tab: 'offrandes' | 'magie') => {
    if (!menuState) return;
    setOfferingsTab(tab);
    openOffrandes(menuState.participant);
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.white }}>
      <HeaderBar
        title={salon.name}
        icon={salon.icon}
        coins={coins}
        gradient={salon.gradient as [string, string]}
        paddingTop={insets.top}
        onBack={() => router.back()}
      />

      {/* Zone de présence — grille 2×2 uniforme */}
      <View style={s.presenceArea}>
        {gridRows.map((row, rowIdx) => (
          <View key={rowIdx} style={s.gridRow}>
            {row.map((p, colIdx) => (
              <View key={`${rowIdx}-${colIdx}`} style={s.gridCell}>
                {p ? (
                  <AvatarCard
                    participant={p}
                    size={72}
                    onMeasuredPress={!p.isMe ? openAvatarMenu : undefined}
                  />
                ) : (
                  <View style={{ width: 72, height: 72 }} />
                )}
              </View>
            ))}
          </View>
        ))}
      </View>

      {/* Séparateur */}
      <View style={s.separator} />

      {/* Log des interactions — lecture seule, léger */}
      <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
        {interactions.length === 0 ? (
          <View style={s.emptyInteractions}>
            <Text style={{ fontSize: 32, marginBottom: 10 }}>🎁</Text>
            <Text style={s.emptyInteractionsText}>
              Aucune interaction pour l'instant
            </Text>
            <Text style={s.emptyInteractionsHint}>
              Appuyez sur un avatar pour offrir ou lancer un sort
            </Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 8 }}
          >
            {interactions.map(m => (
              <View key={m.id} style={s.interactionRow}>
                <Text style={s.interactionEmoji}>
                  {m.giftData?.emoji ?? '✨'}
                </Text>
                <Text style={s.interactionText} numberOfLines={2}>
                  {m.text ?? m.content}
                </Text>
                <Text style={s.interactionTime}>
                  {new Date(m.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            ))}
          </ScrollView>
        )}
      </View>

      {/* Barre d'actions — deux boutons, centrés, clean */}
      <View style={[s.actionBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={() => { setOfferingsTab('offrandes'); openOffrandes(); }}
          style={[s.actionBarBtn, { borderColor: COLORS.border }]}
        >
          <Text style={{ fontSize: 18 }}>🎁</Text>
          <Text style={s.actionBarBtnText}>Offrir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => { setOfferingsTab('magie'); openOffrandes(); }}
          style={[s.actionBarBtn, { borderColor: COLORS.border }]}
        >
          <Text style={{ fontSize: 18 }}>✨</Text>
          <Text style={s.actionBarBtnText}>Magie</Text>
        </TouchableOpacity>
      </View>

      <GiftAnimation flights={giftFlights} />

      {/* Menu contextuel avatar */}
      {menuState && (
        <AvatarContextMenu
          state={menuState}
          onClose={() => setMenuState(null)}
          onOffrandes={() => openFromMenu('offrandes')}
          onMagie={() => openFromMenu('magie')}
        />
      )}

      <OfferingsModal
        visible={showOfferings}
        onClose={() => setShowOfferings(false)}
        participants={participants}
        myName={myName}
        coins={coins}
        isMetal={salon.type === 'metal'}
        onSend={handleSendOffering}
        defaultRecipient={defaultRecipient}
        defaultTab={offeringsTab}
      />
    </View>
  );
}

// ── SharedProps ───────────────────────────────────────────────────────────────

interface SharedProps {
  salon: (typeof salonsData)[number];
  participants: Participant[];
  messages: Message[];
  myName: string;
  coins: number;
  messageInput: string;
  setMessageInput: (v: string) => void;
  sendMessage: () => void;
  openOffrandes: (p?: Participant) => void;
  giftFlights: GiftFlight[];
  showOfferings: boolean;
  setShowOfferings: (v: boolean) => void;
  defaultRecipient: Participant | null;
  handleSendOffering: (recipient: Participant, item: any) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉCRAN PRINCIPAL — dispatch selon salon.layout
// ══════════════════════════════════════════════════════════════════════════════

export default function SalonDetailScreen() {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();
  const myAvatarConfig = currentUser?.avatarConfig;

  const { width, height } = useWindowDimensions();
  const isLandscape = width > height;

  const salonId = params.id as string;
  const salon = salonsData.find(s => s.id === salonId);
  const myName = currentUser?.name ?? 'Vous';

  const [messageInput, setMessageInput] = useState('');
  const [showOfferings, setShowOfferings] = useState(false);
  const [defaultRecipient, setDefaultRecipient] = useState<Participant | null>(null);
  const [giftFlights, setGiftFlights] = useState<GiftFlight[]>([]);

  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (!salon) return [];
    const others: Participant[] = salon.participants.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      isOnline: p.online,
      badges: [],
      avatarConfig: p.avatarConfig,
    }));
    const meAvatar = myAvatarConfig
      ? { skinColor: myAvatarConfig.skinColor, expression: myAvatarConfig.expression, accessory: myAvatarConfig.accessory }
      : { skinColor: '#5AC8FA', expression: '😊' };
    const me: Participant = { id: 'me', name: myName, isOnline: true, isMe: true, badges: [], avatarConfig: meAvatar };
    return [...others, me];
  });

  const messages = messagesBySalon[salonId] ?? [];

  useEffect(() => {
    if (salonId) loadMessages(salonId);
  }, [salonId]);

  const sendMessage = useCallback(() => {
    const text = messageInput.trim();
    if (!text) return;
    addMessage(salonId, {
      id: Date.now().toString(),
      salonId,
      userId: 'me',
      userName: myName,
      username: myName,
      content: text,
      text,
      timestamp: Date.now(),
      type: 'message',
    });
    setMessageInput('');
  }, [messageInput, myName, salonId, addMessage]);

  const handleSendOffering = useCallback(
    (recipient: Participant, item: any) => {
      if (!removeCoins(item.cost)) return;

      setParticipants(prev =>
        prev.map(p =>
          p.id === recipient.id
            ? {
                ...p,
                badges: [
                  ...p.badges,
                  { id: Date.now().toString(), emoji: item.emoji },
                ].slice(-5),
              }
            : p
        )
      );

      addMessage(salonId, {
        id: Date.now().toString(),
        salonId,
        userId: 'system',
        userName: 'Système',
        username: 'Système',
        content: `${myName} a envoyé ${item.emoji} ${item.name} à ${recipient.name}`,
        text: `${myName} a envoyé ${item.emoji} ${item.name} à ${recipient.name}`,
        timestamp: Date.now(),
        type: 'offering',
        isSystem: true,
        giftData: { emoji: item.emoji, from: myName },
      });

      // Animation de vol (positions approximatives depuis le bas vers la cible)
      const id = `${Date.now()}-${Math.random()}`;
      const anim = new Animated.Value(0);
      const fromY = insets.top + 500;
      const toY = 200;
      setGiftFlights(prev => [
        ...prev,
        { id, emoji: item.emoji, anim, from: { x: SCREEN_W / 2 - 12, y: fromY }, to: { x: SCREEN_W / 2 - 12, y: toY } },
      ]);
      Animated.timing(anim, {
        toValue: 1,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }).start(() => setGiftFlights(prev => prev.filter(f => f.id !== id)));

      setShowOfferings(false);
    },
    [myName, salonId, participants, removeCoins, addMessage, insets.top]
  );

  const openOffrandes = useCallback((p?: Participant) => {
    setDefaultRecipient(p ?? null);
    setShowOfferings(true);
  }, []);

  if (!salon) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.bg }}>
        <Text style={{ color: COLORS.textSecondary, fontSize: 16 }}>Salon introuvable</Text>
      </View>
    );
  }

  const props: SharedProps = {
    salon,
    participants,
    messages,
    myName,
    coins,
    messageInput,
    setMessageInput,
    sendMessage,
    openOffrandes,
    giftFlights,
    showOfferings,
    setShowOfferings,
    defaultRecipient,
    handleSendOffering,
    insets,
  };

  // Paysage → toujours présence/interactions (horizontal), portrait → selon salon.layout
  return (!isLandscape && salon.layout === 'vertical')
    ? <SalonVerticalScreen {...props} />
    : <SalonHorizontalScreen {...props} />;
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  // Header
  backBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  coinsBadge: {
    backgroundColor: 'rgba(0,0,0,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  coinsText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '700',
  },

  // Avatar
  avatarName: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  meBadge: {
    position: 'absolute',
    backgroundColor: COLORS.ownBubble,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 6,
  },

  // Strip (vertical)
  strip: {
    backgroundColor: COLORS.white,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  stripContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 20,
  },

  // InputBar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    paddingTop: 8,
    paddingHorizontal: 10,
    gap: 6,
  },
  actionIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textInput: {
    flex: 1,
    height: 38,
    backgroundColor: COLORS.bg,
    borderRadius: 19,
    paddingHorizontal: 14,
    fontSize: 15,
    color: COLORS.text,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: COLORS.border,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chat messages (vertical)
  systemRow: {
    alignItems: 'center',
    marginVertical: 10,
    paddingHorizontal: 24,
  },
  systemText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  ownRow: {
    alignItems: 'flex-end',
    marginBottom: 10,
    marginHorizontal: 14,
  },
  ownBubble: {
    backgroundColor: COLORS.ownBubble,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderBottomRightRadius: 4,
    maxWidth: SCREEN_W * 0.72,
  },
  ownBubbleText: {
    fontSize: 15,
    color: '#FFF',
    lineHeight: 21,
  },
  otherRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 10,
    marginHorizontal: 14,
    gap: 8,
  },
  msgAvatarWrap: {
    width: 30,
    alignItems: 'center',
  },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.border,
  },
  msgAvatarText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
  },
  senderName: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 3,
    marginLeft: 2,
  },
  otherBubble: {
    backgroundColor: COLORS.bubble,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    maxWidth: SCREEN_W * 0.66,
  },
  otherBubbleText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 21,
  },
  timeLabel: {
    fontSize: 10,
    color: COLORS.offline,
    marginTop: 3,
    marginHorizontal: 4,
  },
  emptyChat: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyChatEmoji: { fontSize: 36, marginBottom: 12 },
  emptyChatText: { fontSize: 15, color: COLORS.textSecondary },

  // Horizontal presence layout — grille 2×2
  presenceArea: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    gap: 12,
    backgroundColor: COLORS.white,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  // Anciens styles conservés pour compatibilité
  presenceRowCenter: {
    alignItems: 'center',
  },
  presenceRowSides: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },

  // Context menu (AvatarContextMenu)
  ctxMenu: {
    position: 'absolute',
    width: MENU_BTN_SIZE * 2 + 20,
    alignItems: 'center',
    gap: 8,
  },
  ctxLabel: {
    backgroundColor: 'rgba(30,30,30,0.82)',
    paddingHorizontal: 14,
    paddingVertical: 5,
    borderRadius: 20,
    maxWidth: MENU_BTN_SIZE * 2 + 20,
  },
  ctxLabelText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  ctxBtnRow: {
    flexDirection: 'row',
    gap: 16,
  },
  ctxBtn: {
    width: MENU_BTN_SIZE,
    height: MENU_BTN_SIZE,
    borderRadius: MENU_BTN_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 8,
  },
  ctxBtnLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFF',
    letterSpacing: 0.3,
  },
  cardName: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    maxWidth: 90,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 4,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
  },
  tapHint: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginTop: -2,
  },

  // Separator
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
  },

  // Interactions log
  emptyInteractions: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 20,
  },
  emptyInteractionsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  emptyInteractionsHint: {
    fontSize: 12,
    color: COLORS.offline,
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  interactionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 12,
  },
  interactionEmoji: { fontSize: 20 },
  interactionText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  },
  interactionTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },

  // Action bar (horizontal)
  actionBar: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: COLORS.white,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  actionBarBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: COLORS.bg,
  },
  actionBarBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  modalSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '82%',
    paddingTop: 12,
  },
  modalHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.border,
    alignSelf: 'center',
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalSection: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
    letterSpacing: 0.6,
    marginBottom: 10,
    paddingHorizontal: 20,
  },
  modalItem: {
    alignItems: 'center',
    width: 74,
    backgroundColor: COLORS.bg,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 6,
  },
  modalItemName: {
    fontSize: 10,
    fontWeight: '500',
    color: COLORS.text,
    textAlign: 'center',
    marginTop: 5,
  },
  modalItemCost: {
    fontSize: 10,
    color: '#B8860B',
    fontWeight: '700',
    marginTop: 4,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 16,
    marginBottom: 16,
  },
  tabBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.bg,
  },
  tabBtnActive: {
    backgroundColor: COLORS.ownBubble,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  tabLabelActive: {
    color: '#FFF',
  },
  recipientRing: {
    borderWidth: 2.5,
    borderRadius: 28,
    padding: 2,
  },
});
