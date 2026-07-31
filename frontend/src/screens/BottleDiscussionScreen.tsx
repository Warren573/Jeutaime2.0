import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Image,
  Modal,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
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

// Papier à lettres « Bouteille à la mer » : sert à la fois de fond plein écran
// ET de surface d'écriture (on écrit sur les lignes réglées au centre).
const LETTER_BG = require('../../assets/images/bottle/letter-bg.jpg');

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
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const { currentUser } = useStore();
  const textInputRef = useRef<TextInput>(null);

  const [bottle, setBottle] = useState<InboxBottleDTO | null>(null);
  const [messages, setMessages] = useState<BottleMessageDTO[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasRevealRequest, setHasRevealRequest] = useState(false);
  const [isRevealRequester, setIsRevealRequester] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // Dismiss keyboard when screen comes into focus
      Keyboard.dismiss();

      // Small delay to ensure proper re-rendering
      const timer = setTimeout(() => {
        if (textInputRef.current) {
          // Force the TextInput to re-render by toggling focus
          textInputRef.current.blur();
        }
      }, 100);

      return () => clearTimeout(timer);
    }, [])
  );

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

  return (
    <>
      {/* Papier à lettres épinglé au viewport : fond + surface d'écriture. */}
      <View style={styles.letterBgLayer} pointerEvents="none">
        <Image source={LETTER_BG} style={styles.letterBgImage} resizeMode="cover" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
      {/* Header : retour, titre au centre, menu « … » à droite */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBack}>←</Text>
          </TouchableOpacity>
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

<<<<<<< HEAD
      {/* Historique des messages */}
      <ScrollView style={styles.messagesScroll} contentContainerStyle={styles.messagesContent}>
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

      {/* Zone d'écriture : champ de saisie standard */}
      <View style={[styles.inputArea, { paddingBottom: insets.bottom + 10 }]}>
=======
      {/* Zone de composition - JUSTE les lignes */}
      <View style={styles.mainScroll}>
>>>>>>> main
        <TextInput
          ref={textInputRef}
          style={styles.messageInput}
          placeholder="Écris ton message..."
          placeholderTextColor={COLORS.textSecondary}
          value={messageText}
          onChangeText={setMessageText}
          multiline
          maxLength={500}
          editable={!isSending}
<<<<<<< HEAD
        />
        <View style={styles.inputFooter}>
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
=======
          underlineColorAndroid="transparent"
          selectionColor="transparent"
          scrollEnabled={false}
          keyboardType="default"
        />
      </View>

      {/* Contrôles en bas - hors de la zone d'écriture */}
      <View style={styles.bottomControls}>
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
            <Text style={styles.sendBtnText}>Glisser</Text>
          )}
        </TouchableOpacity>
>>>>>>> main
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

    </>
  );
}

const styles = StyleSheet.create({
  // Papier à lettres épinglé au viewport (fixed sur le web, absolute en natif).
  letterBgLayer:
    Platform.OS === 'web'
      ? ({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 0 } as any)
      : { ...StyleSheet.absoluteFillObject, zIndex: 0 },
  letterBgImage: {
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
<<<<<<< HEAD
  messagesScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  messagesContent: {
    paddingVertical: 8,
=======
  mainScroll: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  bottomControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
>>>>>>> main
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
<<<<<<< HEAD
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  inputFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  messageInput: {
    minHeight: 60,
    maxHeight: 120,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    color: COLORS.text,
    backgroundColor: COLORS.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    textAlignVertical: 'top',
=======
  messageInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 30,
    color: '#2A1C0C',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    fontStyle: 'italic',
    textAlignVertical: 'top',
    paddingHorizontal: 24,
    paddingTop: 200,
    paddingBottom: 20,
    margin: 0,
    ...(Platform.OS === 'web' ? {
      outlineWidth: 0,
      outline: 'none',
      boxShadow: 'none',
    } as any : null),
>>>>>>> main
  },
  charCount: {
    fontSize: 11,
    color: '#8A6E3C',
    marginBottom: 0,
    flex: 1,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
<<<<<<< HEAD
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
=======
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
    justifyContent: 'center',
>>>>>>> main
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
<<<<<<< HEAD
    fontSize: 13,
    fontWeight: '600',
=======
    fontSize: 14,
    fontWeight: '700',
>>>>>>> main
    color: COLORS.card,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
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
});
