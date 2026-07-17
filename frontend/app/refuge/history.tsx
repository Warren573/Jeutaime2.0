import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { BouncyButton } from '../../src/components/BouncyButton';
import { RefugeDayResultIcon } from '../../src/components/RefugeDayResultIcon';
import { refugeApi, type RefugeHistoryEntry } from '../../src/api/refuge-api';
import { getAnimalEmoji, getAnimalLabel } from '../../src/data/refugeAnimals';

const SMILE_LABELS: Record<RefugeHistoryEntry['smileState'], string> = {
  NONE: 'Aucun Sourire envoyé',
  SENT: '😊 Sourire envoyé',
  RECEIVED: '😊 Sourire reçu',
  MUTUAL: '💚 Sourire mutuel',
};

const NEXT_STEP_LABELS: Record<RefugeHistoryEntry['nextStepState'], string | null> = {
  NONE: null,
  QUESTIONS_STARTED: '🎯 Jeu des 3 questions démarré',
  DISCUSSION_OPEN: '💌 Discussion ouverte',
};

/**
 * Historique des adoptions — sessions terminées, abandonnées ou révélées.
 * Les profils révélés sans Sourire mutuel sont mis en avant : l'utilisateur
 * peut revenir plus tard et reconsidérer ce profil.
 */
export default function RefugeHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<RefugeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    refugeApi
      .getHistory(1, 50)
      .then((res) => setEntries(res.entries))
      .catch((err) => setError(err?.message || 'Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  // Mise en avant : profils révélés sans Sourire mutuel d'abord
  const sorted = [...entries].sort((a, b) => {
    const aPriority = a.revealed && a.smileState !== 'MUTUAL' ? 0 : 1;
    const bPriority = b.revealed && b.smileState !== 'MUTUAL' ? 0 : 1;
    return aPriority - bPriority;
  });

  const formatDate = (d: string | null) => (d ? new Date(d).toLocaleDateString('fr-FR') : '—');

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <BouncyButton style={styles.backButton} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </BouncyButton>
        <Text style={styles.headerTitle}>Historique des adoptions</Text>
        <View style={styles.headerSpacer} />
      </View>

      {loading && <Text style={styles.infoText}>Chargement...</Text>}
      {error && <Text style={styles.errorText}>{error}</Text>}
      {!loading && !error && entries.length === 0 && (
        <Text style={styles.infoText}>Aucune adoption terminée pour le moment.</Text>
      )}

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.sessionId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const highlighted = item.revealed && item.smileState !== 'MUTUAL';
          const nextStep = NEXT_STEP_LABELS[item.nextStepState];
          return (
            <View style={[styles.card, highlighted && styles.cardHighlighted]}>
              {highlighted && (
                <Text style={styles.highlightBadge}>✨ Profil révélé — à reconsidérer ?</Text>
              )}

              <View style={styles.cardHeader}>
                <Text style={styles.animal}>
                  {getAnimalEmoji(item.animalType)} {getAnimalLabel(item.animalType)}
                </Text>
                <Text style={styles.role}>{item.role === 'adopte' ? 'Adopté' : 'Adoptant'}</Text>
              </View>

              <Text style={styles.dates}>
                {formatDate(item.startedAt)} → {formatDate(item.endedAt)}
              </Text>

              {/* Résultat synthétique des 7 jours */}
              <View style={styles.symbolsRow}>
                {item.dailyResults.map((r) => (
                  <View key={r.dayNumber} style={styles.symbolContainer}>
                    <RefugeDayResultIcon status={r.status} symbol={r.symbol} size={18} />
                  </View>
                ))}
              </View>

              <Text style={styles.counters}>
                ❤️ {item.heartsCount} · ❌ {item.failuresCount} · ⚠️ {item.incompleteCount} · —{' '}
                {item.notPlayedCount} · 🪙 {item.totalCoinsDelta >= 0 ? '+' : ''}
                {item.totalCoinsDelta}
              </Text>

              {item.revealed && item.otherUserSummary && (
                <Text style={styles.otherPseudo}>Avec {item.otherUserSummary.pseudo}</Text>
              )}

              <Text style={styles.smileState}>
                {SMILE_LABELS[item.smileState]}
                {nextStep ? ` · ${nextStep}` : ''}
              </Text>

              {/* Accès au profil : UNIQUEMENT si révélé — aucune donnée privée sinon */}
              {item.revealed && item.otherUserSummary && (
                <BouncyButton
                  style={styles.profileButton}
                  onPress={() => router.push(`/profile/${item.otherUserSummary!.userId}` as never)}
                >
                  <Text style={styles.profileButtonText}>Voir le profil</Text>
                </BouncyButton>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E5D8',
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  backText: {
    fontSize: 14,
    color: '#8B6F47',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2D1F0E',
  },
  headerSpacer: {
    width: 60,
  },
  infoText: {
    fontSize: 14,
    color: '#8B6F47',
    textAlign: 'center',
    marginTop: 24,
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    marginTop: 24,
  },
  listContent: {
    padding: 12,
    gap: 10,
  },
  card: {
    padding: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0E5D8',
  },
  cardHighlighted: {
    borderColor: '#E6B800',
    borderWidth: 2,
    backgroundColor: 'rgba(255, 246, 214, 0.85)',
  },
  highlightBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#8A6D00',
    marginBottom: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  animal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2D1F0E',
  },
  role: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8B6F47',
    backgroundColor: 'rgba(139, 111, 71, 0.1)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  dates: {
    fontSize: 12,
    color: '#8B6F47',
    marginTop: 4,
  },
  symbolsRow: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 8,
    alignItems: 'center',
  },
  symbolContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  counters: {
    fontSize: 12,
    color: '#4A3B28',
    marginTop: 6,
  },
  otherPseudo: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1F0E',
    marginTop: 6,
  },
  smileState: {
    fontSize: 12,
    color: '#3F7B3F',
    marginTop: 4,
  },
  profileButton: {
    marginTop: 10,
    paddingVertical: 10,
    backgroundColor: '#FFD700',
    borderRadius: 8,
    alignItems: 'center',
  },
  profileButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2D1F0E',
  },
});
