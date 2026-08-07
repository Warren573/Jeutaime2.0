import React, { useCallback, useEffect, useState } from 'react';
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
import { useRouter } from 'expo-router';
import {
  acceptReveal,
  breakBottle,
  getBottleById,
  getRevealStatus,
  refuseReveal,
  reportBottleConversation,
  requestReveal,
} from '../api/bottles';
import { getMatch } from '../api/matches';
import { useStore } from '../store/useStore';

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

type RevealState = {
  hasPendingRequest: boolean;
  isRequester: boolean;
  requestedById: string | null;
  bottleStatus: 'FLOATING' | 'ACCEPTED' | 'EXPIRED' | 'REVEALED' | 'BROKEN' | null;
  partnerId: string | null;
};

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
  const router = useRouter();
  const currentUser = useStore((state) => state.currentUser);
  const [revealState, setRevealState] = useState<RevealState>({
    hasPendingRequest: false,
    isRequester: false,
    requestedById: null,
    bottleStatus: null,
    partnerId: null,
  });
  const [isRevealLoading, setIsRevealLoading] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason | ''>('');
  const [reportDetails, setReportDetails] = useState('');
  const [isReporting, setIsReporting] = useState(false);

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const loadRevealState = useCallback(async () => {
    if (!bottleId) return;

    const [status, bottle] = await Promise.all([
      getRevealStatus(bottleId),
      getBottleById(bottleId),
    ]);

    let partnerId: string | null = null;

    if (bottle.matchId) {
      try {
        const match = await getMatch(bottle.matchId);
        partnerId = match.otherUserId;
      } catch {
        partnerId = null;
      }
    }

    if (!partnerId && currentUser?.id) {
      partnerId = bottle.senderId === currentUser.id ? bottle.acceptedById : bottle.senderId;
    }

    if (!partnerId && status.hasPendingRequest && !status.isRequester) {
      partnerId = status.requestedById ?? null;
    }

    setRevealState({
      hasPendingRequest: status.hasPendingRequest,
      isRequester: status.isRequester,
      requestedById: status.requestedById ?? null,
      bottleStatus: bottle.status,
      partnerId,
    });
  }, [bottleId, currentUser?.id]);

  useEffect(() => {
    if (!visible || !bottleId) return;

    let active = true;
    setIsRevealLoading(true);

    loadRevealState()
      .catch((err: any) => {
        if (active) showMessage('Erreur', err?.message || 'Impossible de charger le statut du dévoilement');
      })
      .finally(() => {
        if (active) setIsRevealLoading(false);
      });

    const interval = setInterval(() => {
      void loadRevealState().catch(() => undefined);
    }, 3000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [visible, bottleId, loadRevealState]);

  const openPartnerProfile = (partnerId = revealState.partnerId) => {
    if (!partnerId) {
      showMessage('Erreur', 'Profil partenaire introuvable');
      return;
    }

    onClose();
    router.push(`/profile/${partnerId}?source=bottle&bottleId=${encodeURIComponent(bottleId)}` as never);
  };

  const handleRequestReveal = async () => {
    if (!canBreak) {
      showMessage('Dévoilement indisponible', 'Vous devez avoir envoyé une première lettre chacun.');
      return;
    }

    setIsRevealLoading(true);
    try {
      await requestReveal(bottleId);
      await loadRevealState();
      await onRefresh();
      showMessage('Succès', 'Dévoilement demandé. En attente de réponse...');
      onClose();
    } catch (err: any) {
      const code = err?.code || err?.message;
      if (code === 'REVEAL_ALREADY_REFUSED') {
        showMessage('Dévoilement', "Votre demande a été refusée. L'autre personne pourra refaire la démarche si elle change d'avis.");
      } else {
        showMessage('Erreur', err?.message || 'Impossible de demander le dévoilement');
      }
    } finally {
      setIsRevealLoading(false);
    }
  };

  const handleAcceptReveal = async () => {
    setIsRevealLoading(true);
    try {
      const knownPartnerId = revealState.partnerId || revealState.requestedById;
      const result = await acceptReveal(bottleId);
      let partnerId = knownPartnerId;

      if (result.matchId) {
        try {
          const match = await getMatch(result.matchId);
          partnerId = match.otherUserId;
        } catch {
          // Keep the partner already known from the pending request.
        }
      }

      await onRefresh();
      showMessage('Succès', 'Dévoilement accepté !');
      openPartnerProfile(partnerId);
    } catch (err: any) {
      showMessage('Erreur', err?.message || "Impossible d'accepter le dévoilement");
    } finally {
      setIsRevealLoading(false);
    }
  };

  const handleRefuseReveal = async () => {
    setIsRevealLoading(true);
    try {
      await refuseReveal(bottleId);
      await loadRevealState();
      await onRefresh();
      showMessage('Succès', 'Dévoilement refusé. La discussion reste anonyme.');
      onClose();
    } catch (err: any) {
      showMessage('Erreur', err?.message || 'Impossible de refuser le dévoilement');
    } finally {
      setIsRevealLoading(false);
    }
  };

  const performBreak = async () => {
    try {
      await breakBottle(bottleId);
      showMessage('Succès', 'Correspondance rompue');
      onClose();
      onBroken();
    } catch (err: any) {
      showMessage('Erreur', err?.message || 'Impossible de rompre');
    }
  };

  const handleBreakBottle = () => {
    const title = 'Rompre cette correspondance ?';
    const message = 'Cela fermera définitivement la discussion.';

    if (Platform.OS === 'web') {
      const confirmed = globalThis.confirm(`${title}\n\n${message}`);
      if (confirmed) void performBreak();
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
    if (!isReporting) setShowReportModal(false);
  };

  const handleReport = async () => {
    if (!reportReason) {
      showMessage('Erreur', 'Veuillez choisir une raison de signalement');
      return;
    }

    setIsReporting(true);
    try {
      await reportBottleConversation(bottleId, reportReason, reportDetails.trim() || undefined);
      setReportReason('');
      setReportDetails('');
      setShowReportModal(false);
      showMessage('Succès', "Votre signalement a été envoyé à l'équipe de modération.");
    } catch (err: any) {
      showMessage('Erreur', err?.message || 'Impossible de signaler cette conversation');
    } finally {
      setIsReporting(false);
    }
  };

  const renderRevealActions = () => {
    if (isRevealLoading) {
      return (
        <View style={styles.loadingItem}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      );
    }

    if (revealState.bottleStatus === 'REVEALED') {
      return (
        <TouchableOpacity style={styles.menuItem} onPress={() => openPartnerProfile()}>
          <Text style={styles.menuItemText}>👤 Voir le profil dévoilé</Text>
        </TouchableOpacity>
      );
    }

    if (!canBreak) {
      return (
        <View style={styles.loadingItem}>
          <Text style={styles.menuItemDisabled}>🔒 Dévoilement après une première lettre chacun</Text>
        </View>
      );
    }

    if (!revealState.hasPendingRequest) {
      return (
        <TouchableOpacity style={styles.menuItem} onPress={() => void handleRequestReveal()}>
          <Text style={styles.menuItemText}>✨ Demander le dévoilement du profil</Text>
        </TouchableOpacity>
      );
    }

    if (revealState.isRequester) {
      return (
        <View style={styles.loadingItem}>
          <Text style={styles.menuItemDisabled}>⏳ Demande de dévoilement en attente</Text>
        </View>
      );
    }

    return (
      <>
        <TouchableOpacity style={styles.menuItem} onPress={() => void handleAcceptReveal()}>
          <Text style={styles.menuItemText}>✓ Accepter le dévoilement</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem} onPress={() => void handleRefuseReveal()}>
          <Text style={[styles.menuItemText, styles.menuItemDanger]}>✕ Refuser le dévoilement</Text>
        </TouchableOpacity>
      </>
    );
  };

  return (
    <>
      <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
        <View style={styles.backdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
          <View style={styles.menuCard}>
            {renderRevealActions()}

            {canBreak && (
              <TouchableOpacity style={styles.menuItem} onPress={handleBreakBottle}>
                <Text style={[styles.menuItemText, styles.menuItemDanger]}>Arrêter la correspondance</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.menuItem} onPress={openReportModal}>
              <Text style={[styles.menuItemText, styles.menuItemDanger]}>Signaler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showReportModal} transparent animationType="slide" onRequestClose={closeReportModal}>
        <View style={styles.reportModalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={closeReportModal} />
          <ScrollView
            style={styles.reportModalContent}
            contentContainerStyle={styles.reportModalContentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <TouchableOpacity style={styles.reportModalClose} onPress={closeReportModal} disabled={isReporting}>
              <Text style={styles.reportModalCloseText}>✕</Text>
            </TouchableOpacity>

            <Text style={styles.reportModalTitle}>Signaler cette conversation</Text>

            {REPORT_REASONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.reportReasonBtn, reportReason === value && styles.reportReasonBtnSelected]}
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
              style={[styles.reportSubmitBtn, (isReporting || !reportReason) && styles.reportSubmitBtnDisabled]}
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
    minWidth: 260,
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
  menuItem: { paddingVertical: 12, paddingHorizontal: 16 },
  menuItemText: { fontSize: 14, color: '#3A2C18', fontWeight: '500' },
  menuItemDanger: { color: '#B23A48' },
  menuItemDisabled: { fontSize: 14, color: COLORS.textSecondary, fontWeight: '500' },
  loadingItem: {
    minHeight: 44,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingText: { fontSize: 14, color: COLORS.textSecondary },
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
  reportModalContentContainer: { paddingHorizontal: 20, paddingVertical: 24 },
  reportModalClose: { alignSelf: 'flex-end', paddingBottom: 12 },
  reportModalCloseText: { fontSize: 24, color: COLORS.textSecondary, fontWeight: '600' },
  reportModalTitle: { fontSize: 18, fontWeight: '700', color: COLORS.text, marginBottom: 20 },
  reportReasonBtn: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#F5F1E8',
    marginBottom: 10,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  reportReasonBtnSelected: { backgroundColor: '#E8D5C4', borderColor: COLORS.accent },
  reportReasonText: { fontSize: 14, color: '#3A2C18', fontWeight: '500' },
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
  reportSubmitBtnDisabled: { opacity: 0.6 },
  reportSubmitBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.card },
});