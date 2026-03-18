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
  Animated,
  ScrollView,
  Modal,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { allOfferings, allPowers, metalOfferings, metalPowers } from '../data/offerings';
import { salonsData } from '../data/salonsData';
import { useStore, Message } from '../store/useStore';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Interaction {
  id: string;
  emoji: string;
  from: string;
  timestamp: number;
}

interface ActiveEffect {
  id: string;
  emoji: string;
}

interface Participant {
  id: string;
  name: string;
  isOnline: boolean;
  isMe?: boolean;
  recentInteractions: Interaction[];
  activeEffects: ActiveEffect[];
}

interface GiftFlight {
  id: string;
  emoji: string;
  anim: Animated.Value;
  fromIndex: number;
  toIndex: number;
}

// ─── Color utils ──────────────────────────────────────────────────────────────

const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#BB8FCE', '#85C1E9'];
const BUBBLE_COLORS = ['#667EEA', '#E91E63', '#00BCD4', '#FF9800'];

function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function nameToInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 48, isOnline = true, effects = [] }: {
  name: string;
  size?: number;
  isOnline?: boolean;
  effects?: ActiveEffect[];
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.055,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const bg = nameToColor(name);
  const dotSize = size * 0.24;

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: isOnline ? 2.5 : 1.5,
          borderColor: isOnline ? '#4CAF50' : 'rgba(255,255,255,0.25)',
        }}
      >
        <Text style={{ fontSize: size * 0.36, fontWeight: '700', color: '#FFF' }}>
          {nameToInitials(name)}
        </Text>
        {effects[0] && (
          <Text style={{ position: 'absolute', fontSize: size * 0.28, bottom: -(size * 0.16) }}>
            {effects[0].emoji}
          </Text>
        )}
      </View>
      {/* Online dot */}
      <View
        style={{
          position: 'absolute',
          bottom: 1,
          right: 1,
          width: dotSize,
          height: dotSize,
          borderRadius: dotSize / 2,
          backgroundColor: isOnline ? '#4CAF50' : '#888',
          borderWidth: 1.5,
          borderColor: '#FFF',
        }}
      />
    </Animated.View>
  );
}

// ─── ParticipantSlot (portrait) ───────────────────────────────────────────────

function ParticipantSlot({ participant, onPress }: {
  participant: Participant;
  onPress?: () => void;
}) {
  const gifts = participant.recentInteractions.slice(-3);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={{ alignItems: 'center', flex: 1 }}
    >
      <View style={{ position: 'relative' }}>
        <Avatar
          name={participant.name}
          size={52}
          isOnline={participant.isOnline}
          effects={participant.activeEffects}
        />
        {participant.isMe && (
          <Text style={{ position: 'absolute', top: -6, right: -4, fontSize: 12 }}>👑</Text>
        )}
      </View>

      <Text
        style={{
          fontSize: 11,
          fontWeight: '600',
          color: '#FFF',
          marginTop: 5,
          textAlign: 'center',
          textShadowColor: 'rgba(0,0,0,0.5)',
          textShadowOffset: { width: 0, height: 1 },
          textShadowRadius: 3,
        }}
        numberOfLines={1}
      >
        {participant.name}
      </Text>

      {gifts.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 3 }}>
          {gifts.map(g => (
            <Text key={g.id} style={{ fontSize: 11 }}>{g.emoji}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── ParticipantRow (portrait) ────────────────────────────────────────────────

function ParticipantRow({ participants, onPress, gradient }: {
  participants: Participant[];
  onPress: (p: Participant) => void;
  gradient: [string, string];
}) {
  return (
    <LinearGradient
      colors={gradient}
      style={{ flexDirection: 'row', paddingHorizontal: 4, paddingVertical: 14 }}
    >
      {participants.map(p => (
        <ParticipantSlot
          key={p.id}
          participant={p}
          onPress={!p.isMe ? () => onPress(p) : undefined}
        />
      ))}
    </LinearGradient>
  );
}

// ─── InteractionStrip ─────────────────────────────────────────────────────────

function InteractionStrip({ participants }: { participants: Participant[] }) {
  const items = participants
    .flatMap(p =>
      p.recentInteractions.slice(-2).map(i => ({ ...i, toName: p.name }))
    )
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 8);

  if (items.length === 0) return null;

  return (
    <View style={{ paddingVertical: 6, paddingHorizontal: 12, backgroundColor: 'rgba(0,0,0,0.12)' }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, alignItems: 'center' }}
      >
        {items.map(item => (
          <View
            key={item.id}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 4,
              backgroundColor: 'rgba(255,255,255,0.18)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 20,
            }}
          >
            <Text style={{ fontSize: 14 }}>{item.emoji}</Text>
            <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.9)', fontWeight: '500' }}>
              {item.from} → {item.toName}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

// ─── MessageBubble ────────────────────────────────────────────────────────────

function MessageBubble({ message, isOwn, isSystem, senderIdx }: {
  message: Message;
  isOwn: boolean;
  isSystem: boolean;
  senderIdx: number;
}) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }).start();
  }, []);

  const timeStr = new Date(message.timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (isSystem) {
    return (
      <Animated.View style={{ opacity, alignItems: 'center', marginVertical: 8, paddingHorizontal: 20 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: 'rgba(218,165,32,0.12)',
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
          }}
        >
          {message.giftData && (
            <Text style={{ fontSize: 18 }}>{message.giftData.emoji}</Text>
          )}
          <Text style={{ fontSize: 12, color: '#B8860B', fontWeight: '600', flexShrink: 1 }}>
            {message.text ?? message.content}
          </Text>
        </View>
      </Animated.View>
    );
  }

  const bubbleColor = isOwn ? '#E91E63' : BUBBLE_COLORS[senderIdx % BUBBLE_COLORS.length];

  return (
    <Animated.View
      style={{
        opacity,
        alignItems: isOwn ? 'flex-end' : 'flex-start',
        marginBottom: 10,
        marginHorizontal: 12,
      }}
    >
      {!isOwn && (
        <Text style={{ fontSize: 10, color: '#AAA', marginBottom: 3, marginLeft: 6 }}>
          {message.username ?? message.userName} · {timeStr}
        </Text>
      )}
      <View
        style={{
          backgroundColor: isOwn ? bubbleColor : '#F4F4F4',
          paddingHorizontal: 14,
          paddingVertical: 10,
          borderRadius: 18,
          borderBottomRightRadius: isOwn ? 4 : 18,
          borderBottomLeftRadius: isOwn ? 18 : 4,
          maxWidth: '78%',
        }}
      >
        <Text style={{ fontSize: 15, color: isOwn ? '#FFF' : '#222', lineHeight: 21 }}>
          {message.text ?? message.content}
        </Text>
      </View>
      {isOwn && (
        <Text style={{ fontSize: 10, color: '#BBB', marginTop: 2, marginRight: 6 }}>
          {timeStr}
        </Text>
      )}
    </Animated.View>
  );
}

// ─── ChatFeed ────────────────────────────────────────────────────────────────

function ChatFeed({ messages, myName, participants }: {
  messages: Message[];
  myName: string;
  participants: Participant[];
}) {
  const listRef = useRef<FlatList>(null);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages.length]);

  const senderIndex = (username: string) => {
    const i = participants.findIndex(p => p.name === username);
    return i >= 0 ? i : 0;
  };

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={m => m.id}
      renderItem={({ item }) => (
        <MessageBubble
          message={item}
          isOwn={
            item.username === myName ||
            item.userName === myName ||
            item.userId === 'me'
          }
          isSystem={!!item.isSystem}
          senderIdx={senderIndex(item.username ?? item.userName)}
        />
      )}
      contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={scrollToEnd}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 50 }}>
          <Text style={{ fontSize: 28, marginBottom: 10 }}>💬</Text>
          <Text style={{ color: '#CCC', fontSize: 15, fontStyle: 'italic' }}>
            Commencez la discussion...
          </Text>
        </View>
      }
    />
  );
}

// ─── InputBar ────────────────────────────────────────────────────────────────

function InputBar({ value, onChange, onSend, onOffrandes, onMagie, paddingBottom }: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onOffrandes: () => void;
  onMagie: () => void;
  paddingBottom: number;
}) {
  return (
    <View
      style={{
        backgroundColor: '#FFF',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: '#E8E8E8',
        paddingTop: 10,
        paddingBottom: Math.max(paddingBottom, 10),
        paddingHorizontal: 12,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <TouchableOpacity onPress={onOffrandes} style={styles.actionBtn}>
          <Text style={{ fontSize: 17 }}>🎁</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={onMagie} style={[styles.actionBtn, { backgroundColor: '#F3E5F5' }]}>
          <Text style={{ fontSize: 17 }}>✨</Text>
        </TouchableOpacity>

        <TextInput
          style={{
            flex: 1,
            height: 40,
            backgroundColor: '#F8F8F8',
            borderRadius: 20,
            paddingHorizontal: 14,
            fontSize: 15,
            color: '#222',
            borderWidth: 1,
            borderColor: '#EEE',
          }}
          placeholder="Message..."
          placeholderTextColor="#CCC"
          value={value}
          onChangeText={onChange}
          onSubmitEditing={onSend}
          returnKeyType="send"
        />

        <TouchableOpacity
          onPress={onSend}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: value.trim() ? '#E91E63' : '#DDD',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ fontSize: 18, color: '#FFF' }}>➤</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Landscape Participant Slot ───────────────────────────────────────────────

function LandscapeSlot({ participant, onPress, side }: {
  participant: Participant;
  onPress?: () => void;
  side: 'left' | 'right';
}) {
  const gifts = participant.recentInteractions.slice(-2);
  const isLeft = side === 'left';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={onPress ? 0.75 : 1}
      style={{ alignItems: isLeft ? 'flex-start' : 'flex-end', paddingHorizontal: 6 }}
    >
      <View style={{ position: 'relative' }}>
        <Avatar
          name={participant.name}
          size={44}
          isOnline={participant.isOnline}
          effects={participant.activeEffects}
        />
        {participant.isMe && (
          <Text style={{ position: 'absolute', top: -6, right: -4, fontSize: 11 }}>👑</Text>
        )}
      </View>

      <Text
        style={{
          fontSize: 10,
          fontWeight: '600',
          color: 'rgba(255,255,255,0.92)',
          marginTop: 4,
          textAlign: isLeft ? 'left' : 'right',
        }}
        numberOfLines={1}
      >
        {participant.name}
      </Text>

      {gifts.length > 0 && (
        <View style={{ flexDirection: 'row', gap: 2, marginTop: 2 }}>
          {gifts.map(g => (
            <Text key={g.id} style={{ fontSize: 12 }}>{g.emoji}</Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Gift Flight Overlay ──────────────────────────────────────────────────────

function GiftFlightOverlay({ flights, screenW, screenH, isLandscape }: {
  flights: GiftFlight[];
  screenW: number;
  screenH: number;
  isLandscape: boolean;
}) {
  if (flights.length === 0) return null;

  const getPos = (index: number): { x: number; y: number } => {
    if (isLandscape) {
      const positions = [
        { x: 45, y: 80 },
        { x: screenW - 45, y: 80 },
        { x: 45, y: screenH - 80 },
        { x: screenW - 45, y: screenH - 80 },
      ];
      return positions[index] ?? { x: screenW / 2, y: screenH / 2 };
    }
    // Portrait: horizontal row at y≈160
    return {
      x: (screenW / 4) * index + screenW / 8,
      y: 160,
    };
  };

  return (
    <View
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      pointerEvents="none"
    >
      {flights.map(f => {
        const from = getPos(f.fromIndex);
        const to = getPos(f.toIndex);

        const left = f.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [from.x - 14, to.x - 14],
        });
        const top = f.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [from.y - 14, to.y - 14],
        });
        const opacity = f.anim.interpolate({
          inputRange: [0, 0.1, 0.85, 1],
          outputRange: [0, 1, 1, 0],
        });
        const emojiScale = f.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.8, 1.4, 0.9],
        });

        return (
          <Animated.View
            key={f.id}
            style={{
              position: 'absolute',
              left,
              top,
              opacity,
              transform: [{ scale: emojiScale }],
            }}
          >
            <Text style={{ fontSize: 26 }}>{f.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Offerings Modal ──────────────────────────────────────────────────────────

function OfferingsModal({ visible, onClose, participants, myName, coins, isMetal, onSend, defaultRecipient }: {
  visible: boolean;
  onClose: () => void;
  participants: Participant[];
  myName: string;
  coins: number;
  isMetal: boolean;
  onSend: (recipient: Participant, item: any) => void;
  defaultRecipient?: Participant | null;
}) {
  const [recipient, setRecipient] = useState<Participant | null>(null);
  const [tab, setTab] = useState<'offrandes' | 'magie'>('offrandes');

  useEffect(() => {
    if (visible) {
      setRecipient(defaultRecipient ?? null);
      setTab('offrandes');
    }
  }, [visible, defaultRecipient]);

  const offerings = isMetal ? [...allOfferings, ...metalOfferings] : allOfferings;
  const powers = isMetal ? [...allPowers, ...metalPowers] : allPowers;
  const others = participants.filter(p => !p.isMe);

  const renderHorizontalList = (label: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <View style={{ marginBottom: 18 }}>
        <Text
          style={{
            fontSize: 11,
            fontWeight: '700',
            color: '#999',
            marginBottom: 10,
            paddingHorizontal: 20,
            letterSpacing: 0.8,
          }}
        >
          {label}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}
        >
          {items.map((item: any) => {
            const disabled = !recipient || coins < item.cost;
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => recipient && onSend(recipient, item)}
                disabled={disabled}
                style={{
                  alignItems: 'center',
                  width: 76,
                  backgroundColor: '#FFF',
                  borderRadius: 16,
                  paddingVertical: 12,
                  paddingHorizontal: 8,
                  borderWidth: 1,
                  borderColor: '#EAEAEA',
                  opacity: disabled ? 0.45 : 1,
                }}
              >
                <Text style={{ fontSize: 24, marginBottom: 5 }}>{item.emoji}</Text>
                <Text
                  style={{ fontSize: 10, fontWeight: '600', color: '#555', textAlign: 'center' }}
                  numberOfLines={2}
                >
                  {item.name}
                </Text>
                <Text style={{ fontSize: 10, color: '#DAA520', fontWeight: '700', marginTop: 4 }}>
                  {item.cost}💰
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' }}>
        <View
          style={{
            backgroundColor: '#FAFAFA',
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: '80%',
          }}
        >
          {/* Handle */}
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD' }} />
          </View>

          {/* Header */}
          <View
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              paddingHorizontal: 20,
              paddingVertical: 12,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#222' }}>
              {recipient ? `Pour ${recipient.name}` : 'Choisir un destinataire'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#BBB' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Participant picker */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 16 }}>
            {others.map(p => (
              <TouchableOpacity
                key={p.id}
                onPress={() => setRecipient(p)}
                style={{ alignItems: 'center' }}
              >
                <View
                  style={{
                    borderWidth: 2.5,
                    borderColor: recipient?.id === p.id ? '#E91E63' : 'transparent',
                    borderRadius: 28,
                    padding: 2,
                    opacity: recipient?.id === p.id ? 1 : 0.5,
                  }}
                >
                  <Avatar name={p.name} size={44} isOnline={p.isOnline} />
                </View>
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#555', marginTop: 4 }}>
                  {p.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Tab switcher */}
          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
            {(['offrandes', 'magie'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  borderRadius: 20,
                  backgroundColor: tab === t ? '#E91E63' : '#EFEFEF',
                }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t ? '#FFF' : '#777' }}>
                  {t === 'offrandes' ? '🎁 Offrandes' : '✨ Magie'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Items */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'offrandes' ? (
              <>
                {renderHorizontalList('🍹 BOISSONS', offerings.filter(o => o.category === 'boisson'))}
                {renderHorizontalList('🍔 NOURRITURE', offerings.filter(o => o.category === 'nourriture'))}
                {renderHorizontalList('💌 SYMBOLIQUE', offerings.filter(o => o.category === 'symbolique'))}
                {renderHorizontalList('😄 HUMOUR', offerings.filter(o => o.category === 'humour'))}
              </>
            ) : (
              renderHorizontalList('🪄 POUVOIRS', powers)
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function SalonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { width: screenW, height: screenH } = useWindowDimensions();
  const isLandscape = screenW > screenH;

  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } =
    useStore();

  const salonId = params.id as string;
  const salon = salonsData.find(s => s.id === salonId);
  const isMetal = salon?.type === 'metal';

  const [messageInput, setMessageInput] = useState('');
  const [showOfferings, setShowOfferings] = useState(false);
  const [defaultRecipient, setDefaultRecipient] = useState<Participant | null>(null);
  const [giftFlights, setGiftFlights] = useState<GiftFlight[]>([]);

  const myName = currentUser?.name ?? 'Vous';

  const [participants, setParticipants] = useState<Participant[]>(() => {
    if (!salon) return [];
    const base: Participant[] = salon.participants.slice(0, 3).map(p => ({
      id: p.id,
      name: p.name,
      isOnline: p.online,
      recentInteractions: [],
      activeEffects: [],
    }));
    base.push({
      id: 'me',
      name: myName,
      isOnline: true,
      isMe: true,
      recentInteractions: [],
      activeEffects: [],
    });
    return base;
  });

  const messages = messagesBySalon[salonId] ?? [];

  useEffect(() => {
    if (salonId) loadMessages(salonId);
  }, [salonId]);

  const sendMessage = useCallback(() => {
    const text = messageInput.trim();
    if (!text) return;
    const msg: Message = {
      id: Date.now().toString(),
      salonId,
      userId: currentUser?.id ?? 'me',
      userName: myName,
      username: myName,
      content: text,
      text,
      timestamp: Date.now(),
      type: 'message',
    };
    addMessage(salonId, msg);
    setMessageInput('');
  }, [messageInput, myName, salonId, currentUser, addMessage]);

  const launchGiftFlight = useCallback((fromIndex: number, toIndex: number, emoji: string) => {
    const id = `${Date.now()}-${Math.random()}`;
    const anim = new Animated.Value(0);
    setGiftFlights(prev => [...prev, { id, emoji, anim, fromIndex, toIndex }]);
    Animated.timing(anim, {
      toValue: 1,
      duration: 900,
      easing: Easing.inOut(Easing.quad),
      useNativeDriver: false,
    }).start(() => {
      setGiftFlights(prev => prev.filter(f => f.id !== id));
    });
  }, []);

  const handleSendOffering = useCallback(
    (recipient: Participant, item: any) => {
      if (!removeCoins(item.cost)) return;

      const interaction: Interaction = {
        id: Date.now().toString(),
        emoji: item.emoji,
        from: myName,
        timestamp: Date.now(),
      };

      setParticipants(prev =>
        prev.map(p =>
          p.id === recipient.id
            ? { ...p, recentInteractions: [...p.recentInteractions, interaction].slice(-6) }
            : p
        )
      );

      const msg: Message = {
        id: Date.now().toString(),
        salonId,
        userId: 'system',
        userName: 'Système',
        username: 'Système',
        content: `${myName} a envoyé ${item.emoji} ${item.name} à ${recipient.name}!`,
        text: `${myName} a envoyé ${item.emoji} ${item.name} à ${recipient.name}!`,
        timestamp: Date.now(),
        type: 'offering',
        isSystem: true,
        giftData: { emoji: item.emoji, from: myName },
      };
      addMessage(salonId, msg);

      const fromIdx = participants.findIndex(p => p.isMe);
      const toIdx = participants.findIndex(p => p.id === recipient.id);
      if (fromIdx >= 0 && toIdx >= 0) {
        launchGiftFlight(fromIdx, toIdx, item.emoji);
      }

      setShowOfferings(false);
    },
    [myName, salonId, participants, removeCoins, addMessage, launchGiftFlight]
  );

  const openOffrandes = useCallback((recipient?: Participant) => {
    setDefaultRecipient(recipient ?? null);
    setShowOfferings(true);
  }, []);

  if (!salon) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F8F8F8' }}>
        <Text style={{ fontSize: 18, color: '#888' }}>Salon introuvable</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: '#E91E63', fontSize: 16, fontWeight: '600' }}>← Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const gradient = salon.gradient as [string, string];

  // ════════════════════════════════════════════════════════
  // PORTRAIT LAYOUT
  // ════════════════════════════════════════════════════════
  if (!isLandscape) {
    return (
      <KeyboardAvoidingView
        style={{ flex: 1, backgroundColor: '#FFF' }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Compact header */}
        <LinearGradient
          colors={gradient}
          style={{
            paddingTop: insets.top + 6,
            paddingBottom: 10,
            paddingHorizontal: 16,
            flexDirection: 'row',
            alignItems: 'center',
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>

          <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFF' }}>
            {salon.icon} {salon.name}
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 10,
              paddingVertical: 4,
              borderRadius: 12,
            }}
          >
            <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>💰 {coins}</Text>
          </View>
        </LinearGradient>

        {/* Participants — horizontal row */}
        <ParticipantRow
          participants={participants}
          onPress={p => openOffrandes(p)}
          gradient={gradient}
        />

        {/* Recent interactions strip */}
        <InteractionStrip participants={participants} />

        {/* Chat */}
        <View style={{ flex: 1 }}>
          <ChatFeed messages={messages} myName={myName} participants={participants} />
        </View>

        {/* Input bar */}
        <InputBar
          value={messageInput}
          onChange={setMessageInput}
          onSend={sendMessage}
          onOffrandes={() => openOffrandes()}
          onMagie={() => openOffrandes()}
          paddingBottom={insets.bottom}
        />

        <GiftFlightOverlay
          flights={giftFlights}
          screenW={screenW}
          screenH={screenH}
          isLandscape={false}
        />

        <OfferingsModal
          visible={showOfferings}
          onClose={() => setShowOfferings(false)}
          participants={participants}
          myName={myName}
          coins={coins}
          isMetal={isMetal ?? false}
          onSend={handleSendOffering}
          defaultRecipient={defaultRecipient}
        />
      </KeyboardAvoidingView>
    );
  }

  // ════════════════════════════════════════════════════════
  // LANDSCAPE LAYOUT — immersive "around a table"
  //
  //  [p0]  ┌─────────────┐  [p1]
  //        │             │
  //        │    CHAT     │
  //        │             │
  //  [p2]  └─────────────┘  [p3]
  // ════════════════════════════════════════════════════════

  const leftCol = [participants[0], participants[2]].filter(Boolean);
  const rightCol = [participants[1], participants[3]].filter(Boolean);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient colors={gradient} style={{ flex: 1 }}>
        {/* Top bar */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 16,
            paddingTop: insets.top + 4,
            paddingBottom: 6,
          }}
        >
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 30,
              height: 30,
              borderRadius: 15,
              backgroundColor: 'rgba(255,255,255,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 16, fontWeight: '700' }}>←</Text>
          </TouchableOpacity>

          <Text style={{ flex: 1, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#FFF' }}>
            {salon.icon} {salon.name}
          </Text>

          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.2)',
              paddingHorizontal: 8,
              paddingVertical: 3,
              borderRadius: 10,
            }}
          >
            <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 12 }}>💰 {coins}</Text>
          </View>
        </View>

        {/* Main: left avatars | chat center | right avatars */}
        <View style={{ flex: 1, flexDirection: 'row' }}>
          {/* Left column */}
          <View
            style={{
              width: 90,
              justifyContent: 'space-around',
              paddingVertical: 12,
              paddingLeft: insets.left + 8,
            }}
          >
            {leftCol.map(p => (
              <LandscapeSlot
                key={p.id}
                participant={p}
                side="left"
                onPress={!p.isMe ? () => openOffrandes(p) : undefined}
              />
            ))}
          </View>

          {/* Center chat */}
          <View
            style={{
              flex: 1,
              backgroundColor: 'rgba(255,255,255,0.96)',
              borderRadius: 16,
              overflow: 'hidden',
              marginVertical: 6,
            }}
          >
            <ChatFeed messages={messages} myName={myName} participants={participants} />
            <InputBar
              value={messageInput}
              onChange={setMessageInput}
              onSend={sendMessage}
              onOffrandes={() => openOffrandes()}
              onMagie={() => openOffrandes()}
              paddingBottom={0}
            />
          </View>

          {/* Right column */}
          <View
            style={{
              width: 90,
              justifyContent: 'space-around',
              paddingVertical: 12,
              paddingRight: insets.right + 8,
              alignItems: 'flex-end',
            }}
          >
            {rightCol.map(p => (
              <LandscapeSlot
                key={p.id}
                participant={p}
                side="right"
                onPress={!p.isMe ? () => openOffrandes(p) : undefined}
              />
            ))}
          </View>
        </View>

        {/* Recent interactions — bottom */}
        <InteractionStrip participants={participants} />

        <GiftFlightOverlay
          flights={giftFlights}
          screenW={screenW}
          screenH={screenH}
          isLandscape
        />
      </LinearGradient>

      <OfferingsModal
        visible={showOfferings}
        onClose={() => setShowOfferings(false)}
        participants={participants}
        myName={myName}
        coins={coins}
        isMetal={isMetal ?? false}
        onSend={handleSendOffering}
        defaultRecipient={defaultRecipient}
      />
    </KeyboardAvoidingView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
