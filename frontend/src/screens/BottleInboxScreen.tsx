import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  getInbox,
  acceptBottle,
  refuseBottle,
  getSentBottles,
  InboxBottleDTO,
  SentBottleDTO,
} from '../api/bottles';

const STATUS_LABELS: Record<string, string> = {
  FLOATING: '🌊 À la mer (en attente)',
  ACCEPTED: '✅ Acceptée',
  EXPIRED: '⌛ Expirée',
  REVEALED: '💞 Dévoilée',
  BROKEN: '💔 Rompue',
};

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
  success: '#2E7D32',
};

export default function BottleInboxScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore(s => s.currentUser);

  const [pendingBottles, setPendingBottles] = useState<InboxBottleDTO[]>([]);
  const [acceptedBottles, setAcceptedBottles] = useState<InboxBottleDTO[]>([]);
  const [sentBottles, setSentBottles] = useState<SentBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  // Feedback in-app (Alert.alert est un no-op sur le Web).
  const [feedback, setFeedback] = useState<
    { type: 'error' | 'success'; text: string } | null
  >(null);

  const loadBottles = useCallback(async () => {
    try {
      const [bottles, sent] = await Promise.all([
        getInbox(),
        getSentBottles().catch(() => [] as SentBottleDTO[]),
      ]);
      setPendingBottles(bottles.filter(b => b.status === 'FLOATING'));
      setAcceptedBottles(
        bottles.filter(b => b.status === 'ACCEPTED' || b.status === 'REVEALED'),
      );
      setSentBottles(sent);
    } catch (error) {
      setFeedback({
        type: 'error',
        text: 'Impossible de charger les bouteilles.',
      });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBottles();
    }, [loadBottles])
  );

  const handleAccept = async (bottleId: string) => {
    setLoadingId(bottleId);
    setFeedback(null);
    try {
      await acceptBottle(bottleId);
      // Navigate to discussion
      router.push({
        pathname: '/bottles-discussion',
        params: { bottleId },
      });
      await loadBottles();
    } catch (error: any) {
      const status = error?.status;
      let text = error?.message || "Erreur lors de l'acceptation";
      if (typeof error?.message === 'string' && error.message.includes('TAKEN')) {
        text = "Quelqu'un d'autre a accepté cette bouteille avant toi.";
      } else if (typeof status === 'number') {
        text = `[${status}] ${text}`;
      }
      setFeedback({ type: 'error', text });
      await loadBottles();
    } finally {
      setLoadingId(null);
    }
  };

  const handleRefuse = async (bottleId: string) => {
    setLoadingId(bottleId);
    setFeedback(null);
    try {
      await refuseBottle(bottleId);
      setFeedback({ type: 'success', text: 'Bouteille refusée.' });
      await loadBottles();
    } catch (error: any) {
      setFeedback({
        type: 'error',
        text: error?.message || 'Erreur lors du refus',
      });
    } finally {
      setLoadingId(null);
    }
  };

  const handleViewDiscussion = (bottleId: string) => {
    router.push({
      pathname: '/bottles-discussion',
      params: { bottleId },
    });
  };

  const truncateMessage = (msg: string): string => {
    if (msg.length <= 40) return msg;
    return msg.slice(0, 40) + '...';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={() => {
              setIsRefreshing(true);
              loadBottles();
            }}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.title}>Bouteilles à la mer</Text>

        {/* Résumé du profil — aide à comprendre la réception des bouteilles */}
        <View style={styles.profileSummary}>
          <Text style={styles.profileSummaryText}>
            Ton profil : {currentUser?.gender || '—'}
            {currentUser?.age ? ` · ${currentUser.age} ans` : ''} · tu cherches :{' '}
            {currentUser?.interestedIn && currentUser.interestedIn.length > 0
              ? currentUser.interestedIn.join(', ')
              : 'non renseigné'}
          </Text>
          <Text style={styles.profileSummaryHint}>
            Tu reçois une bouteille si tu corresponds à sa cible (genre + âge) et,
            si tu as renseigné une préférence, qu'elle inclut le genre de l'expéditeur.
          </Text>
        </View>

        {/* Feedback in-app (accept/refuse/chargement) */}
        {feedback && (
          <View
            style={[
              styles.feedbackBox,
              feedback.type === 'error'
                ? styles.feedbackError
                : styles.feedbackSuccess,
            ]}
          >
            <Text
              style={[
                styles.feedbackText,
                feedback.type === 'error'
                  ? styles.feedbackTextError
                  : styles.feedbackTextSuccess,
              ]}
            >
              {feedback.text}
            </Text>
          </View>
        )}

        {/* PENDING Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            PENDING ({pendingBottles.length})
          </Text>

          {pendingBottles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Aucune bouteille pour le moment</Text>
              <Text style={styles.emptyStateSubtext}>Reviens plus tard!</Text>
            </View>
          ) : (
            pendingBottles.map(bottle => (
              <View key={bottle.id} style={styles.bottleCard}>
                <View style={styles.bottleHeader}>
                  <Text style={styles.bottleEmoji}>🎁</Text>
                  <View style={styles.bottleInfo}>
                    <Text style={styles.bottleGender}>{bottle.targetGender}</Text>
                    <Text style={styles.bottleDetails}>
                      {bottle.status === 'FLOATING' ? 'Âge' : 'Âge'} •{' '}
                      {bottle.senderCity}
                    </Text>
                  </View>
                </View>

                <Text style={styles.bottleMessage}>{truncateMessage(bottle.message)}</Text>

                <View style={styles.bottleActions}>
                  <TouchableOpacity
                    style={[
                      styles.acceptBtn,
                      loadingId === bottle.id && styles.btnDisabled,
                    ]}
                    onPress={() => handleAccept(bottle.id)}
                    disabled={loadingId === bottle.id}
                  >
                    {loadingId === bottle.id ? (
                      <ActivityIndicator size="small" color={COLORS.card} />
                    ) : (
                      <Text style={styles.acceptBtnText}>Accepter</Text>
                    )}
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.refuseBtn,
                      loadingId === bottle.id && styles.btnDisabled,
                    ]}
                    onPress={() => handleRefuse(bottle.id)}
                    disabled={loadingId === bottle.id}
                  >
                    {loadingId === bottle.id ? (
                      <ActivityIndicator size="small" color={COLORS.text} />
                    ) : (
                      <Text style={styles.refuseBtnText}>Refuser</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>

        {/* MES CONVERSATIONS (bouteilles acceptées) */}
        {acceptedBottles.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              MES CONVERSATIONS ({acceptedBottles.length})
            </Text>

            {acceptedBottles.map(bottle => (
              <View key={bottle.id} style={styles.bottleCard}>
                <View style={styles.bottleHeader}>
                  <Text style={styles.bottleEmoji}>
                    {bottle.status === 'REVEALED' ? '💞' : '✅'}
                  </Text>
                  <View style={styles.bottleInfo}>
                    <Text style={styles.bottleGender}>
                      {STATUS_LABELS[bottle.status] || bottle.status}
                    </Text>
                    <Text style={styles.bottleDetails}>{bottle.senderCity}</Text>
                  </View>
                </View>

                <Text style={styles.bottleMessage}>{truncateMessage(bottle.message)}</Text>

                <TouchableOpacity
                  style={styles.viewBtn}
                  onPress={() => handleViewDiscussion(bottle.id)}
                >
                  <Text style={styles.viewBtnText}>Voir la discussion</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* MES BOUTEILLES ENVOYÉES */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            MES BOUTEILLES ENVOYÉES ({sentBottles.length})
          </Text>

          {sentBottles.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Tu n'as encore rien envoyé</Text>
              <Text style={styles.emptyStateSubtext}>
                Crée ta première bouteille ci-dessous.
              </Text>
            </View>
          ) : (
            sentBottles.map(bottle => (
              <View key={bottle.id} style={styles.bottleCard}>
                <View style={styles.bottleHeader}>
                  <Text style={styles.bottleEmoji}>🍾</Text>
                  <View style={styles.bottleInfo}>
                    <Text style={styles.bottleGender}>
                      {STATUS_LABELS[bottle.status] || bottle.status}
                    </Text>
                    <Text style={styles.bottleDetails}>
                      Cible : {bottle.targetGender} • {bottle.ageMin}-
                      {bottle.ageMax} ans
                    </Text>
                  </View>
                </View>

                <Text style={styles.bottleMessage}>
                  {truncateMessage(bottle.message)}
                </Text>

                <Text style={styles.recipientLine}>
                  {bottle.recipientCount > 0
                    ? `📬 Envoyée à ${bottle.recipientCount} personne${
                        bottle.recipientCount > 1 ? 's' : ''
                      }`
                    : '⚠️ Aucun destinataire compatible trouvé pour le moment'}
                </Text>
              </View>
            ))
          )}
        </View>

        {/* Create Button */}
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push('/bottles-create')}
        >
          <Text style={styles.createBtnText}>+ Créer une bouteille</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
  },
  header: {
    marginBottom: 8,
  },
  headerBack: {
    fontSize: 16,
    color: COLORS.accent,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  profileSummary: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: COLORS.accentLight,
    marginBottom: 20,
  },
  profileSummaryText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.accent,
  },
  profileSummaryHint: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 15,
  },
  feedbackBox: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 16,
  },
  feedbackError: {
    backgroundColor: '#FDECEA',
    borderColor: '#E5534B',
  },
  feedbackSuccess: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  feedbackText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  feedbackTextError: {
    color: '#B3261E',
  },
  feedbackTextSuccess: {
    color: '#2E7D32',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottleCard: {
    paddingVertical: 16,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  bottleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  bottleEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  bottleInfo: {
    flex: 1,
  },
  bottleGender: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottleDetails: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  bottleMessage: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 12,
    lineHeight: 20,
  },
  recipientLine: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
  bottleActions: {
    flexDirection: 'row',
    gap: 10,
  },
  acceptBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
  },
  acceptBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  refuseBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  refuseBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  viewBtn: {
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: COLORS.success,
  },
  viewBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  createBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginTop: 16,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
});
