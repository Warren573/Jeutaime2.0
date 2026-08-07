import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ProfileDetailScreen from '../../src/screens/ProfileDetailScreen';
import { getReactionStatus, sendReaction, type ReactionStatusDTO } from '../../src/api/reactions';
import { blockMatch, breakMatch, listMatches, type MatchDTO } from '../../src/api/matches';
import { blockProfile, reportUser, type ReportReason } from '../../src/api/profiles';
import { useStore } from '../../src/store/useStore';

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'HARASSMENT', label: 'Harcèlement' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Faux profil' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié' },
  { value: 'MINOR', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

export default function ProfileRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; source?: string; bottleId?: string }>();
  const currentUser = useStore((state) => state.currentUser);
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isBottleContext = source === 'bottle';

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [isLoadingMatches, setIsLoadingMatches] = useState(false);
  const [isSmiling, setIsSmiling] = useState(false);
  const [isLoadingReaction, setIsLoadingReaction] = useState(false);
  const [reactionStatus, setReactionStatus] = useState<ReactionStatusDTO | null>(null);
  const [isRelationActioning, setIsRelationActioning] = useState(false);
  const [isProfileActioning, setIsProfileActioning] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('OTHER');
  const [reportDetails, setReportDetails] = useState('');

  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let active = true;
    if (!profileId || isOwnProfile) return;

    setIsLoadingMatches(true);
    listMatches()
      .then((items) => {
        if (active) setMatches(items);
      })
      .catch(() => {
        if (active) setMatches([]);
      })
      .finally(() => {
        if (active) setIsLoadingMatches(false);
      });

    if (isBottleContext) {
      setIsLoadingReaction(true);
      getReactionStatus(profileId)
        .then((status) => {
          if (active) setReactionStatus(status);
        })
        .catch(() => {
          if (active) setReactionStatus(null);
        })
        .finally(() => {
          if (active) setIsLoadingReaction(false);
        });
    }

    return () => {
      active = false;
    };
  }, [profileId, isOwnProfile, isBottleContext]);

  const anyRelationMatch = useMemo(
    () => matches.find((match) => match.otherUserId === profileId),
    [matches, profileId],
  );

  const relationMatch = useMemo(
    () => matches.find((match) => match.otherUserId === profileId && (match.status === 'ACTIVE' || match.status === 'PENDING')),
    [matches, profileId],
  );

  const showMessage = (title: string, message: string) => {
    if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
      globalThis.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  };

  const confirmAction = (title: string, message: string, confirmLabel: string): Promise<boolean> => {
    if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
      return Promise.resolve(globalThis.confirm(`${title}\n\n${message}`));
    }

    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: confirmLabel, style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const refreshMatches = async () => {
    const refreshed = await listMatches().catch(() => []);
    setMatches(refreshed);
  };

  const handleSmile = async () => {
    if (!profileId || isOwnProfile || isSmiling || reactionStatus?.outgoingType === 'SMILE') return;

    setIsSmiling(true);
    try {
      const result = await sendReaction(profileId, 'SMILE');
      const refreshedStatus = await getReactionStatus(profileId).catch(() => ({
        outgoingType: 'SMILE' as const,
        incomingType: null,
        mutualSmile: result.matchCreated,
      }));
      setReactionStatus(refreshedStatus);

      if (refreshedStatus.mutualSmile) {
        showMessage('Sourire mutuel', 'Le sourire est partagé. Vous pouvez continuer depuis vos Lettres.');
        await refreshMatches();
      } else {
        showMessage('Sourire envoyé', 'Votre sourire a bien été envoyé.');
      }
    } catch (error: any) {
      showMessage('Erreur', error?.message || "Impossible d'envoyer le sourire");
    } finally {
      setIsSmiling(false);
    }
  };

  const handleContinue = () => {
    router.push('/(tabs)/letters' as never);
  };

  const handleBreak = async () => {
    if (!relationMatch || relationMatch.status !== 'ACTIVE' || isRelationActioning) return;

    const confirmed = await confirmAction(
      "Rompre l'échange ?",
      "La discussion sera arrêtée, mais l'historique des lettres sera conservé.",
      'Rompre',
    );
    if (!confirmed) return;

    setIsRelationActioning(true);
    try {
      await breakMatch(relationMatch.id);
      await refreshMatches();
      showMessage('Échange rompu', "L'échange a bien été arrêté.");
    } catch (error: any) {
      showMessage('Erreur', error?.message || "Impossible de rompre l'échange");
    } finally {
      setIsRelationActioning(false);
    }
  };

  const handleBlock = async () => {
    if (!relationMatch || relationMatch.status !== 'ACTIVE' || isRelationActioning) return;

    const confirmed = await confirmAction(
      'Bloquer cette personne ?',
      'Vous ne pourrez plus interagir avec cette personne.',
      'Bloquer',
    );
    if (!confirmed) return;

    setIsRelationActioning(true);
    try {
      await blockMatch(relationMatch.id);
      await refreshMatches();
      showMessage('Personne bloquée', 'Cette personne a bien été bloquée.');
    } catch (error: any) {
      showMessage('Erreur', error?.message || 'Impossible de bloquer cette personne');
    } finally {
      setIsRelationActioning(false);
    }
  };

  const handleBlockUnmatchedProfile = async () => {
    if (!profileId || anyRelationMatch || isProfileActioning) return;

    const confirmed = await confirmAction(
      'Bloquer cette personne ?',
      'Son profil ne vous sera plus proposé et vous ne pourrez plus interagir ensemble.',
      'Bloquer',
    );
    if (!confirmed) return;

    setIsProfileActioning(true);
    try {
      await blockProfile(profileId);
      showMessage('Personne bloquée', 'Ce profil a bien été bloqué.');
      router.back();
    } catch (error: any) {
      showMessage('Erreur', error?.message || 'Impossible de bloquer ce profil');
    } finally {
      setIsProfileActioning(false);
    }
  };

  const handleReportSubmit = async () => {
    if (!profileId || isProfileActioning) return;

    setIsProfileActioning(true);
    try {
      await reportUser(profileId, reportReason, reportDetails.trim() || undefined);
      setShowReportModal(false);
      setReportReason('OTHER');
      setReportDetails('');
      showMessage('Signalement envoyé', 'Merci, votre signalement a bien été transmis.');
    } catch (error: any) {
      showMessage('Erreur', error?.message || "Impossible d'envoyer le signalement");
    } finally {
      setIsProfileActioning(false);
    }
  };

  const smileAlreadySent = reactionStatus?.outgoingType === 'SMILE';
  const mutualSmile = reactionStatus?.mutualSmile === true;
  const hasActiveRelation = relationMatch?.status === 'ACTIVE';
  const isUnmatchedProfile = !isLoadingMatches && !anyRelationMatch;

  return (
    <View style={styles.container}>
      <ProfileDetailScreen />

      {!isOwnProfile && profileId && (
        <View style={styles.actions}>
          {isBottleContext && !mutualSmile && (
            <TouchableOpacity
              style={[styles.smileButton, (isSmiling || isLoadingReaction || smileAlreadySent) && styles.disabledButton]}
              onPress={() => void handleSmile()}
              disabled={isSmiling || isLoadingReaction || smileAlreadySent}
              activeOpacity={0.8}
            >
              {isSmiling || isLoadingReaction ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.smileText}>{smileAlreadySent ? '😊 Sourire envoyé' : '😊 Envoyer un sourire'}</Text>
              )}
            </TouchableOpacity>
          )}

          {isBottleContext && (relationMatch || isLoadingMatches) && (
            <TouchableOpacity
              style={[styles.continueButton, isLoadingMatches && styles.disabledButton]}
              onPress={handleContinue}
              disabled={isLoadingMatches}
              activeOpacity={0.8}
            >
              {isLoadingMatches ? (
                <ActivityIndicator size="small" color="#8B2E3C" />
              ) : (
                <Text style={styles.continueText}>✉️ Continuer la discussion</Text>
              )}
            </TouchableOpacity>
          )}

          {hasActiveRelation && (
            <View style={styles.relationActionsRow}>
              <TouchableOpacity
                style={[styles.relationActionButton, isRelationActioning && styles.disabledButton]}
                onPress={() => void handleBreak()}
                disabled={isRelationActioning}
                activeOpacity={0.8}
              >
                <Text style={styles.relationActionText}>Rompre l'échange</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.relationActionButton, styles.blockButton, isRelationActioning && styles.disabledButton]}
                onPress={() => void handleBlock()}
                disabled={isRelationActioning}
                activeOpacity={0.8}
              >
                <Text style={styles.relationActionText}>Bloquer</Text>
              </TouchableOpacity>
            </View>
          )}

          {isUnmatchedProfile && (
            <View style={styles.relationActionsRow}>
              <TouchableOpacity
                style={[styles.relationActionButton, isProfileActioning && styles.disabledButton]}
                onPress={() => setShowReportModal(true)}
                disabled={isProfileActioning}
                activeOpacity={0.8}
              >
                <Text style={styles.relationActionText}>Signaler</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.relationActionButton, styles.blockButton, isProfileActioning && styles.disabledButton]}
                onPress={() => void handleBlockUnmatchedProfile()}
                disabled={isProfileActioning}
                activeOpacity={0.8}
              >
                <Text style={styles.relationActionText}>Bloquer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Modal visible={showReportModal} transparent animationType="fade" onRequestClose={() => setShowReportModal(false)}>
        <View style={styles.reportOverlay}>
          <View style={styles.reportCard}>
            <Text style={styles.reportTitle}>Signaler ce profil</Text>

            {REPORT_REASONS.map(({ value, label }) => (
              <TouchableOpacity
                key={value}
                style={[styles.reasonButton, reportReason === value && styles.reasonButtonSelected]}
                onPress={() => setReportReason(value)}
                disabled={isProfileActioning}
              >
                <Text style={styles.reasonText}>{label}</Text>
              </TouchableOpacity>
            ))}

            <TextInput
              style={styles.reportInput}
              value={reportDetails}
              onChangeText={setReportDetails}
              placeholder="Détails supplémentaires (optionnel)"
              multiline
              maxLength={1000}
              editable={!isProfileActioning}
            />

            <TouchableOpacity
              style={[styles.reportSubmit, isProfileActioning && styles.disabledButton]}
              onPress={() => void handleReportSubmit()}
              disabled={isProfileActioning}
            >
              {isProfileActioning ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.reportSubmitText}>Envoyer le signalement</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.reportCancel}
              onPress={() => setShowReportModal(false)}
              disabled={isProfileActioning}
            >
              <Text style={styles.reportCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  actions: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 18,
    gap: 10,
  },
  smileButton: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.18,
    shadowRadius: 6,
    elevation: 5,
  },
  smileText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  continueButton: {
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  continueText: {
    color: '#8B2E3C',
    fontSize: 15,
    fontWeight: '700',
  },
  relationActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  relationActionButton: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  blockButton: {
    backgroundColor: '#FFF4F4',
  },
  relationActionText: {
    color: '#8B2E3C',
    fontSize: 14,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.65,
  },
  reportOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  reportCard: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
  },
  reportTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2B2B2B',
    marginBottom: 16,
  },
  reasonButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 12,
    borderRadius: 9,
    backgroundColor: '#F5F1E8',
    borderWidth: 1.5,
    borderColor: 'transparent',
    marginBottom: 8,
  },
  reasonButtonSelected: {
    borderColor: '#8B2E3C',
    backgroundColor: '#F8ECEE',
  },
  reasonText: {
    color: '#3A2C18',
    fontSize: 14,
    fontWeight: '600',
  },
  reportInput: {
    minHeight: 80,
    borderWidth: 1,
    borderColor: '#D8D2C4',
    borderRadius: 10,
    padding: 12,
    marginTop: 6,
    marginBottom: 14,
    textAlignVertical: 'top',
  },
  reportSubmit: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: '#8B2E3C',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSubmitText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  reportCancel: {
    minHeight: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  reportCancelText: {
    color: '#6B6B6B',
    fontWeight: '600',
  },
});
