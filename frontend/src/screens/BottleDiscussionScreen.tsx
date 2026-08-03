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
import {
  getCurrentBottle,
  postBottleMessage,
  markBottleAsRead,
  requestReveal,
  acceptReveal,
  refuseReveal,
  breakBottle,
  getRevealStatus,
} from '../api/bottles';
import { BottleParchmentCard } from '../components/BottleParchmentCard';
import { generateUUID } from '../utils/uuid';
import type { GetCurrentBottleResponse } from '../api/bottles';

const LETTER_BG = require('../../assets/images/bottle/letter-bg2.jpg');

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
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
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

  const handleRequestReveal = async () => {
    try {
      await requestReveal(bottleId);
      setHasRevealRequest(true);
      setIsRevealRequester(true);
      Alert.alert('Succès', 'Dévoilement demandé. En attente de réponse...');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de demander le dévoilement');
    }
  };

  const handleAcceptReveal = async () => {
    try {
      const result = await acceptReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement accepté!');
      if (result.matchId) {
        setTimeout(() => {
          router.push(`/match-profile?matchId=${result.matchId}`);
        }, 500);
      } else {
        await loadData();
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'accepter le dévoilement');
    }
  };

  const handleRefuseReveal = async () => {
    try {
      await refuseReveal(bottleId);
      setHasRevealRequest(false);
      Alert.alert('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de refuser le dévoilement');
    }
  };

  const handleBreakBottle = () => {
    Alert.alert(
      'Rompre cette correspondance?',
      'Cela fermera définitivement la discussion.',
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
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de rompre');
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
      <View style={styles.letterBgLayer} pointerEvents="none">
        <Image source={LETTER_BG} style={styles.letterBgImage} resizeMode="cover" />
      </View>

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

        {/* Affichage de la dernière lettre */}
        <View style={styles.mainScroll}>
          <View style={styles.parchmentWrapper}>
            <BottleParchmentCard
              content={bottleState.latestLetter.content}
            />
          </View>

          {/* Message d'erreur ou feedback */}
          {error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorBoxText}>{error}</Text>
            </View>
          )}

          {/* Bouton Répondre SI canReply */}
          {canReply && !isSending && (
            <View style={styles.replyPrompt}>
              <Text style={styles.replyPromptText}>
                💬 À toi de répondre!
              </Text>
            </View>
          )}

          {/* Message d'attente SI waitingForReply */}
          {waitingForReply && (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingText}>
                ✈️ Votre lettre est en voyage...
              </Text>
            </View>
          )}
        </View>

        {/* Zone de réponse (visible seulement si canReply) */}
        {canReply && (
          <>
            {/* Zone de saisie */}
            <View style={styles.bottomControls}>
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
                selectionColor="transparent"
                scrollEnabled={false}
              />
            </View>

            {/* Bouton Envoyer */}
            <View style={styles.sendFooter}>
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
                  <Text style={styles.sendBtnText}>Envoyer</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Boutons secondaires (historique) */}
        {!canReply && (
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
              <Text style={styles.historyBtnText}>📖 Historique</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Menu */}
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
            {bottleState.bottle.status === 'ACCEPTED' && (
              <>
                {hasRevealRequest && isRevealRequester ? (
                  <View style={styles.menuItem}>
                    <Text style={styles.menuItemDisabled}>Dévoilement en attente…</Text>
                  </View>
                ) : hasRevealRequest && !isRevealRequester ? (
                  <>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        handleAcceptReveal();
                      }}
                    >
                      <Text style={styles.menuItemText}>✨ Accepter le dévoilement</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.menuItem}
                      onPress={() => {
                        setShowMenu(false);
                        handleRefuseReveal();
                      }}
                    >
                      <Text style={styles.menuItemText}>Refuser le dévoilement</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={styles.menuItem}
                    onPress={() => {
                      setShowMenu(false);
                      handleRequestReveal();
                    }}
                  >
                    <Text style={styles.menuItemText}>✨ Proposer le dévoilement</Text>
                  </TouchableOpacity>
                )}
                <View style={styles.menuDivider} />
              </>
            )}

            {!canReply && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  router.push({
                    pathname: '/bottles-history',
                    params: { bottleId },
                  });
                }}
              >
                <Text style={styles.menuItemText}>📖 Historique</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                handleBreakBottle();
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Rompre la correspondance
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
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
  parchmentWrapper: {
    marginVertical: 20,
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
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  messageInput: {
    minHeight: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderWidth: 1,
    borderColor: '#D8D2C4',
    fontSize: 14,
    lineHeight: 20,
    color: '#2B2B2B',
    fontStyle: 'italic',
  },
  sendFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  charCount: {
    fontSize: 11,
    color: '#8A6E3C',
    flex: 1,
  },
  charCountWarning: {
    color: COLORS.accent,
    fontWeight: '600',
  },
  sendBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginLeft: 8,
    justifyContent: 'center',
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
    paddingVertical: 12,
    backgroundColor: 'transparent',
  },
  historyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
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
});
