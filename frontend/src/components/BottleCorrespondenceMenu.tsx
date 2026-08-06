import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  acceptReveal,
  breakBottle,
  refuseReveal,
  reportBottleConversation,
  requestReveal,
} from '../api/bottles';

const COLORS = {
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  accent: '#8B2E3C',
};

type ReportReason =
  | 'HARASSMENT'
  | 'SPAM'
  | 'FAKE'
  | 'INAPPROPRIATE_CONTENT'
  | 'MINOR'
  | 'OTHER';

type Props = {
  visible: boolean;
  bottleId: string;
  canBreak: boolean;
  onClose: () => void;
  onRefresh: () => Promise<void> | void;
  onBroken: () => void;
};

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'HARASSMENT', label: 'Harcèlement' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Profil fake' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié' },
  { value: 'MINOR', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

export const BottleCorrespondenceMenu: React.FC<Props> = ({
  visible,
  bottleId,
  canBreak,
  onClose,
  onRefresh,
  onBroken,
}) => {
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const handleRequestReveal = async () => {
    try {
      await requestReveal(bottleId);
      onClose();
      await onRefresh();
      Alert.alert('Succès', 'Dévoilement demandé. En attente de réponse...');
    } catch (err: any) {
      const code = err?.code || err?.message;
      if (code === 'REVEAL_ALREADY_REFUSED') {
        Alert.alert(
          'Dévoilement',
          "Votre demande a été refusée. Si cette personne change d'avis, elle pourra vous proposer le dévoilement.",
        );
      } else {
        Alert.alert('Erreur', err?.message || 'Impossible de demander le dévoilement');
      }
    }
  };

  const handleAcceptReveal = async () => {
    try {
      await acceptReveal(bottleId);
      onClose();
      await onRefresh();
      Alert.alert('Succès', 'Dévoilement accepté !');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || "Impossible d'accepter le dévoilement");
    }
  };

  const handleRefuseReveal = async () => {
    try {
      await refuseReveal(bottleId);
      onClose();
      await onRefresh();
      Alert.alert('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de refuser le dévoilement');
    }
  };

  const performBreak = async () => {
    try {
      await breakBottle(bottleId);
      onClose();
      Alert.alert('Succès', 'Correspondance rompue');
      onBroken();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de rompre');
    }
  };

  const handleBreakBottle = () => {
    const title = 'Rompre cette correspondance ?';
    const message = 'Cela fermera définitivement la discussion.';

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm(`${title}\n\n${message}`);
      if (confirmed) {
        void performBreak();
      }
      return;
    }

    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Rompre', style: 'destructive', onPress: () => void performBreak() },
    ]);
  };

  const openReportModal = () => {
    onClose();
    setShowReportModal(true);
  };

  const closeReportModal = () => {
    if (!isReporting) {
      setShowReportModal(false);
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
        reportReason,
        reportDetails.trim() || undefined,
      );
      setReportReason('');
      setReportDetails('');
      setShowReportModal(false);
      Alert.alert('Succès', "Votre signalement a été envoyé à l'équipe de modération.");
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de signaler cette conversation');
    } finally {
      setIsReporting(false);
    }
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

          <View style={styles.menuCard}>
            <TouchableOpacity style={styles.menuItem} onPress={() => void handleRequestReveal()}>
              <Text style={styles.menuItemText}>✨ Demander le dévoilement du profil</Text>
            </TouchableOpacity>

            {canBreak && (
              <TouchableOpacity style={styles.menuItem} onPress={handleBreakBottle}>
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>
                  Arrêter la correspondance
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={openReportModal}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Signaler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showReportModal}
        transparent
        animationType="slide"
        onRequestClose={closeReportModal}
      >
        <View style={styles.reportModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeReportModal} />

          <ScrollView
            style={styles.reportModalContent}
            contentContainerStyle={styles.reportModalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity
              style={styles.reportModalClose}
              onPress={closeReportModal}
              disabled={isReporting}
            >
              <Text style={styles.reportModalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.reportModalTitle}>Signaler cette conversation</Text>

            {REPORT_REASONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[
                  styles.reportReasonBtn,
                  reportReason === value && styles.reportReasonBtnSelected,
                ]}
                onPress={() => setReportReason(value)}
                disabled={isReporting}
              >
                <Text style={styles.reportReasonText}>{label}</Text>
              </TouchableOpacity>
            ))}

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
              style={[
                styles.reportSubmitBtn,
                (isReporting || !reportReason) && styles.reportSubmitBtnDisabled,
              ]}
              onPress={() => void handleReport()}
              disabled={isReporting || !reportReason}
            >
              {isReporting ? (
                <ActivityIndicator size="small" color={COLORS.card} />
              ) : (
                <Text style={styles.reportSubmitBtnText}>Envoyer le signalement</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
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
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  reportModalContentContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
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
    color: COLORS.text,
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
    backgroundColor: '#E8D5C4',
    borderColor: COLORS.accent,
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
    color: COLORS.text,
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
    marginBottom: 12,
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
