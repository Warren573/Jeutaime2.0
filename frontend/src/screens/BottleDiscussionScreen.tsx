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
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Retour</Text>
        </TouchableOpacity>
      </View>

      {/* Bottle Info */}
      <View style={styles.bottleInfo}>
        <Text style={styles.bottleGender}>{bottle.targetGender}</Text>
        <Text style={styles.bottleDetails}>
          , {bottle.senderCity}
        </Text>
      </View>

      <View style={styles.bottleMessage}>
        <Text style={styles.bottleMessageLabel}>Message original:</Text>
        <Text style={styles.bottleMessageText}>"{bottle.message}"</Text>
      </View>

      {/* Dernier message déroulé sur un vrai parchemin.
          Le texte est calé dans la zone d'écriture, entre les deux rouleaux. */}
      <ScrollView
        style={styles.lastMessageArea}
        contentContainerStyle={styles.lastMessageContent}
        showsVerticalScrollIndicator={false}
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
                paddingTop: scrollH * 0.26,
                paddingBottom: scrollH * 0.24,
                paddingHorizontal: scrollW * 0.16,
              },
            ]}
          >
            {lastMsg === null ? (
              <Text style={styles.parchmentEmpty}>
                Aucun mot encore.{'\n'}Glisse le premier{'\n'}dans la bouteille…
              </Text>
            ) : (
              <>
                <Text style={styles.lastMsgSender}>
                  {lastMsgMine ? 'Toi' : 'Message reçu'}
                </Text>
                <Text style={styles.parchmentText} numberOfLines={6}>
                  {lastMsg.content}
                </Text>
                <Text style={styles.lastMsgTime}>
                  {new Date(lastMsg.createdAt).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </>
            )}
          </View>
        </ImageBackground>

        {messages.length > 1 && (
          <TouchableOpacity
            style={styles.historyHintBtn}
            onPress={() => setShowHistory(true)}
          >
            <Text style={styles.historyHintText}>
              📜 Voir l'historique ({messages.length})
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Input */}
      <View style={[styles.inputSection, { paddingBottom: insets.bottom + 12 }]}>
        <TextInput
          style={styles.messageInput}
          placeholder="Écris un mot à glisser dans la bouteille…"
          placeholderTextColor="#9C8560"
          value={messageText}
          onChangeText={setMessageText}
          multiline
          numberOfLines={3}
          maxLength={500}
        />
        <Text
          style={[
            styles.charCount,
            charRemaining < 50 && styles.charCountWarning,
          ]}
        >
          {charRemaining}
        </Text>

        <TouchableOpacity
          style={[styles.sendBtn, (isSending || !messageText.trim()) && styles.sendBtnDisabled]}
          onPress={handleSendMessage}
          disabled={isSending || !messageText.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={COLORS.card} />
          ) : (
            <Text style={styles.sendBtnText}>Envoyer</Text>
          )}
        </TouchableOpacity>

        {/* Reveal Actions */}
        {bottle?.status === 'ACCEPTED' && (
          <View style={styles.revealSection}>
            {hasRevealRequest && isRevealRequester ? (
              <View>
                <Text style={styles.revealText}>Demande de dévoilement en attente...</Text>
              </View>
            ) : hasRevealRequest && !isRevealRequester ? (
              <View style={styles.revealActions}>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.acceptBtn]}
                  onPress={handleAcceptReveal}
                >
                  <Text style={styles.actionBtnText}>Accepter le dévoilement</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, styles.refuseBtn]}
                  onPress={handleRefuseReveal}
                >
                  <Text style={styles.actionBtnText}>Refuser</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.actionBtn, styles.revealBtn]}
                onPress={handleRequestReveal}
              >
                <Text style={styles.actionBtnText}>Proposer le dévoilement</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleReport}>
            <Text style={styles.actionBtnText}>Signaler</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.breakBtn]} onPress={handleBreakBottle}>
            <Text style={styles.actionBtnText}>Rompre</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>

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
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,162,90,0.35)',
  },
  headerBack: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
  },
  bottleInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(200,162,90,0.35)',
  },
  bottleGender: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottleDetails: {
    fontSize: 14,
    color: COLORS.textSecondary,
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
    alignItems: 'center',
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
    fontSize: 17,
    color: '#3A2C18',
    lineHeight: 26,
    fontStyle: 'italic',
    textAlign: 'center',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  },
  lastMsgSender: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7A5E2E',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  lastMsgTime: {
    fontSize: 11,
    color: '#8A6E3C',
    marginTop: 12,
    textAlign: 'center',
  },
  historyHintBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(200,162,90,0.30)',
    borderWidth: 1,
    borderColor: '#C8A25A',
  },
  historyHintText: {
    fontSize: 12,
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
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(200,162,90,0.35)',
    backgroundColor: 'rgba(245,241,232,0.82)',
  },
  messageInput: {
    minHeight: 90,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: '#F3E7C6',
    borderWidth: 2,
    borderColor: '#C8A25A',
    fontSize: 15,
    lineHeight: 22,
    color: '#4A3A28',
    fontStyle: 'italic',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    marginBottom: 6,
    textAlignVertical: 'top',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginBottom: 8,
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
