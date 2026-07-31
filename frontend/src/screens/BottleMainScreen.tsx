import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import { getCurrentBottle, getInbox } from '../api/bottles';
import type { GetCurrentBottleResponse, InboxBottleDTO } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
  accentLight: '#E8CFCF',
  success: '#2E7D32',
  error: '#B3261E',
};

export default function BottleMainScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentBottleState, setCurrentBottleState] = useState<GetCurrentBottleResponse | null>(null);
  const [pendingInbox, setPendingInbox] = useState<InboxBottleDTO[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadState = useCallback(async () => {
    try {
      setError(null);
      const [current, inbox] = await Promise.all([
        getCurrentBottle(),
        getInbox(),
      ]);

      setCurrentBottleState(current);

      // Filter pending bottles (not yet accepted)
      setPendingInbox(inbox.filter(b => b.status === 'FLOATING'));
    } catch (err: any) {
      console.error('[BottleMainScreen] Error loading state:', err);
      setError(err?.message || 'Erreur de chargement');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadState();
    }, [loadState])
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadState();
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  // Détermine le cas actuel
  const hasCurrent = currentBottleState?.bottle && currentBottleState?.latestLetter;
  const canCreate = currentBottleState?.canCreateBottle ?? false;

  // CAS A : Correspondance active
  if (hasCurrent) {
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
              onRefresh={handleRefresh}
              tintColor={COLORS.accent}
            />
          }
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.headerBack}>← Retour</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Bouteille à la mer</Text>

          {/* Afficher la dernière lettre via BottleParchmentCard */}
          <BottleParchmentCardContent
            message={currentBottleState.latestLetter!}
          />

          {/* Bouton Répondre SI canReply */}
          {currentBottleState.canReply && (
            <TouchableOpacity
              style={styles.replyBtn}
              onPress={() =>
                router.push({
                  pathname: '/bottles-discussion',
                  params: { bottleId: currentBottleState.bottle!.id },
                })
              }
            >
              <Text style={styles.replyBtnText}>Répondre à cette lettre</Text>
            </TouchableOpacity>
          )}

          {/* Message d'attente SI waitingForReply */}
          {currentBottleState.waitingForReply && (
            <View style={styles.waitingBox}>
              <Text style={styles.waitingText}>
                ✈️ Votre lettre est en voyage...
              </Text>
            </View>
          )}

          {/* Bouton Historique */}
          <TouchableOpacity
            style={styles.historyBtn}
            onPress={() =>
              router.push({
                pathname: '/bottles-history',
                params: { bottleId: currentBottleState.bottle!.id },
              })
            }
          >
            <Text style={styles.historyBtnText}>
              📖 Relire notre correspondance ({currentBottleState.messageCount})
            </Text>
          </TouchableOpacity>

          {/* Menu actions */}
          <TouchableOpacity
            style={styles.menuBtn}
            onPress={() =>
              router.push({
                pathname: '/bottles-menu',
                params: { bottleId: currentBottleState.bottle!.id },
              })
            }
          >
            <Text style={styles.menuBtnText}>⋯ Options</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // CAS B : Pas de correspondance, création autorisée
  if (canCreate && !hasCurrent) {
    return (
      <View style={[styles.container, { backgroundColor: COLORS.bg }]}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 120 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.headerBack}>← Retour</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.title}>Bouteille à la mer</Text>

          <View style={styles.emptyState}>
            <Text style={styles.emptyStateEmoji}>🌊</Text>
            <Text style={styles.emptyStateText}>
              Aucune correspondance en cours
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Lance une bouteille à la mer et attends une réponse...
            </Text>
          </View>

          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push('/bottles-create')}
          >
            <Text style={styles.createBtnText}>
              + Créer et envoyer une bouteille
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // CAS C : Pas de correspondance, création BLOQUÉE
  // Afficher l'état réel (FLOATING, en attente d'acceptation, quota atteint)
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
            onRefresh={handleRefresh}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>Bouteille à la mer</Text>

        {error && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Bouteille FLOATING déjà envoyée */}
        {pendingInbox.length === 0 && (
          <View style={styles.quotaBox}>
            <Text style={styles.quotaText}>
              ⚠️ Tu as atteint ton quota de bouteilles en attente.
            </Text>
            <Text style={styles.quotaSubtext}>
              Attends qu'une soit acceptée, refusée ou expire avant d'en renvoyer une.
            </Text>
          </View>
        )}

        {/* Bouteilles en attente d'acceptation */}
        {pendingInbox.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              BOUTEILLES EN ATTENTE ({pendingInbox.length})
            </Text>
            {pendingInbox.map(bottle => (
              <View key={bottle.id} style={styles.bottleCard}>
                <Text style={styles.bottleStatus}>🌊 En voyage...</Text>
                <Text style={styles.bottleMessage} numberOfLines={2}>
                  "{bottle.message}"
                </Text>
                <Text style={styles.bottleTarget}>
                  Cible : {bottle.targetGender}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// Composant pour afficher une lettre seule (réutilisable)
function BottleParchmentCardContent({ message }: { message: any }) {
  return (
    <View style={styles.parchmentCard}>
      <View style={styles.parchmentContent}>
        <Text style={styles.parchmentMessage}>{message.content}</Text>
      </View>
      <View style={styles.parchmentMeta}>
        <Text style={styles.parchmentDate}>
          {new Date(message.createdAt).toLocaleDateString('fr-FR')}
        </Text>
        <Text style={styles.parchmentSource}>
          {message.source === 'INITIAL_BOTTLE' ? '📨 Lettre initiale' : '💌 Réponse'}
        </Text>
      </View>
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
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 20,
  },
  parchmentCard: {
    borderRadius: 12,
    backgroundColor: '#F3E7C6',
    borderWidth: 2,
    borderColor: '#C8A25A',
    paddingVertical: 24,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#3B2C18',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  parchmentContent: {
    marginBottom: 16,
  },
  parchmentMessage: {
    fontSize: 16,
    lineHeight: 28,
    color: '#4A3A28',
    fontFamily: 'Georgia',
    fontStyle: 'italic',
  },
  parchmentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(200, 162, 90, 0.3)',
    paddingTop: 12,
  },
  parchmentDate: {
    fontSize: 12,
    color: '#8A6E3C',
    fontWeight: '500',
  },
  parchmentSource: {
    fontSize: 12,
    color: '#8A6E3C',
    fontWeight: '500',
  },
  replyBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.accent,
    marginBottom: 12,
  },
  replyBtnText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.card,
    textAlign: 'center',
  },
  waitingBox: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FFF3E0',
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
    marginBottom: 12,
  },
  waitingText: {
    fontSize: 14,
    color: '#E65100',
    fontWeight: '600',
    textAlign: 'center',
  },
  historyBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  historyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  menuBtn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: COLORS.card,
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  menuBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
    textAlign: 'center',
  },
  emptyState: {
    paddingVertical: 48,
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },
  createBtn: {
    paddingVertical: 16,
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
  quotaBox: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#FDECEA',
    borderLeftWidth: 4,
    borderLeftColor: '#E5534B',
    marginBottom: 20,
  },
  quotaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#B3261E',
    marginBottom: 4,
  },
  quotaSubtext: {
    fontSize: 12,
    color: '#B3261E',
    opacity: 0.8,
    lineHeight: 18,
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
  bottleCard: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  bottleStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.accent,
    marginBottom: 8,
  },
  bottleMessage: {
    fontSize: 13,
    color: COLORS.text,
    marginBottom: 8,
    fontStyle: 'italic',
    lineHeight: 18,
  },
  bottleTarget: {
    fontSize: 12,
    color: COLORS.textSecondary,
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
  errorText: {
    fontSize: 13,
    color: '#B3261E',
    fontWeight: '600',
  },
});
