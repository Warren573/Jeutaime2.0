import React, { useState } from 'react';
import {
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  requestReveal,
  acceptReveal,
  refuseReveal,
  breakBottle,
  reportBottleConversation,
} from '../api/bottles';

const COLORS = {
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accent: '#8B2E3C',
};

type Props = {
  visible: boolean;
  bottleId: string;
  canBreak: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onBroken: () => void;
};

export const BottleCorrespondenceMenu: React.FC<Props> = ({
  visible,
  bottleId,
  canBreak,
  onClose,
  onRefresh,
  onBroken,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<
    'HARASSMENT' | 'SPAM' | 'FAKE' | 'INAPPROPRIATE_CONTENT' | 'MINOR' | 'OTHER' | ''
  >('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleRequestReveal = async () => {
    try {
      await requestReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement demandé. En attente de réponse...');
      onClose();
      await onRefresh();
    } catch (err: any) {
      const code = err?.code || err?.message;
      if (code === 'REVEAL_ALREADY_REFUSED') {
        Alert.alert(
          'Dévoilement',
          'Votre demande a été refusée. Si cette personne change d\'avis, elle pourra vous proposer le dévoilement.'
        );
      } else {
        Alert.alert('Erreur', err?.message || 'Impossible de demander le dévoilement');
      }
    }
  };

  const handleAcceptReveal = async () => {
    try {
      const result = await acceptReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement accepté!');
      onClose();
      if (result.matchId) {
        setTimeout(() => {
          onRefresh();
        }, 500);
      } else {
        await onRefresh();
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'accepter le dévoilement');
    }
  };

  const handleRefuseReveal = async () => {
    try {
      await refuseReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
      onClose();
      await onRefresh();
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
              onClose();
              onBroken();
            } catch (err: any) {
              Alert.alert('Erreur', err?.message || 'Impossible de rompre');
            }
          },
        },
      ]
    );
  };

  const handleReport = async () => {
    if (!reportReason) {
      Alert.alert('Erreur', 'Veuillez choisir une raison de signalement');
      return;
    }

    setIsReporting(true);
    try {
      await reportBottleConversation(
        bottleId,
        reportReason as 'HARASSMENT' | 'SPAM' | 'FAKE' | 'INAPPROPRIATE_CONTENT' | 'MINOR' | 'OTHER',
        reportDetails.trim() || undefined
      );
      Alert.alert('Succès', 'Votre signalement a été envoyé à l\'équipe de modération.');
      setReportReason('');
      setReportDetails('');
      setShowReportModal(false);
      onClose();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de signaler cette conversation');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          <TouchableOpacity
            style={styles.menuCard}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                handleRequestReveal();
              }}
            >
              <Text style={styles.menuItemText}>✨ Demander le dévoilement du profil</Text>
            </TouchableOpacity>

            {canBreak && (
              <>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => {
                    onClose();
                    handleBreakBottle();
                  }}
                >
                  <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                    Arrêter la correspondance
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                onClose();
                setShowReportModal(true);
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Signaler</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={() => !isReporting && setShowReportModal(false)}
      >
        <TouchableOpacity
          style={styles.reportModalBackdrop}
          activeOpacity={1}
          onPress={() => !isReporting && setShowReportModal(false)}
        >
          <TouchableOpacity
            style={styles.reportModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <TouchableOpacity
              style={styles.reportModalClose}
              onPress={() => !isReporting && setShowReportModal(false)}
              disabled={isReporting}
            >
              <Text style={styles.reportModalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.reportModalTitle}>Signaler cette conversation</Text>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('HARASSMENT')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Harcèlement</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('SPAM')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Spam</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('FAKE')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Profil fake</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('INAPPROPRIATE_CONTENT')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Contenu inapproprié</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('MINOR')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Mineur</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportReasonBtn}
              onPress={() => setReportReason('OTHER')}
              disabled={isReporting}
            >
              <Text style={styles.reportReasonText}>Autre</Text>
            </TouchableOpacity>

            <TextInput
              style={styles.reportDetailsInput}
              placeholder="Détails supplémentaires (optionnel)"
              placeholderTextColor={COLORS.textSecondary}
              value={reportDetails}
              onChangeText={setReportDetails}
              multiline
              maxLength={500}
              editable={!isReporting}
            />

            <TouchableOpacity
              style={[styles.reportSubmitBtn, isReporting && styles.reportSubmitBtnDisabled]}
              onPress={handleReport}
              disabled={isReporting || !reportReason}
            >
              {isReporting ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <Text style={styles.reportSubmitBtnText}>Envoyer le signalement</Text>
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'flex-start',
    paddingTop: 50,
  },
  menuCard: {
    alignSelf: 'center',
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
  menuItemDanger: {
    color: '#B23A48',
  },
  reportModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  reportModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
    maxHeight: '80%',
  },
  reportModalClose: {
    alignSelf: 'flex-end',
    paddingBottom: 12,
  },
  reportModalCloseText: {
    fontSize: 24,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  reportModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 20,
  },
  reportReasonBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F5F1E8',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportReasonText: {
    fontSize: 14,
    color: '#3A2C18',
    fontWeight: '500',
  },
  reportDetailsInput: {
    minHeight: 100,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F5F1E8',
    borderWidth: 1,
    borderColor: '#D8D2C4',
    fontSize: 13,
    color: '#2B2B2B',
    marginBottom: 16,
    textAlignVertical: 'top',
  },
  reportSubmitBtn: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportSubmitBtnDisabled: {
    opacity: 0.6,
  },
  reportSubmitBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.card,
  },
});
