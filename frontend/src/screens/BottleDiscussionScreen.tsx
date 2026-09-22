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
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
  getCurrentBottle,
  postBottleMessage,
  markBottleAsRead,
  getRevealStatus,
} from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import { BottleCorrespondenceMenu } from '../components/BottleCorrespondenceMenu';
import { generateUUID } from '../utils/uuid';
import type { GetCurrentBottleResponse } from '../api/bottles';

const UI_ICONS = {
  transit: require('../../assets/ui-icons/transit.png'),
  book: require('../../assets/ui-icons/book.png'),
} as const;

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
};

export default function BottleDiscussionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const textInputRef = useRef<TextInput>(null);
  const idempotencyKeyRef = useRef<string>(generateUUID());

  const [bottleState, setBottleState] = useState<GetCurrentBottleResponse | null>(null);
  const [messageText, setMessageText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [hasRevealRequest, setHasRevealRequest] = useState(false);
  const [isRevealRequester, setIsRevealRequester] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showSendPreview, setShowSendPreview] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setShowMenu(false);
      Keyboard.dismiss();
      const timer = setTimeout(() => {
        if (textInputRef.current) {
          textInputRef.current.blur();
        }
      }, 100);
      return () => clearTimeout(timer);
    }, [])
  );

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const current = await getCurrentBottle();
      setBottleState(current);

      if (current.bottle?.id === bottleId) {
        await markBottleAsRead(bottleId);

        const revealStatus = await getRevealStatus(bottleId);
        setHasRevealRequest(revealStatus.hasPendingRequest);
        setIsRevealRequester(revealStatus.isRequester);
      }
    } catch (err: any) {
      console.error('[BottleDiscussionScreen] Error:', err);
      setError(err?.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
    }
  }, [bottleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, () => setIsKeyboardVisible(true));
    const hideSub = Keyboard.addListener(hideEvent, () => setIsKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const validateMessage = () => {
    if (!messageText.trim()) {
      Alert.alert('Erreur', 'Écris un message');
      return false;
    }

    if (messageText.length > 500) {
      Alert.alert('Erreur', `Maximum 500 caractères (tu as ${messageText.length})`);
      return false;
    }

    return true;
  };

  const handleSendPress = () => {
    if (!validateMessage()) return;
    Keyboard.dismiss();
    setShowSendPreview(true);
  };

  const handleSendMessage = async () => {
    if (!validateMessage()) return;

    setShowSendPreview(false);
    setIsSending(true);
    setError(null);

    try {
      await postBottleMessage(bottleId, messageText.trim(), idempotencyKeyRef.current);
      setMessageText('');

      // Refetch /bottles/current pour obtenir le nouvel état
      await loadData();

      // Réinitialiser l'idempotency key pour le prochain envoi
      idempotencyKeyRef.current = generateUUID();
    } catch (err: any) {
      const code = err?.code || err?.message;

      if (code === 'LETTER_TURN_VIOLATION') {
        setError("Ce n'est pas ton tour de répondre. Attends la réponse de l'autre.");
        // Refetch pour obtenir l'état réel
        await loadData();
      } else if (code === 'BOTTLE_NOT_ACTIVE') {
        setError('Cette bouteille n\'est plus active.');
        await loadData();
      } else {
        setError(err?.message || 'Erreur lors de l\'envoi');
      }
    } finally {
      setIsSending(false);
    }
  };


  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!bottleState?.bottle || !bottleState?.latestLetter) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.errorText}>Correspondance non trouvée</Text>
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

  const charRemaining = 500 - messageText.length;
  const canReply = bottleState.canReply;
  const waitingForReply = bottleState.waitingForReply;

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.headerBack}>←</Text>
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.headerTitleText} numberOfLines={1}>
              Lettre en transit
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowMenu(true)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={styles.menuDots}>⋯</Text>
          </TouchableOpacity>
        </View>

        {/* La lettre reçue reste visible. En réponse, on affiche un mini-parchemin complet. */}
        <View
          style={[
            styles.parchmentWrapper,
            canReply && styles.parchmentWrapperReply,
            isKeyboardVisible && styles.parchmentWrapperKeyboard,
          ]}
        >
          {canReply && !isKeyboardVisible && (
            <Text style={styles.receivedLabel}>LETTRE REÇUE</Text>
          )}
          {!isKeyboardVisible && (
            <BottleParchmentCard
              content={bottleState.latestLetter.content}
              compact={canReply}
            />
          )}
        </View>

        {/* Contenu avec padding */}
        <View
          style={[
            styles.mainScroll,
            canReply && styles.mainScrollReply,
            isKeyboardVisible && styles.mainScrollKeyboard,
          ]}
        >
          {/* Message d'erreur ou feedback */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {/* Titre de réponse, plus compact que l'ancien bandeau vert */}
          {canReply && !isSending && (
            <View style={[styles.replyHeading, isKeyboardVisible && styles.replyHeadingKeyboard]}>
              <Text style={styles.replyHeadingIcon}>🪶</Text>
              <View style={styles.replyHeadingCopy}>
                <Text style={styles.replyHeadingTitle}>Répondre à cette lettre</Text>
                {!isKeyboardVisible && (
                  <Text style={styles.replyHeadingSubtitle}>Écris ta réponse et poursuis l’échange.</Text>
                )}
              </View>
            </View>
          )}

          {/* Message d'attente SI waitingForReply */}
          {waitingForReply && (
            <View style={styles.waitingBox}>
              <View style={styles.waitingContent}><Image source={UI_ICONS.transit} style={styles.waitingIcon} resizeMode="contain"/><Text style={styles.waitingText}>Votre lettre est en voyage...</Text></View>
            </View>
          )}
        </View>

        {/* Zone de réponse (visible seulement si canReply) */}
        {canReply && (
          <>
            {/* Zone de saisie */}
            <View style={[styles.bottomControls, isKeyboardVisible && styles.bottomControlsKeyboard]}>
              <TextInput
                ref={textInputRef}
                style={styles.messageInput}
                placeholder="Écris ta réponse..."
                placeholderTextColor={COLORS.textSecondary}
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
                editable={!isSending}
                underlineColorAndroid="transparent"
                selectionColor={COLORS.accent}
                scrollEnabled
              />
            </View>

            {/* Compteur + bouton Envoyer pleine largeur */}
            <View style={[styles.sendFooter, isKeyboardVisible && styles.sendFooterKeyboard]}>
              <Text
                style={[styles.charCount, charRemaining < 50 && styles.charCountWarning]}
              >
                {messageText.length} / 500 caractères
              </Text>
              <TouchableOpacity
                style={[styles.sendBtn, (isSending || !messageText.trim()) && styles.sendBtnDisabled]}
                onPress={handleSendPress}
                disabled={isSending || !messageText.trim()}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={COLORS.card} />
                ) : (
                  <Text style={styles.sendBtnText}>Aperçu avant envoi  ➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Correspondance : disponible aussi pendant la réponse, cachée quand le clavier est ouvert */}
        {(!canReply || !isKeyboardVisible) && (
          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.historyBtn}
              onPress={() =>
                router.push({
                  pathname: '/bottles-history',
                  params: { bottleId },
                })
              }
            >
              <View style={styles.historyBtnContent}><Image source={UI_ICONS.book} style={styles.historyBtnIcon} resizeMode="contain"/><Text style={styles.historyBtnText}>Relire notre correspondance</Text></View>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      <Modal
        visible={showSendPreview}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSendPreview(false)}
      >
        <View style={styles.previewOverlay}>
          <View style={[styles.previewCard, { paddingBottom: Math.max(insets.bottom, 20) }]}>
            <Text style={styles.previewKicker}>APERÇU AVANT ENVOI</Text>
            <Text style={styles.previewTitle}>Ta réponse est prête</Text>
            <Text style={styles.previewSubtitle}>Relis-la une dernière fois avant de l’envoyer.</Text>

            <View style={styles.previewParchmentWrap}>
              <BottleParchmentCard content={messageText.trim()} compact />
            </View>

            <Text style={styles.previewCount}>{messageText.length} / 500 caractères</Text>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewEditBtn}
                onPress={() => {
                  setShowSendPreview(false);
                  setTimeout(() => textInputRef.current?.focus(), 250);
                }}
                disabled={isSending}
              >
                <Text style={styles.previewEditText}>Modifier</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.previewSendBtn, isSending && styles.sendBtnDisabled]}
                onPress={handleSendMessage}
                disabled={isSending}
              >
                {isSending ? (
                  <ActivityIndicator size="small" color={COLORS.card} />
                ) : (
                  <Text style={styles.previewSendText}>Confirmer l’envoi  ➤</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {bottleState?.bottle && (
        <BottleCorrespondenceMenu
          visible={showMenu}
          bottleId={bottleState.bottle.id}
          canBreak={bottleState.canBreak}
          onClose={() => setShowMenu(false)}
          onRefresh={loadData}
          onBroken={() => router.back()}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FBF8F3',
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
  headerTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#4A3A28',
  },
  menuDots: {
    fontSize: 26,
    lineHeight: 26,
    color: COLORS.accent,
    fontWeight: '700',
  },
  mainScroll: {
    flex: 1,
    backgroundColor: 'transparent',
    paddingHorizontal: 16,
  },
  mainScrollReply: {
    flex: 0,
  },
  mainScrollKeyboard: {
    paddingTop: 0,
  },
  parchmentWrapper: {
    marginVertical: 20,
    width: '100%',
  },
  parchmentWrapperReply: {
    marginTop: 8,
    marginBottom: 0,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  parchmentWrapperKeyboard: {
    height: 0,
    marginTop: 0,
    marginBottom: 0,
    overflow: 'hidden',
  },
  receivedLabel: {
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 1.5,
    color: '#9A765A',
    marginBottom: 2,
  },
  replyHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    marginBottom: 4,
  },
  replyHeadingKeyboard: {
    paddingTop: 2,
    paddingBottom: 2,
    marginBottom: 0,
  },
  replyHeadingIcon: {
    fontSize: 22,
    marginRight: 8,
  },
  replyHeadingCopy: {
    flex: 1,
  },
  replyHeadingTitle: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '800',
    color: '#3A2818',
  },
  replyHeadingSubtitle: {
    fontSize: 12,
    lineHeight: 17,
    color: '#7A6856',
    marginTop: 2,
  },
  replyPrompt: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#E8F5E9',
    borderLeftWidth: 4,
    borderLeftColor: '#2E7D32',
    marginBottom: 16,
  },
  replyPromptText: {
    fontSize: 13,
    color: '#2E7D32',
    fontWeight: '600',
    textAlign: 'center',
  },
  waitingBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 16,
  },
  waitingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  waitingIcon: {
    width: 24,
    height: 24,
  },
  waitingText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    textAlign: 'center',
  },
  errorBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    borderLeftWidth: 4,
    borderLeftColor: '#E5534B',
    marginBottom: 16,
  },
  errorBoxText: {
    fontSize: 13,
    color: '#B3261E',
    fontWeight: '600',
    textAlign: 'center',
  },
  bottomControls: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  bottomControlsKeyboard: {
    paddingTop: 2,
    paddingBottom: 2,
  },
  messageInput: {
    minHeight: 120,
    maxHeight: 170,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: '#FFFDF8',
    borderWidth: 1.5,
    borderColor: '#D7C4A8',
    fontSize: 15,
    lineHeight: 22,
    color: '#2B2B2B',
    fontStyle: 'italic',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  sendFooter: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  sendFooterKeyboard: {
    paddingTop: 4,
    paddingBottom: 6,
  },
  charCount: {
    fontSize: 11,
    color: '#8A6E3C',
    marginBottom: 7,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
    minHeight: 50,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: 14,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 7,
    elevation: 4,
  },
  sendBtnDisabled: {
    opacity: 0.6,
  },
  sendBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.card,
    textAlign: 'center',
  },
  secondaryActions: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 10,
    backgroundColor: 'transparent',
  },
  historyBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#D9C9B4',
  },
  historyBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
  },
  historyBtnIcon: {
    width: 20,
    height: 20,
  },
  historyBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6F5A45',
    textAlign: 'center',
  },
  errorText: {
    fontSize: 16,
    color: COLORS.accent,
    textAlign: 'center',
  },
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
  previewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(30,22,16,0.48)',
    justifyContent: 'flex-end',
  },
  previewCard: {
    maxHeight: '82%',
    backgroundColor: '#FBF8F3',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 22,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
    elevation: 12,
  },
  previewKicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.6,
    color: COLORS.accent,
    textAlign: 'center',
    marginBottom: 6,
  },
  previewTitle: {
    fontSize: 22,
    lineHeight: 28,
    fontWeight: '800',
    color: '#3A2818',
    textAlign: 'center',
  },
  previewSubtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#766554',
    textAlign: 'center',
    marginTop: 5,
    marginBottom: 16,
  },
  previewParchmentWrap: {
    alignItems: 'center',
    marginTop: 2,
    marginBottom: 2,
    maxHeight: 260,
    overflow: 'hidden',
  },
  previewCount: {
    fontSize: 11,
    color: '#8A6E3C',
    marginTop: 8,
    marginBottom: 14,
  },
  previewActions: {
    flexDirection: 'row',
    gap: 10,
  },
  previewEditBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#B99563',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDF8',
  },
  previewEditText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.accent,
  },
  previewSendBtn: {
    flex: 1.6,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
  },
  previewSendText: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.card,
  },
});
