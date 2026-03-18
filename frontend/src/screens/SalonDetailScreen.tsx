import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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

type MessageGroup =
  | { kind: 'system'; message: Message }
  | { kind: 'chat'; sender: string; senderId: string; isOwn: boolean; messages: Message[] };

// ─── Color utils ──────────────────────────────────────────────────────────────

const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#DDA0DD', '#98D8C8', '#BB8FCE', '#85C1E9'];

function nameToColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return PALETTE[Math.abs(h) % PALETTE.length];
}

function nameToInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── Group messages by consecutive sender ────────────────────────────────────

function buildMessageGroups(messages: Message[], myName: string): MessageGroup[] {
  const groups: MessageGroup[] = [];

  for (const msg of messages) {
    if (msg.isSystem) {
      groups.push({ kind: 'system', message: msg });
      continue;
    }

    const senderName = msg.username ?? msg.userName ?? '';
    const isOwn = msg.userId === 'me' || senderName === myName;

    const last = groups[groups.length - 1];
    if (last && last.kind === 'chat' && last.sender === senderName) {
      last.messages.push(msg);
    } else {
      groups.push({ kind: 'chat', sender: senderName, senderId: msg.userId ?? '', isOwn, messages: [msg] });
    }
  }

  return groups;
}

// ─── Shared: Avatar ───────────────────────────────────────────────────────────

function Avatar({
  name,
  size = 48,
  isOnline = true,
  effects = [],
}: {
  name: string;
  size?: number;
  isOnline?: boolean;
  effects?: ActiveEffect[];
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.055, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
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

// ─── Shared: InputBar ────────────────────────────────────────────────────────

function InputBar({
  value,
  onChange,
  onSend,
  onOffrandes,
  onMagie,
  paddingBottom,
  accentColor,
}: {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  onOffrandes: () => void;
  onMagie: () => void;
  paddingBottom: number;
  accentColor?: string;
}) {
  const accent = accentColor ?? '#E91E63';
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
            backgroundColor: value.trim() ? accent : '#DDD',
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

// ─── Shared: GiftFlightOverlay ───────────────────────────────────────────────

function GiftFlightOverlay({
  flights,
  positions,
}: {
  flights: GiftFlight[];
  positions: { x: number; y: number }[];
}) {
  if (flights.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {flights.map(f => {
        const from = positions[f.fromIndex] ?? { x: 150, y: 300 };
        const to = positions[f.toIndex] ?? { x: 150, y: 100 };

        const left = f.anim.interpolate({ inputRange: [0, 1], outputRange: [from.x - 14, to.x - 14] });
        const top = f.anim.interpolate({ inputRange: [0, 1], outputRange: [from.y - 14, to.y - 14] });
        const opacity = f.anim.interpolate({ inputRange: [0, 0.1, 0.85, 1], outputRange: [0, 1, 1, 0] });
        const emojiScale = f.anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.8, 1.4, 0.9] });

        return (
          <Animated.View
            key={f.id}
            style={{ position: 'absolute', left, top, opacity, transform: [{ scale: emojiScale }] }}
          >
            <Text style={{ fontSize: 26 }}>{f.emoji}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}

// ─── Shared: OfferingsModal ───────────────────────────────────────────────────

function OfferingsModal({
  visible,
  onClose,
  participants,
  myName,
  coins,
  isMetal,
  onSend,
  defaultRecipient,
}: {
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

  const renderRow = (label: string, items: any[]) => {
    if (items.length === 0) return null;
    return (
      <View style={{ marginBottom: 18 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#999', marginBottom: 10, paddingHorizontal: 20, letterSpacing: 0.8 }}>
          {label}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 10 }}>
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
                <Text style={{ fontSize: 10, fontWeight: '600', color: '#555', textAlign: 'center' }} numberOfLines={2}>
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
        <View style={{ backgroundColor: '#FAFAFA', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '80%' }}>
          <View style={{ alignItems: 'center', paddingTop: 12, paddingBottom: 4 }}>
            <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: '#DDD' }} />
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12 }}>
            <Text style={{ fontSize: 17, fontWeight: '700', color: '#222' }}>
              {recipient ? `Pour ${recipient.name}` : 'Choisir un destinataire'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={{ fontSize: 22, color: '#BBB' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 16, marginBottom: 16 }}>
            {others.map(p => (
              <TouchableOpacity key={p.id} onPress={() => setRecipient(p)} style={{ alignItems: 'center' }}>
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
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#555', marginTop: 4 }}>{p.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 8, marginBottom: 16 }}>
            {(['offrandes', 'magie'] as const).map(t => (
              <TouchableOpacity
                key={t}
                onPress={() => setTab(t)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: tab === t ? '#E91E63' : '#EFEFEF' }}
              >
                <Text style={{ fontWeight: '700', fontSize: 13, color: tab === t ? '#FFF' : '#777' }}>
                  {t === 'offrandes' ? '🎁 Offrandes' : '✨ Magie'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {tab === 'offrandes' ? (
              <>
                {renderRow('🍹 BOISSONS', offerings.filter(o => o.category === 'boisson'))}
                {renderRow('🍔 NOURRITURE', offerings.filter(o => o.category === 'nourriture'))}
                {renderRow('💌 SYMBOLIQUE', offerings.filter(o => o.category === 'symbolique'))}
                {renderRow('😄 HUMOUR', offerings.filter(o => o.category === 'humour'))}
              </>
            ) : (
              renderRow('🪄 POUVOIRS', powers)
            )}
            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALON VERTICAL ──────────────────────────────────────────────────────────────
// Discussion première. Les avatars vivent dans le flux des messages.
// Pas de rangée d'avatars fixe en haut.
// ══════════════════════════════════════════════════════════════════════════════

// Pill système (offrande/magie) — centrée dans le fil
function VerticalSystemPill({ message }: { message: Message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], alignItems: 'center', marginVertical: 10, paddingHorizontal: 24 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          backgroundColor: 'rgba(218,165,32,0.10)',
          borderWidth: 1,
          borderColor: 'rgba(218,165,32,0.25)',
          paddingHorizontal: 16,
          paddingVertical: 7,
          borderRadius: 20,
        }}
      >
        {message.giftData && <Text style={{ fontSize: 16 }}>{message.giftData.emoji}</Text>}
        <Text style={{ fontSize: 12, color: '#B8860B', fontWeight: '600', flexShrink: 1, textAlign: 'center' }}>
          {message.text ?? message.content}
        </Text>
      </View>
    </Animated.View>
  );
}

// Groupe de messages d'un même auteur, avec son avatar intégré
function VerticalMessageGroup({
  group,
  participant,
  onAvatarPress,
}: {
  group: Extract<MessageGroup, { kind: 'chat' }>;
  participant?: Participant;
  onAvatarPress?: () => void;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.timing(translateY, { toValue: 0, duration: 200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const avatarColor = nameToColor(group.sender);
  const isOnline = participant?.isOnline ?? true;
  const effects = participant?.activeEffects ?? [];

  const timeStr = new Date(group.messages[group.messages.length - 1].timestamp).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  if (group.isOwn) {
    return (
      <Animated.View style={{ opacity, transform: [{ translateY }], marginBottom: 14, marginHorizontal: 14, alignItems: 'flex-end' }}>
        {/* Bulles */}
        <View style={{ alignItems: 'flex-end', marginRight: 44 }}>
          {group.messages.map((msg, i) => (
            <View
              key={msg.id}
              style={{
                backgroundColor: '#E91E63',
                paddingHorizontal: 14,
                paddingVertical: 9,
                borderRadius: 18,
                borderBottomRightRadius: i === group.messages.length - 1 ? 4 : 18,
                maxWidth: '80%',
                marginBottom: i < group.messages.length - 1 ? 3 : 0,
                alignSelf: 'flex-end',
              }}
            >
              <Text style={{ fontSize: 15, color: '#FFF', lineHeight: 21 }}>
                {msg.text ?? msg.content}
              </Text>
            </View>
          ))}
        </View>

        {/* Avatar + heure en bas à droite */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 5 }}>
          <Text style={{ fontSize: 10, color: '#BBB' }}>{timeStr}</Text>
          <TouchableOpacity activeOpacity={1}>
            <Avatar name={group.sender} size={34} isOnline />
          </TouchableOpacity>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={{ opacity, transform: [{ translateY }], marginBottom: 14, marginHorizontal: 14 }}>
      {/* Ligne : avatar + nom */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <TouchableOpacity onPress={onAvatarPress} activeOpacity={onAvatarPress ? 0.75 : 1}>
          <Avatar name={group.sender} size={36} isOnline={isOnline} effects={effects} />
        </TouchableOpacity>
        <Text style={{ fontSize: 12, fontWeight: '600', color: '#888' }}>{group.sender}</Text>
      </View>

      {/* Bulles en retrait (sous l'avatar) */}
      <View style={{ marginLeft: 46, alignItems: 'flex-start' }}>
        {group.messages.map((msg, i) => (
          <View
            key={msg.id}
            style={{
              backgroundColor: '#F2F2F2',
              paddingHorizontal: 14,
              paddingVertical: 9,
              borderRadius: 18,
              borderBottomLeftRadius: i === group.messages.length - 1 ? 4 : 18,
              maxWidth: '82%',
              marginBottom: i < group.messages.length - 1 ? 3 : 0,
            }}
          >
            <Text style={{ fontSize: 15, color: '#222', lineHeight: 21 }}>
              {msg.text ?? msg.content}
            </Text>
          </View>
        ))}

        {/* Heure sous la dernière bulle */}
        <Text style={{ fontSize: 10, color: '#CCC', marginTop: 4 }}>{timeStr}</Text>
      </View>
    </Animated.View>
  );
}

// Fil de discussion vertical
function VerticalChatFeed({
  messages,
  myName,
  participants,
  onAvatarPress,
}: {
  messages: Message[];
  myName: string;
  participants: Participant[];
  onAvatarPress: (p: Participant) => void;
}) {
  const listRef = useRef<FlatList>(null);
  const groups = useMemo(() => buildMessageGroups(messages, myName), [messages, myName]);

  const scrollToEnd = useCallback(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 60);
  }, []);

  useEffect(() => { scrollToEnd(); }, [messages.length]);

  const findParticipant = (name: string) => participants.find(p => p.name === name);

  return (
    <FlatList
      ref={listRef}
      data={groups}
      keyExtractor={(_, i) => String(i)}
      renderItem={({ item }) => {
        if (item.kind === 'system') {
          return <VerticalSystemPill message={item.message} />;
        }
        const p = findParticipant(item.sender);
        return (
          <VerticalMessageGroup
            group={item}
            participant={p}
            onAvatarPress={p && !p.isMe ? () => onAvatarPress(p) : undefined}
          />
        );
      }}
      contentContainerStyle={{ paddingVertical: 16, flexGrow: 1 }}
      showsVerticalScrollIndicator={false}
      onContentSizeChange={scrollToEnd}
      ListEmptyComponent={
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }}>
          <Text style={{ fontSize: 32, marginBottom: 12 }}>💬</Text>
          <Text style={{ color: '#CCC', fontSize: 15, fontStyle: 'italic' }}>Commencez la discussion…</Text>
          <Text style={{ color: '#DDD', fontSize: 12, marginTop: 8 }}>
            {participants.filter(p => !p.isMe).map(p => p.name).join(', ')} sont là
          </Text>
        </View>
      }
    />
  );
}

// Layout Vertical complet
function VerticalLayout({
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
  giftPositions,
  showOfferings,
  setShowOfferings,
  defaultRecipient,
  handleSendOffering,
  insets,
}: LayoutProps) {
  const gradient = salon.gradient as [string, string];
  const isMetal = salon.type === 'metal';

  // Petits indicateurs de présence (points colorés) en haut
  const others = participants.filter(p => !p.isMe);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: '#FFF' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header gradient compact */}
      <LinearGradient
        colors={gradient}
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 12,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => {}}
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFF' }}>
            {salon.icon} {salon.name}
          </Text>
          {/* Indicateurs de présence : petits cercles colorés + nom court */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
            {others.map(p => (
              <View key={p.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.isOnline ? '#4CAF50' : '#888' }} />
                <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', fontWeight: '500' }} numberOfLines={1}>
                  {p.name.split(' ')[0]}
                </Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Fil de messages avec avatars intégrés */}
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <VerticalChatFeed
          messages={messages}
          myName={myName}
          participants={participants}
          onAvatarPress={p => openOffrandes(p)}
        />
      </View>

      {/* Barre de saisie */}
      <InputBar
        value={messageInput}
        onChange={setMessageInput}
        onSend={sendMessage}
        onOffrandes={() => openOffrandes()}
        onMagie={() => openOffrandes()}
        paddingBottom={insets.bottom}
        accentColor={gradient[1]}
      />

      <GiftFlightOverlay flights={giftFlights} positions={giftPositions} />

      <OfferingsModal
        visible={showOfferings}
        onClose={() => setShowOfferings(false)}
        participants={participants}
        myName={myName}
        coins={coins}
        isMetal={isMetal}
        onSend={handleSendOffering}
        defaultRecipient={defaultRecipient}
      />
    </KeyboardAvoidingView>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SALON HORIZONTAL ────────────────────────────────────────────────────────────
// Présence pure. Avatars + offrandes/magie. Pas de discussion texte.
// On voit qui est là, on interagit directement.
// ══════════════════════════════════════════════════════════════════════════════

// Carte de participant — grande, respirante, offrandes visibles
function HorizontalParticipantCard({
  participant,
  onPress,
  isMe,
  accentBg,
}: {
  participant: Participant;
  onPress?: () => void;
  isMe?: boolean;
  accentBg?: string;
}) {
  const recentGifts = participant.recentInteractions.slice(-5);
  const scale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    if (!onPress) return;
    Animated.timing(scale, { toValue: 0.94, duration: 100, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.timing(scale, { toValue: 1, duration: 140, easing: Easing.out(Easing.quad), useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={!onPress}
      style={{ alignItems: 'center', paddingHorizontal: 12, paddingVertical: 20, minWidth: 88 }}
    >
      <Animated.View style={{ transform: [{ scale }], alignItems: 'center' }}>
        {/* Badge "moi" */}
        {isMe && (
          <Text style={{ fontSize: 14, marginBottom: 4 }}>👑</Text>
        )}
        {!isMe && onPress && (
          /* Indicateur "appuyez pour offrir" */
          <Text style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', marginBottom: 4, fontStyle: 'italic' }}>
            offrir
          </Text>
        )}
        {!isMe && !onPress && <View style={{ height: 18 }} />}

        {/* Avatar principal */}
        <Avatar
          name={participant.name}
          size={68}
          isOnline={participant.isOnline}
          effects={participant.activeEffects}
        />

        {/* Nom */}
        <Text
          style={{
            fontSize: 13,
            fontWeight: '700',
            color: '#FFF',
            marginTop: 10,
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 1 },
            textShadowRadius: 4,
          }}
          numberOfLines={1}
        >
          {participant.name}
        </Text>

        {/* Statut */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 }}>
          <View
            style={{
              width: 6,
              height: 6,
              borderRadius: 3,
              backgroundColor: participant.isOnline ? '#4CAF50' : '#888',
            }}
          />
          <Text style={{ fontSize: 10, color: participant.isOnline ? 'rgba(144,238,144,0.9)' : 'rgba(255,255,255,0.4)' }}>
            {participant.isOnline ? 'En ligne' : 'Absent'}
          </Text>
        </View>

        {/* Offrandes reçues — emojis lisibles, attachés visuellement */}
        <View style={{ height: 26, marginTop: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3 }}>
          {recentGifts.map(g => (
            <Text key={g.id} style={{ fontSize: 15 }}>{g.emoji}</Text>
          ))}
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
}

// Ligne d'événement dans le log d'interactions
function InteractionLogItem({ message }: { message: Message }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(translateX, { toValue: 0, duration: 300, easing: Easing.out(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, []);

  const timeStr = new Date(message.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

  return (
    <Animated.View
      style={{
        opacity,
        transform: [{ translateX }],
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: '#F0F0F0',
        gap: 10,
      }}
    >
      <Text style={{ fontSize: 20 }}>{message.giftData?.emoji ?? '✨'}</Text>
      <Text style={{ flex: 1, fontSize: 13, color: '#555', lineHeight: 18 }}>
        {message.text ?? message.content}
      </Text>
      <Text style={{ fontSize: 10, color: '#CCC' }}>{timeStr}</Text>
    </Animated.View>
  );
}

// Layout Horizontal complet — présence et interactions uniquement
function HorizontalLayout({
  salon,
  participants,
  messages,
  coins,
  openOffrandes,
  giftFlights,
  giftPositions,
  showOfferings,
  setShowOfferings,
  defaultRecipient,
  handleSendOffering,
  insets,
  myName,
}: LayoutProps) {
  const gradient = salon.gradient as [string, string];
  const isMetal = salon.type === 'metal';

  // Seulement les événements d'offrandes/magie — pas de texte
  const interactions = useMemo(
    () => messages.filter(m => m.isSystem).slice(-20).reverse(),
    [messages]
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#111' }}>
      {/* Header */}
      <LinearGradient
        colors={gradient}
        style={{
          paddingTop: insets.top + 6,
          paddingBottom: 14,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
        }}
      >
        <TouchableOpacity
          style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}
        >
          <Text style={{ color: '#FFF', fontSize: 18, fontWeight: '700' }}>←</Text>
        </TouchableOpacity>

        <Text style={{ flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#FFF' }}>
          {salon.icon} {salon.name}
        </Text>

        <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Zone de présence — les avatars sont la structure principale */}
      <LinearGradient
        colors={[gradient[0], gradient[1], 'rgba(0,0,0,0.85)']}
        locations={[0, 0.55, 1]}
        style={{ paddingBottom: 6 }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 8 }}
          bounces={false}
        >
          {participants.map(p => (
            <HorizontalParticipantCard
              key={p.id}
              participant={p}
              isMe={p.isMe}
              onPress={!p.isMe ? () => openOffrandes(p) : undefined}
              accentBg={gradient[0]}
            />
          ))}
        </ScrollView>
      </LinearGradient>

      {/* Log des interactions — zone lisible, légère */}
      <View style={{ flex: 1, backgroundColor: '#FAFAFA' }}>
        <View style={{ paddingHorizontal: 20, paddingVertical: 12 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#BBB', letterSpacing: 0.8 }}>
            INTERACTIONS RÉCENTES
          </Text>
        </View>

        {interactions.length === 0 ? (
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 }}>
            <Text style={{ fontSize: 36, marginBottom: 12 }}>🎁</Text>
            <Text style={{ fontSize: 15, color: '#CCC', fontStyle: 'italic', textAlign: 'center' }}>
              Offrez quelque chose pour commencer…
            </Text>
            <Text style={{ fontSize: 12, color: '#DDD', marginTop: 8, textAlign: 'center' }}>
              Appuyez sur un avatar pour envoyer une offrande
            </Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false}>
            {interactions.map(m => (
              <InteractionLogItem key={m.id} message={m} />
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
        )}
      </View>

      {/* Boutons d'action — en bas, sans InputBar texte */}
      <View
        style={{
          backgroundColor: '#FFF',
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: '#E8E8E8',
          paddingTop: 12,
          paddingBottom: Math.max(insets.bottom, 14),
          paddingHorizontal: 20,
          flexDirection: 'row',
          gap: 12,
        }}
      >
        <TouchableOpacity
          onPress={() => openOffrandes()}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#FFF3E0',
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#FFD54F',
          }}
        >
          <Text style={{ fontSize: 20 }}>🎁</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#E65100' }}>Offrir</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => openOffrandes()}
          style={{
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            backgroundColor: '#F3E5F5',
            paddingVertical: 14,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: '#CE93D8',
          }}
        >
          <Text style={{ fontSize: 20 }}>✨</Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: '#6A1B9A' }}>Magie</Text>
        </TouchableOpacity>
      </View>

      <GiftFlightOverlay flights={giftFlights} positions={giftPositions} />

      <OfferingsModal
        visible={showOfferings}
        onClose={() => setShowOfferings(false)}
        participants={participants}
        myName={myName}
        coins={coins}
        isMetal={isMetal}
        onSend={handleSendOffering}
        defaultRecipient={defaultRecipient}
      />
    </View>
  );
}

// ── Type partagé des props de layout ─────────────────────────────────────────

interface LayoutProps {
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
  giftPositions: { x: number; y: number }[];
  showOfferings: boolean;
  setShowOfferings: (v: boolean) => void;
  defaultRecipient: Participant | null;
  handleSendOffering: (recipient: Participant, item: any) => void;
  insets: ReturnType<typeof useSafeAreaInsets>;
}

// ══════════════════════════════════════════════════════════════════════════════
// ÉCRAN PRINCIPAL ─ dispatch selon salon.layout
// ══════════════════════════════════════════════════════════════════════════════

export default function SalonDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  const { currentUser, coins, removeCoins, addMessage, messagesBySalon, loadMessages } = useStore();

  const salonId = params.id as string;
  const salon = salonsData.find(s => s.id === salonId);

  const [messageInput, setMessageInput] = useState('');
  const [showOfferings, setShowOfferings] = useState(false);
  const [defaultRecipient, setDefaultRecipient] = useState<Participant | null>(null);
  const [giftFlights, setGiftFlights] = useState<GiftFlight[]>([]);
  const [giftPositions, setGiftPositions] = useState<{ x: number; y: number }[]>([]);

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
    base.push({ id: 'me', name: myName, isOnline: true, isMe: true, recentInteractions: [], activeEffects: [] });
    return base;
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

      const interaction: Interaction = { id: Date.now().toString(), emoji: item.emoji, from: myName, timestamp: Date.now() };

      setParticipants(prev =>
        prev.map(p =>
          p.id === recipient.id
            ? { ...p, recentInteractions: [...p.recentInteractions, interaction].slice(-6) }
            : p
        )
      );

      addMessage(salonId, {
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
      });

      const fromIdx = participants.findIndex(p => p.isMe);
      const toIdx = participants.findIndex(p => p.id === recipient.id);
      if (fromIdx >= 0 && toIdx >= 0) launchGiftFlight(fromIdx, toIdx, item.emoji);

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

  const layoutProps: LayoutProps = {
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
    giftPositions,
    showOfferings,
    setShowOfferings,
    defaultRecipient,
    handleSendOffering,
    insets,
  };

  return salon.layout === 'vertical'
    ? <VerticalLayout {...layoutProps} />
    : <HorizontalLayout {...layoutProps} />;
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
