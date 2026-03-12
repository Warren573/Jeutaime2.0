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

// Grille d'offrandes 2x3 (2 colonnes, 3 lignes)
const OfferingsGrid = ({ offerings }: { offerings: { emoji: string }[] }) => {
  const slots = Array(6).fill(null).map((_, i) => offerings[i] || null);
  
  return (
    <View style={styles.offeringsGrid}>
      {slots.map((item, idx) => (
        <View key={idx} style={styles.offeringSlot}>
          {item && <Text style={styles.offeringEmoji}>{item.emoji}</Text>}
        </View>
      ))}
    </View>
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

  // 4 joueurs
  const [players, setPlayers] = useState<Player[]>([
    { id: 'p1', name: 'Sophie', online: true, offerings: [] },
    { id: 'p2', name: 'Emma', online: true, offerings: [] },
    { id: 'p3', name: 'Alex', online: true, offerings: [] },
    { id: 'me', name: currentUser?.name || 'Vous', online: true, isMe: true, offerings: [] },
  ]);

  const sophie = players[0];
  const emma = players[1];
  const alex = players[2];
  const vous = players[3];

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
      salonId: 'cafe_paris',
      userId: currentUser?.id || 'me',
      userName: currentUser?.name || 'Vous',
      username: currentUser?.name || 'Vous',
      content: messageInput.trim(),
      text: messageInput.trim(),
      timestamp: Date.now(),
      type: 'message',
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
      text: `${currentUser?.name || 'Vous'} → ${item.emoji} → ${selectedPlayer.name}`,
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
      text: `${currentUser?.name || 'Vous'} a lancé ${item.emoji} sur ${selectedPlayer.name}!`,
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
        <View style={styles.systemMsg}>
          <Text style={styles.systemMsgText}>{item.text}</Text>
        </View>
      );
    }

    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        <View style={[styles.msgBubble, isOwn && styles.msgBubbleOwn]}>
          <Text style={styles.msgAuthor}>{item.username}</Text>
          <Text style={[styles.msgText, isOwn && styles.msgTextOwn]}>{item.text}</Text>
        </View>
      </View>
    );
  };

  const openModal = (player: Player, type: 'offerings' | 'magic') => {
    if (player.isMe) return;
    setSelectedPlayer(player);
    if (type === 'offerings') setShowOfferingsModal(true);
    else setShowMagicModal(true);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <LinearGradient colors={['#8D6E63', '#5D4037']} style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>☕ Café de Paris</Text>
        <View style={styles.coinsBadge}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </LinearGradient>

      {/* Zone de jeu */}
      {!isKeyboardVisible ? (
        <View style={styles.gameArea}>
          {/* LIGNE 1 : Sophie (gauche) ----------- Emma (droite) */}
          <View style={styles.topRow}>
            {/* Sophie : avatar + grille à DROITE */}
            <TouchableOpacity style={styles.playerLeft} onPress={() => openModal(sophie, 'offerings')}>
              <View style={styles.avatarBox}>
                <Avatar name={sophie.name} size={48} transformation={sophie.transformation} />
                {sophie.online && <View style={styles.onlineDot} />}
              </View>
              <Text style={styles.playerName}>{sophie.name}</Text>
              <OfferingsGrid offerings={sophie.offerings} />
            </TouchableOpacity>

            {/* Emma : grille à GAUCHE + avatar */}
            <TouchableOpacity style={styles.playerRight} onPress={() => openModal(emma, 'offerings')}>
              <OfferingsGrid offerings={emma.offerings} />
              <View style={styles.avatarBox}>
                <Avatar name={emma.name} size={48} transformation={emma.transformation} />
                {emma.online && <View style={styles.onlineDot} />}
              </View>
              <Text style={styles.playerName}>{emma.name}</Text>
            </TouchableOpacity>
          </View>

          {/* LIGNE 2 : DISCUSSION HORIZONTALE */}
          <View style={styles.chatArea}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.chatContent}
              onContentSizeChange={scrollToEnd}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Commencez la discussion! ☕</Text>
              }
            />
          </View>

          {/* LIGNE 3 : Alex (gauche) ----------- Vous (droite) */}
          <View style={styles.bottomRow}>
            {/* Alex : avatar + grille à DROITE */}
            <TouchableOpacity style={styles.playerLeft} onPress={() => openModal(alex, 'offerings')}>
              <View style={styles.avatarBox}>
                <Avatar name={alex.name} size={48} transformation={alex.transformation} />
                {alex.online && <View style={styles.onlineDot} />}
              </View>
              <Text style={styles.playerName}>{alex.name}</Text>
              <OfferingsGrid offerings={alex.offerings} />
            </TouchableOpacity>

            {/* Vous : grille à GAUCHE + avatar */}
            <View style={styles.playerRight}>
              <OfferingsGrid offerings={vous.offerings} />
              <View style={styles.avatarBox}>
                <Avatar name={vous.name} size={48} />
                <Text style={styles.meBadge}>👑</Text>
              </View>
              <Text style={styles.playerName}>{vous.name}</Text>
            </View>
          </View>

          {/* Boutons Offrandes / Magie */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.offeringsBtn} onPress={() => setShowOfferingsModal(true)}>
              <Text style={styles.btnText}>🎁 Offrandes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.magicBtn} onPress={() => setShowMagicModal(true)}>
              <Text style={styles.btnTextWhite}>✨ Magie</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        /* Quand clavier visible : juste le chat */
        <View style={styles.chatOnly}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.chatContent}
            onContentSizeChange={scrollToEnd}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Zone de saisie */}
      <View style={[styles.inputRow, { paddingBottom: Math.max(insets.bottom, 8) }]}>
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
        <TouchableOpacity style={styles.sendBtn} onPress={sendMessage}>
          <Text style={styles.sendBtnText}>➤</Text>
        </TouchableOpacity>
      </View>

      {/* Modal Offrandes */}
      <Modal visible={showOfferingsModal} transparent animationType="slide">
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {selectedPlayer ? `🎁 → ${selectedPlayer.name}` : '🎁 Offrandes'}
              </Text>
              <TouchableOpacity onPress={() => { setShowOfferingsModal(false); setSelectedPlayer(null); }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedPlayer ? (
              <View style={styles.selectPlayer}>
                <Text style={styles.selectLabel}>Choisir un joueur</Text>
                <View style={styles.selectRow}>
                  {players.filter(p => !p.isMe).map(p => (
                    <TouchableOpacity key={p.id} style={styles.selectItem} onPress={() => setSelectedPlayer(p)}>
                      <Avatar name={p.name} size={45} transformation={p.transformation} />
                      <Text style={styles.selectName}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <ScrollView style={styles.itemsScroll}>
                <Text style={styles.catTitle}>🍹 Boissons</Text>
                <View style={styles.itemsWrap}>
                  {allOfferings.filter(o => o.category === 'boisson').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemBox, coins < o.cost && styles.itemOff]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemIcon}>{o.emoji}</Text>
                      <Text style={styles.itemLabel}>{o.name}</Text>
                      <Text style={styles.itemPrice}>{o.cost}💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.catTitle}>🍔 Nourriture</Text>
                <View style={styles.itemsWrap}>
                  {allOfferings.filter(o => o.category === 'nourriture').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemBox, coins < o.cost && styles.itemOff]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemIcon}>{o.emoji}</Text>
                      <Text style={styles.itemLabel}>{o.name}</Text>
                      <Text style={styles.itemPrice}>{o.cost}💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.catTitle}>💌 Symbolique</Text>
                <View style={styles.itemsWrap}>
                  {allOfferings.filter(o => o.category === 'symbolique').map(o => (
                    <TouchableOpacity
                      key={o.id}
                      style={[styles.itemBox, coins < o.cost && styles.itemOff]}
                      onPress={() => handleSendOffering(o)}
                      disabled={coins < o.cost}
                    >
                      <Text style={styles.itemIcon}>{o.emoji}</Text>
                      <Text style={styles.itemLabel}>{o.name}</Text>
                      <Text style={styles.itemPrice}>{o.cost}💰</Text>
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
        <View style={styles.modalBg}>
          <View style={styles.modalBox}>
            <View style={styles.modalHead}>
              <Text style={styles.modalTitle}>
                {selectedPlayer ? `✨ → ${selectedPlayer.name}` : '✨ Magie'}
              </Text>
              <TouchableOpacity onPress={() => { setShowMagicModal(false); setSelectedPlayer(null); }}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>

            {!selectedPlayer ? (
              <View style={styles.selectPlayer}>
                <Text style={styles.selectLabel}>Choisir une cible</Text>
                <View style={styles.selectRow}>
                  {players.filter(p => !p.isMe).map(p => (
                    <TouchableOpacity key={p.id} style={styles.selectItem} onPress={() => setSelectedPlayer(p)}>
                      <Avatar name={p.name} size={45} transformation={p.transformation} />
                      <Text style={styles.selectName}>{p.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              <ScrollView style={styles.itemsScroll}>
                <Text style={styles.catTitle}>🐸 Transformations</Text>
                <View style={styles.itemsWrap}>
                  {allPowers.filter(p => p.type === 'transformation').map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.itemBox, styles.magicBox, coins < p.cost && styles.itemOff]}
                      onPress={() => handleUseMagic(p)}
                      disabled={coins < p.cost}
                    >
                      <Text style={styles.itemIcon}>{p.emoji}</Text>
                      <Text style={styles.itemLabel}>{p.name}</Text>
                      <Text style={styles.itemPrice}>{p.cost}💰</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.catTitle}>✨ Effets</Text>
                <View style={styles.itemsWrap}>
                  {allPowers.filter(p => p.type === 'effect' || p.type === 'weather').map(p => (
                    <TouchableOpacity
                      key={p.id}
                      style={[styles.itemBox, styles.magicBox, coins < p.cost && styles.itemOff]}
                      onPress={() => handleUseMagic(p)}
                      disabled={coins < p.cost}
                    >
                      <Text style={styles.itemIcon}>{p.emoji}</Text>
                      <Text style={styles.itemLabel}>{p.name}</Text>
                      <Text style={styles.itemPrice}>{p.cost}💰</Text>
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
  container: { flex: 1, backgroundColor: '#4E342E' },
  
  // Header
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingBottom: 10 },
  backBtn: { position: 'absolute', left: 12, top: 48, width: 34, height: 34, borderRadius: 17, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  backBtnText: { fontSize: 18, fontWeight: '700', color: '#5D4037' },
  title: { fontSize: 18, fontWeight: '700', color: '#FFF', marginTop: 6 },
  coinsBadge: { position: 'absolute', right: 12, top: 48, backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  coinsText: { fontSize: 13, fontWeight: '700', color: '#DAA520' },

  // Zone de jeu
  gameArea: { flex: 1, padding: 8 },
  
  // Rangées joueurs
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  bottomRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  
  // Joueur gauche : avatar + nom puis grille
  playerLeft: { flexDirection: 'row', alignItems: 'center' },
  // Joueur droite : grille puis avatar + nom
  playerRight: { flexDirection: 'row', alignItems: 'center' },
  
  avatarBox: { alignItems: 'center', marginHorizontal: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700' },
  playerName: { color: '#FFF', fontSize: 10, fontWeight: '600', marginTop: 2 },
  meBadge: { fontSize: 10, marginTop: 1 },
  onlineDot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#4CAF50', borderWidth: 2, borderColor: '#4E342E' },

  // Grille d'offrandes 2x3
  offeringsGrid: { flexDirection: 'row', flexWrap: 'wrap', width: 56, height: 78 },
  offeringSlot: { width: 26, height: 24, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 4, margin: 1, alignItems: 'center', justifyContent: 'center' },
  offeringEmoji: { fontSize: 14 },

  // Zone de chat
  chatArea: { flex: 1, backgroundColor: '#FFF', borderRadius: 10, marginVertical: 6, overflow: 'hidden' },
  chatOnly: { flex: 1, backgroundColor: '#FFF', marginHorizontal: 8, borderRadius: 10, overflow: 'hidden' },
  chatContent: { padding: 8 },
  emptyText: { textAlign: 'center', color: '#8B6F47', fontStyle: 'italic', paddingVertical: 16 },
  
  msgRow: { marginBottom: 6, alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  msgBubble: { backgroundColor: '#F0F0F0', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12, maxWidth: '85%' },
  msgBubbleOwn: { backgroundColor: '#8D6E63' },
  msgAuthor: { fontSize: 9, color: '#888', marginBottom: 2 },
  msgText: { fontSize: 13, color: '#333' },
  msgTextOwn: { color: '#FFF' },
  systemMsg: { alignItems: 'center', marginVertical: 6 },
  systemMsgText: { fontSize: 11, color: '#DAA520', fontWeight: '600', backgroundColor: 'rgba(255,215,0,0.15)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  // Boutons action
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 6 },
  offeringsBtn: { flex: 1, backgroundColor: '#FFD700', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  magicBtn: { flex: 1, backgroundColor: '#7B1FA2', paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  btnText: { fontSize: 14, fontWeight: '700', color: '#3A2818' },
  btnTextWhite: { fontSize: 14, fontWeight: '700', color: '#FFF' },

  // Input
  inputRow: { flexDirection: 'row', paddingHorizontal: 8, paddingTop: 8, backgroundColor: '#3E2723', gap: 8 },
  input: { flex: 1, backgroundColor: '#FFF', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: '#333' },
  sendBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#8D6E63', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { fontSize: 18, color: '#FFF' },

  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  modalBox: { backgroundColor: '#FFF8E7', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '75%', paddingBottom: 24 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  modalTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818' },
  closeX: { fontSize: 20, color: '#8B6F47', fontWeight: '600' },
  
  selectPlayer: { padding: 14 },
  selectLabel: { fontSize: 14, fontWeight: '600', color: '#5D4037', marginBottom: 10 },
  selectRow: { flexDirection: 'row', justifyContent: 'space-around' },
  selectItem: { alignItems: 'center', padding: 8, backgroundColor: '#FFF', borderRadius: 10 },
  selectName: { marginTop: 4, fontSize: 11, fontWeight: '600', color: '#3A2818' },
  
  itemsScroll: { paddingHorizontal: 14 },
  catTitle: { fontSize: 14, fontWeight: '700', color: '#5D4037', marginTop: 14, marginBottom: 8 },
  itemsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  itemBox: { width: (SCREEN_WIDTH - 56) / 3, backgroundColor: '#FFF', borderRadius: 10, padding: 8, alignItems: 'center' },
  magicBox: { backgroundColor: '#F3E5F5' },
  itemOff: { opacity: 0.4 },
  itemIcon: { fontSize: 24, marginBottom: 2 },
  itemLabel: { fontSize: 9, fontWeight: '600', color: '#3A2818', textAlign: 'center' },
  itemPrice: { fontSize: 9, color: '#DAA520', fontWeight: '700', marginTop: 2 },
});
