import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  getBottleById,
  getBottleMessages,
  postBottleMessage,
  markBottleAsRead,
  requestReveal,
  acceptReveal,
  refuseReveal,
  breakBottle,
  getRevealStatus,
  InboxBottleDTO,
  BottleMessageDTO,
} from '../api/bottles';

// Fond aquarelle plein écran (partagé avec l'écran de création).
const SEA_BG = require('../../assets/images/bottle/sea-bg.jpg');
// Vrai parchemin déroulé (fond transparent) pour présenter le dernier message.
const PARCHMENT_SCROLL = require('../../assets/images/bottle/parchment-scroll.png');

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
  myMessage: '#8B2E3C',
  otherMessage: '#E8CFCF',
};

export default function BottleDiscussionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width: winWidth } = useWindowDimensions();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const { currentUser } = useStore();

  const [bottle, setBottle] = useState<InboxBottleDTO | null>(null);
  const [messages, setMessages] = useState<BottleMessageDTO[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasRevealRequest, setHasRevealRequest] = useState(false);
  const [isRevealRequester, setIsRevealRequester] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const loadData = useCallback(async () => {
    try {
      if (!bottleId) return;

      // Load bottle details (accessible à l'expéditeur comme à l'accepteur)
      const found = await getBottleById(bottleId);
      if (found) {
        setBottle(found);
      }

      // Load messages
      const msgs = await getBottleMessages(bottleId);
      setMessages(msgs);

      // Load reveal status
      const revealStatus = await getRevealStatus(bottleId);
      setHasRevealRequest(revealStatus.hasPendingRequest);
      setIsRevealRequester(revealStatus.isRequester);

      // Mark bottle as read
      await markBottleAsRead(bottleId);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger la discussion');
    } finally {
      setIsLoading(false);
    }
  }, [bottleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSendMessage = async () => {
    if (!messageText.trim()) {
      Alert.alert('Erreur', 'Écris un message');
      return;
    }

    if (messageText.length > 500) {
      Alert.alert('Erreur', `Maximum 500 caractères (tu as ${messageText.length})`);
      return;
    }

    setIsSending(true);
    try {
      const newMsg = await postBottleMessage(bottleId, messageText.trim());
      setMessages([...messages, newMsg]);
      setMessageText('');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur d\'envoi');
    } finally {
      setIsSending(false);
    }
  };

  const handleReport = async () => {
    Alert.alert(
      'Signaler cette conversation?',
      'La personne sera notifiée et pourra être suspendue après 3 signalements.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Signaler',
          style: 'destructive',
          onPress: async () => {
            try {
              // TODO: Call API endpoint to report
              Alert.alert('Succès', 'Conversation signalée');
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de signaler');
            }
          },
        },
      ]
    );
  };

  const handleArchive = () => {
    Alert.alert(
      'Archiver cette discussion?',
      'Elle sera masquée de la liste des discussions.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Archiver',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Succès', 'Discussion archivée');
            router.back();
          },
        },
      ]
    );
  };

  const handleRequestReveal = async () => {
    try {
      await requestReveal(bottleId);
      setHasRevealRequest(true);
      setIsRevealRequester(true);
      Alert.alert('Dévoilement demandé', 'En attente de réponse...');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de demander le dévoilement');
    }
  };

  const handleAcceptReveal = async () => {
    try {
      const result = await acceptReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement accepté! Redirection vers la discussion privée...');

      // Redirect to private conversation after a short delay
      if (result.matchId) {
        setTimeout(() => {
          router.push(`/match-profile?matchId=${result.matchId}`);
        }, 500);
      } else {
        setBottle(prev => prev ? { ...prev, status: 'REVEALED' } : null);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible d\'accepter le dévoilement');
    }
  };

  const handleRefuseReveal = async () => {
    try {
      await refuseReveal(bottleId);
      setHasRevealRequest(false);
      Alert.alert('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Impossible de refuser le dévoilement');
    }
  };

  const handleBreakBottle = () => {
    Alert.alert(
      'Rompre cette correspondance?',
      'Cela fermera définitivement la discussion. Aucun nouveau message ne sera possible.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Rompre',
          style: 'destructive',
          onPress: async () => {
            try {
              await breakBottle(bottleId);
              Alert.alert('Succès', 'Correspondance rompue');
              router.back();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de rompre la correspondance');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!bottle) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <Text style={styles.errorText}>Bouteille non trouvée</Text>
      </View>
    );
  }

  if (bottle.status === 'BROKEN') {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>Cette correspondance a été rompue</Text>
          <TouchableOpacity
            style={[styles.sendBtn, { marginTop: 20 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.sendBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (bottle.status === 'REVEALED') {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 }]}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: COLORS.text, marginBottom: 10 }}>
            ✨ Dévoilement accepté!
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, textAlign: 'center', marginBottom: 20 }}>
            Cette correspondance anonyme est devenue une discussion privée classique.
          </Text>
          <TouchableOpacity
            style={[styles.sendBtn]}
            onPress={() => router.back()}
          >
            <Text style={styles.sendBtnText}>Retour</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const charRemaining = 500 - messageText.length;

  const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
  const lastMsgMine = lastMsg ? lastMsg.senderId === currentUser?.id : false;

  // Dimensions du parchemin (mêmes proportions que l'asset 760×1140 → ratio 1.5)
  // pour placer le texte pile dans la zone d'écriture entre les deux rouleaux.
  const scrollW = Math.min(winWidth - 40, 380);
  const scrollH = scrollW * 1.5;

  return (
    <>
      {/* Fond aquarelle épinglé au viewport (fixed web / absolute natif). */}
      <View style={styles.seaBgLayer} pointerEvents="none">
        <Image source={SEA_BG} style={styles.seaBgImage} resizeMode="cover" />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(245,241,232,0.55)' },
          ]}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      {/* Header : retour + historique (📜) à gauche, titre au centre, menu « … » à droite */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBack}>←</Text>
          </TouchableOpacity>
          {messages.length > 0 && (
            <TouchableOpacity
              onPress={() => setShowHistory(true)}
              style={styles.historyEmojiBtn}
              hitSlop={{ top: 10, bottom: 10, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel="Voir l'historique des messages"
            >
              <Text style={styles.historyEmoji}>📜</Text>
              {messages.length > 1 && (
                <Text style={styles.historyEmojiCount}>{messages.length}</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.headerTitle}>
          <Text style={styles.bottleGender} numberOfLines={1}>
            {bottle.targetGender}
            <Text style={styles.bottleDetails}>  ·  {bottle.senderCity}</Text>
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setShowMenu(true)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Options de la correspondance"
        >
          <Text style={styles.menuDots}>⋯</Text>
        </TouchableOpacity>
      </View>

      {/* Parchemin : dernier message + zone d'écriture, le tout SUR le parchemin. */}
      <ScrollView
        style={styles.lastMessageArea}
        contentContainerStyle={styles.lastMessageContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <ImageBackground
          source={PARCHMENT_SCROLL}
          resizeMode="stretch"
          style={{ width: scrollW, height: scrollH }}
        >
          <View
            style={[
              styles.scrollWritingArea,
              {
                paddingTop: scrollH * 0.23,
                paddingBottom: scrollH * 0.19,
                paddingHorizontal: scrollW * 0.15,
              },
            ]}
          >
            {/* Dernier message : une ligne d'encre pâlie, comme une note déjà écrite */}
            {lastMsg && (
              <Text style={styles.lastMsgQuote} numberOfLines={2}>
                « {lastMsg.content} »
              </Text>
            )}

            {/* Zone d'écriture : on écrit directement sur le parchemin, à l'encre */}
            <TextInput
              style={styles.messageInput}
              placeholder={
                lastMsg
                  ? 'Écris ta réponse ici…'
                  : 'Écris un mot à glisser\ndans la bouteille…'
              }
              placeholderTextColor="rgba(90,70,32,0.5)"
              value={messageText}
              onChangeText={setMessageText}
              multiline
              maxLength={500}
            />
          </View>
        </ImageBackground>
      </ScrollView>

      {/* Barre d'envoi discrète sous le parchemin */}
      <View style={[styles.inputSection, { paddingBottom: insets.bottom + 10 }]}>
        <Text
          style={[styles.charCount, charRemaining < 50 && styles.charCountWarning]}
        >
          {charRemaining} caractères
        </Text>
        <TouchableOpacity
          style={[styles.sendBtn, (isSending || !messageText.trim()) && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={isSending || !messageText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={COLORS.card} />
          ) : (
            <Text style={styles.sendBtnText}>Glisser dans la bouteille</Text>
          )}
        </TouchableOpacity>
      </View>
      </KeyboardAvoidingView>

      {/* Menu « … » : dévoilement, signaler, rompre — discrets */}
      <Modal
        visible={showMenu}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMenu(false)}
      >
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenu(false)}
        >
          <View style={[styles.menuCard, { top: insets.top + 44 }]}>
            {bottle?.status === 'ACCEPTED' && (
              <>
                {hasRevealRequest && isRevealRequester ? (
                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemDisabled}>Dévoilement en attente…</Text>
                  </View>
                ) : hasRevealRequest && !isRevealRequester ? (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => { setShowMenu(false); handleAcceptReveal(); }}
                    >
                      <Text style={styles.menuItemText}>✨ Accepter le dévoilement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => { setShowMenu(false); handleRefuseReveal(); }}
                    >
                      <Text style={styles.menuItemText}>Refuser le dévoilement</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => { setShowMenu(false); handleRequestReveal(); }}
                  >
                    <Text style={styles.menuItemText}>✨ Proposer le dévoilement</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.menuDivider} />
              </>
            )}
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleReport(); }}
            >
              <Text style={styles.menuItemText}>Signaler</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => { setShowMenu(false); handleBreakBottle(); }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Rompre la correspondance</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Historique complet des messages */}
      <Modal
        visible={showHistory}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHistory(false)}
      >
        <View style={styles.historyBackdrop}>
          <View style={[styles.historySheet, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.historyHeader}>
              <Text style={styles.historyTitle}>📜 Historique</Text>
              <TouchableOpacity onPress={() => setShowHistory(false)}>
                <Text style={styles.historyClose}>Fermer</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.historyList}
              contentContainerStyle={styles.messageContent}
              showsVerticalScrollIndicator={false}
            >
              {messages.map((msg, idx) => {
                const isMyMessage = msg.senderId === currentUser?.id;
                return (
                  <View
                    key={msg.id || idx}
                    style={[
                      styles.messageBubble,
                      isMyMessage ? styles.myMessageBubble : styles.otherMessageBubble,
                    ]}
                  >
                    <Text
                      style={[
                        styles.messageText,
                        isMyMessage && { color: COLORS.card },
                      ]}
                    >
                      {msg.content}
                    </Text>
                    <Text
                      style={[
                        styles.messageTime,
                        isMyMessage ? styles.myMessageTime : styles.otherMessageTime,
                      ]}
                    >
                      {new Date(msg.createdAt).toLocaleTimeString('fr-FR', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  // Fond aquarelle épinglé au viewport (fixed sur le web, absolute en natif).
  seaBgLayer:
    Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 } as any)
      : { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  seaBgImage: {
    width: '100%',
    height: '100%',
  },
  container: {
    flex: 1,
    backgroundColor: 'transparent',
    position: 'relative',
    zIndex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerBack: {
    fontSize: 24,
    color: COLORS.accent,
    fontWeight: '600',
  },
  historyEmojiBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  historyEmoji: {
    fontSize: 22,
  },
  historyEmojiCount: {
    marginLeft: 2,
    marginTop: -8,
    fontSize: 11,
    fontWeight: '700',
    color: '#7A5E2E',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  menuDots: {
    fontSize: 26,
    lineHeight: 26,
    color: COLORS.accent,
    fontWeight: '700',
  },
  bottleGender: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A3A28',
  },
  bottleDetails: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8A6E3C',
  },
  bottleMessage: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(200,162,90,0.35)',
  },
  bottleMessageLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8A6E3C',
    marginBottom: 6,
  },
  bottleMessageText: {
    fontSize: 13,
    color: '#4A3A28',
    fontStyle: 'italic',
  },
  // --- Zone du dernier message (vrai parchemin déroulé) ---
  lastMessageArea: {
    flex: 1,
  },
  lastMessageContent: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
  },
  // Zone d'écriture calée entre les deux rouleaux du parchemin.
  scrollWritingArea: {
    flex: 1,
    justifyContent: 'center',
  },
  // Dernier message, encre pâlie, comme une note déjà tracée sur le papier.
  lastMsgQuote: {
    fontSize: 15,
    lineHeight: 22,
    color: 'rgba(74,58,40,0.6)',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 14,
  },
  parchmentEmpty: {
    fontSize: 15,
    color: '#6B5533',
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  parchmentText: {
    fontSize: 15,
    color: '#3A2C18',
    lineHeight: 22,
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  lastMsgSender: {
    fontSize: 11,
    fontWeight: '700',
    color: '#7A5E2E',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  lastMsgTime: {
    fontSize: 11,
    fontWeight: '400',
    color: '#8A6E3C',
  },
  historyHintText: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '600',
    color: '#5E4620',
  },
  messageScroll: {
    flex: 1,
  },
  messageContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  noMessages: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  noMessagesText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  noMessagesSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  messageBubble: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 8,
    maxWidth: '80%',
  },
  myMessageBubble: {
    alignSelf: 'flex-end',
    backgroundColor: COLORS.myMessage,
  },
  otherMessageBubble: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.otherMessage,
  },
  messageText: {
    fontSize: 14,
    color: COLORS.text,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 11,
    marginTop: 4,
  },
  myMessageTime: {
    color: COLORS.card,
    opacity: 0.7,
  },
  otherMessageTime: {
    color: COLORS.text,
    opacity: 0.6,
  },
  inputSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  // Champ de saisie posé DIRECTEMENT sur le parchemin (pas de cadre),
  // encre bien lisible (foncée, un peu plus grande).
  messageInput: {
    flex: 1,
    minHeight: 90,
    paddingVertical: 4,
    fontSize: 19,
    lineHeight: 28,
    color: '#2A1C0C',
    fontWeight: '500',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    textAlignVertical: 'top',
    ...(Platform.OS === 'web' ? { outlineWidth: 0 } as any : null),
  },
  charCount: {
    fontSize: 11,
    color: '#8A6E3C',
    textAlign: 'center',
    marginBottom: 6,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginBottom: 12,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: COLORS.bg,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
  },
  revealSection: {
    paddingBottom: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  revealText: {
    fontSize: 12,
    color: COLORS.accent,
    textAlign: 'center',
    paddingVertical: 8,
    fontStyle: 'italic',
  },
  revealActions: {
    flexDirection: 'column',
    gap: 8,
    paddingVertical: 8,
  },
  revealBtn: {
    backgroundColor: '#FFD700',
  },
  acceptBtn: {
    backgroundColor: '#4CAF50',
  },
  refuseBtn: {
    backgroundColor: '#F44336',
  },
  breakBtn: {
    backgroundColor: '#FF6B6B',
  },
  // --- Menu « … » (dropdown haut-droit) ---
  menuBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  menuCard: {
    position: 'absolute',
    right: 12,
    minWidth: 230,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(200,162,90,0.4)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 8,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuItemText: {
    fontSize: 14,
    color: '#3A2C18',
    fontWeight: '500',
  },
  menuItemDisabled: {
    fontSize: 14,
    color: '#9C8560',
    fontStyle: 'italic',
  },
  menuItemDanger: {
    color: '#B23A48',
  },
  menuDivider: {
    height: 1,
    backgroundColor: 'rgba(200,162,90,0.3)',
    marginVertical: 4,
  },
  // --- Historique (modal bas de page) ---
  historyBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  historySheet: {
    maxHeight: '78%',
    backgroundColor: '#F5F1E8',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,162,90,0.35)',
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#4A3A28',
  },
  historyClose: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
  },
  historyList: {
    flexGrow: 0,
  },
});
