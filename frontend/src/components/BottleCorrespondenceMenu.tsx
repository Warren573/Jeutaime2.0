import React, { useState } from 'react';
import { View, Modal, TouchableOpacity, Text, StyleSheet, Alert, TextInput, ActivityIndicator } from 'react-native';
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

interface BottleRevealStatus {
  hasPendingRequest: boolean;
  isRequester: boolean;
  requestedById?: string;
}

interface BottleCorrespondenceMenuProps {
  bottleId: string;
  canBreak: boolean;
  revealStatus: BottleRevealStatus;
  isRevealRefused: boolean;
  onRequestReveal: () => void;
  onBreak: () => void;
  onRefresh: () => void;
  insets?: { top: number };
}

export const BottleCorrespondenceMenu: React.FC<BottleCorrespondenceMenuProps> = ({
  bottleId,
  canBreak,
  revealStatus,
  isRevealRefused,
  onRequestReveal,
  onBreak,
  onRefresh,
  insets = { top: 0 },
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<'HARASSMENT' | 'SPAM' | 'FAKE' | 'INAPPROPRIATE_CONTENT' | 'MINOR' | 'OTHER' | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleAcceptReveal = async () => {
    try {
      const result = await acceptReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement accepté!');
      if (result.matchId) {
        setTimeout(() => {
          // Router would be passed as prop if needed
          onRefresh();
        }, 500);
      } else {
        onRefresh();
      }
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible d\'accepter le dévoilement');
    }
  };

  const handleRefuseReveal = async () => {
    try {
      await refuseReveal(bottleId);
      Alert.alert('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
      onRefresh();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de refuser le dévoilement');
    }
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
        reportDetails.trim() || undefined,
      );
      Alert.alert('Succès', 'Votre signalement a été envoyé à l\'équipe de modération.');
      setReportReason('');
      setReportDetails('');
      setShowReportModal(false);
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de signaler cette conversation');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowMenu(true)}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.menuDots}>⋯</Text>
      </TouchableOpacity>

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
            {isRevealRefused ? (
              <View style={styles.menuItem}>
                <Text style={styles.menuItemDisabled}>Votre demande a été refusée</Text>
              </View>
            ) : revealStatus.hasPendingRequest && revealStatus.isRequester ? (
              <View style={styles.menuItem}>
                <Text style={styles.menuItemDisabled}>Demande de dévoilement en attente…</Text>
              </View>
            ) : revealStatus.hasPendingRequest && !revealStatus.isRequester ? (
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
                  onRequestReveal();
                }}
              >
                <Text style={styles.menuItemText}>✨ Demander le dévoilement du profil</Text>
              </TouchableOpacity>
            )}

            <View style={styles.menuDivider} />

            {canBreak && (
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowMenu(false);
                  onBreak();
                }}
              >
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  Arrêter la correspondance
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuItem}
              onPress={() => {
                setShowMenu(false);
                setShowReportModal(true);
              }}
            >
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                Signaler
              </Text>
            </TouchableOpacity>
          </View>
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
          <View style={styles.reportModalContent}>
            <TouchableOpacity
              style={styles.reportModalClose}
              onPress={() => !isReporting && setShowReportModal(false)}
              disabled={isReporting}
            >
              <Text style={styles.reportModalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.reportModalTitle}>Signaler cette conversation</Text>

            <View style={styles.reportReasonsContainer}>
              {(['HARASSMENT', 'SPAM', 'FAKE', 'INAPPROPRIATE_CONTENT', 'MINOR', 'OTHER'] as const).map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    styles.reportReasonBtn,
                    reportReason === reason && styles.reportReasonBtnSelected,
                  ]}
                  onPress={() => setReportReason(reason)}
                  disabled={isReporting}
                >
                  <Text
                    style={[
                      styles.reportReasonText,
                      reportReason === reason && styles.reportReasonTextSelected,
                    ]}
                  >
                    {reason === 'HARASSMENT' && 'Harcèlement'}
                    {reason === 'SPAM' && 'Spam'}
                    {reason === 'FAKE' && 'Profil fake'}
                    {reason === 'INAPPROPRIATE_CONTENT' && 'Contenu inapproprié'}
                    {reason === 'MINOR' && 'Mineur'}
                    {reason === 'OTHER' && 'Autre'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

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
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  menuDots: {
    fontSize: 26,
    lineHeight: 26,
    color: COLORS.accent,
    fontWeight: '700',
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
  reportReasonsContainer: {
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
  reportReasonBtnSelected: {
    backgroundColor: '#E8CFCF',
    borderColor: COLORS.accent,
  },
  reportReasonText: {
    fontSize: 14,
    color: '#3A2C18',
    fontWeight: '500',
  },
  reportReasonTextSelected: {
    color: COLORS.accent,
    fontWeight: '600',
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
