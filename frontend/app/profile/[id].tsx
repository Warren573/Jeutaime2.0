import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
  const insets = useSafeAreaInsets();
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
  const [showSafetyMenu, setShowSafetyMenu] = useState(false);
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

  const handleContinue = () => router.push('/(tabs)/letters' as never);

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
    if (!profileId || isProfileActioning || isRelationActioning) return;
    const confirmed = await confirmAction(
      'Bloquer cette personne ?',
      'Vous ne pourrez plus interagir avec cette personne.',
      'Bloquer',
    );
    if (!confirmed) return;

    setShowSafetyMenu(false);
    setIsProfileActioning(true);
    try {
      if (relationMatch?.status === 'ACTIVE') {
        await blockMatch(relationMatch.id);
        await refreshMatches();
      } else {
        await blockProfile(profileId);
      }
      showMessage('Personne bloquée', 'Cette personne a bien été bloquée.');
      if (!anyRelationMatch) router.back();
    } catch (error: any) {
      showMessage('Erreur', error?.message || 'Impossible de bloquer cette personne');
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

  return (
    <View style={styles.container}>
      <ProfileDetailScreen />

      {!isOwnProfile && profileId && (
        <TouchableOpacity
          style={[styles.warningHitArea, { top: insets.top + 13 }]}
          onPress={() => setShowSafetyMenu(true)}
          activeOpacity={1}
        >
          <View />
        </TouchableOpacity>
      )}

      {!isOwnProfile && profileId && (
        <View style={styles.actions} pointerEvents="box-none">
          {isBottleContext && !mutualSmile && (
            <TouchableOpacity
              style={[styles.smileButton, (isSmiling || isLoadingReaction || smileAlreadySent) && styles.disabledButton]}
              onPress={() => void handleSmile()}
              disabled={isSmiling || isLoadingReaction || smileAlreadySent}
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
              >
                <Text style={styles.relationActionText}>Rompre l'échange</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.relationActionButton, styles.blockButton, isRelationActioning && styles.disabledButton]}
                onPress={() => void handleBlock()}
                disabled={isRelationActioning}
              >
                <Text style={styles.relationActionText}>Bloquer</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <Modal visible={showSafetyMenu} transparent animationType="fade" onRequestClose={() => setShowSafetyMenu(false)}>
        <View style={styles.safetyOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setShowSafetyMenu(false)} />
          <View style={[styles.safetyMenu, { top: insets.top + 58 }]}>
            <TouchableOpacity
              style={styles.safetyItem}
              onPress={() => {
                setShowSafetyMenu(false);
                setShowReportModal(true);
              }}
            >
              <Text style={styles.safetyText}>⚠️ Signaler</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.safetyItem} onPress={() => void handleBlock()}>
              <Text style={[styles.safetyText, styles.dangerText]}>🚫 Bloquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

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
              {isProfileActioning ? <ActivityIndicator size="small" color="#FFFFFF" /> : <Text style={styles.reportSubmitText}>Envoyer le signalement</Text>}
            </TouchableOpacity>
            <TouchableOpacity style={styles.reportCancel} onPress={() => setShowReportModal(false)} disabled={isProfileActioning}>
              <Text style={styles.reportCancelText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  warningHitArea: { position: 'absolute', right: 16, width: 40, height: 40, zIndex: 50 },
  actions: { position: 'absolute', left: 16, right: 16, bottom: 18, gap: 10 },
  smileButton: { minHeight: 50, borderRadius: 12, backgroundColor: '#8B2E3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  smileText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  continueButton: { minHeight: 48, borderRadius: 12, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#8B2E3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  continueText: { color: '#8B2E3C', fontSize: 15, fontWeight: '700' },
  relationActionsRow: { flexDirection: 'row', gap: 10 },
  relationActionButton: { flex: 1, minHeight: 44, borderRadius: 10, backgroundColor: '#FFFFFF', borderWidth: 1.5, borderColor: '#8B2E3C', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  blockButton: { backgroundColor: '#FFF4F4' },
  relationActionText: { color: '#8B2E3C', fontSize: 14, fontWeight: '700' },
  disabledButton: { opacity: 0.65 },
  safetyOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.12)' },
  safetyMenu: { position: 'absolute', right: 16, width: 190, backgroundColor: '#FFFFFF', borderRadius: 12, borderWidth: 1, borderColor: '#E1D4C4', paddingVertical: 6, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 10, elevation: 8 },
  safetyItem: { paddingHorizontal: 16, paddingVertical: 14 },
  safetyText: { fontSize: 15, fontWeight: '700', color: '#3A2C18' },
  dangerText: { color: '#8B2E3C' },
  reportOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  reportCard: { width: '100%', maxWidth: 420, maxHeight: '90%', borderRadius: 18, backgroundColor: '#FFFDF8', padding: 20 },
  reportTitle: { fontSize: 20, fontWeight: '800', color: '#2B2B2B', marginBottom: 16 },
  reasonButton: { paddingVertical: 11, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F5F1E8', marginBottom: 8, borderWidth: 1.5, borderColor: 'transparent' },
  reasonButtonSelected: { borderColor: '#8B2E3C', backgroundColor: '#F2E3E5' },
  reasonText: { fontSize: 14, color: '#3A2C18', fontWeight: '600' },
  reportInput: { minHeight: 90, borderWidth: 1, borderColor: '#D8D2C4', borderRadius: 8, padding: 12, marginTop: 6, marginBottom: 14, textAlignVertical: 'top', color: '#2B2B2B' },
  reportSubmit: { minHeight: 46, borderRadius: 10, backgroundColor: '#8B2E3C', alignItems: 'center', justifyContent: 'center' },
  reportSubmitText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
  reportCancel: { minHeight: 42, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  reportCancelText: { color: '#6B6B6B', fontSize: 14, fontWeight: '600' },
});
