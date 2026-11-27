import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../../src/components/AppBackButton';
import { RefugeDayResultIcon } from '../../src/components/RefugeDayResultIcon';
import { refugeApi, type RefugeHistoryEntry } from '../../src/api/refuge-api';
import { CoinIcon } from '../../src/components/CoinIcon';
import { getAnimalLabel, isRefugeAnimal } from '../../src/data/refugeAnimals';
import { AnimalIllustration } from '../../src/components/AnimalIllustration';
import { useStore } from '../../src/store/useStore';
import {
  NEXT_STEP_LABELS,
  SMILE_LABELS,
  coinsLabel,
  daysLabel,
  formatAdventureDates,
  resultCategories,
  roleLabel,
  sortHistory,
} from '../../src/data/refugeHistoryView';

// Palette des écrans de fin du Refuge : crème, bordeaux, doré.
const cream = '#F6EEDC', page = '#F4EFE1', burgundy = '#8A2F3C', ink = '#4A2B1C', rule = '#A77548', gold = '#C9A227', goldSoft = '#F3E3B0', muted = '#6E4B32';

/**
 * Historique des adoptions — sessions terminées, abandonnées ou révélées. Lecture seule : aucune donnée du Refuge n'est
 * modifiée. Les profils révélés sans Sourire mutuel sont mis en avant (doré) et affichés en premier.
 */
export default function RefugeHistoryScreen() {
  const router = useRouter();
  const myGender = useStore((s) => s.currentUser?.gender) as string | undefined;
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

  const sorted = sortHistory(entries);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle} accessibilityRole="header">Historique des adoptions</Text>
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
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const highlighted = item.revealed && item.smileState !== 'MUTUAL';
          const nextStep = NEXT_STEP_LABELS[item.nextStepState];
          const categories = resultCategories(item.dailyResults);
          return (
            <View style={[styles.card, highlighted && styles.cardHighlighted]}>
              {highlighted && <Text style={styles.highlightBadge}>✨ Profil révélé — à reconsidérer ?</Text>}

              <View style={styles.cardHeader}>
                <View style={styles.animalIdentity}>
                  {isRefugeAnimal(item.animalType) && (
                    <AnimalIllustration animal={item.animalType} state="assis" size={56} />
                  )}
                  <Text style={styles.animal} numberOfLines={1}>{getAnimalLabel(item.animalType)}</Text>
                </View>
                <Text style={styles.role}>{roleLabel(item.role, myGender)}</Text>
              </View>

              <Text style={styles.dates}>{formatAdventureDates(item.startedAt, item.endedAt)}</Text>

              {/* Les sept journées : numéro au-dessus de chaque résultat */}
              <View style={styles.daysRow} accessibilityLabel="Les sept journées">
                {item.dailyResults.map((r) => (
                  <View key={r.dayNumber} style={styles.dayCell}>
                    <Text style={styles.dayNumber}>{r.dayNumber}</Text>
                    <RefugeDayResultIcon status={r.status} symbol={r.symbol} size={18} />
                  </View>
                ))}
              </View>

              {/* Intitulés explicites, un par catégorie de résultat réellement présente */}
              <View style={styles.categories}>
                {categories.map((c) => (
                  <View key={c.key} style={styles.categoryRow}>
                    <View style={styles.categoryIcon}>
                      <RefugeDayResultIcon status={c.status} symbol={c.symbol} size={16} />
                    </View>
                    <Text style={styles.categoryLabel}>{c.label}</Text>
                    <Text style={styles.categoryCount}>{daysLabel(c.count)}</Text>
                  </View>
                ))}
              </View>

              {/* Total des pièces gagnées, mis en valeur */}
              <View style={styles.totalBox}>
                <Text style={styles.totalLabel}>Total gagné</Text>
                <View style={styles.totalValue}>
                  <CoinIcon size={22} />
                  <Text style={styles.totalText}>{coinsLabel(item.totalCoinsDelta)}</Text>
                </View>
              </View>

              {item.revealed && item.otherUserSummary && (
                <Text style={styles.otherPseudo}>Avec {item.otherUserSummary.pseudo}</Text>
              )}

              <Text style={styles.smileState}>{SMILE_LABELS[item.smileState]}</Text>
              {nextStep ? <Text style={styles.smileState}>{nextStep}</Text> : null}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: page },
  header: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 8 },
  headerTitle: { fontFamily: 'Georgia', fontWeight: '700', fontSize: 24, color: burgundy, marginTop: 2 },
  infoText: { fontFamily: 'Georgia', fontSize: 14, color: muted, textAlign: 'center', marginTop: 24, paddingHorizontal: 24 },
  errorText: { fontFamily: 'Georgia', fontSize: 14, color: '#B3261E', textAlign: 'center', marginTop: 24 },
  listContent: { paddingHorizontal: 16, paddingTop: 4, paddingBottom: 32, gap: 14 },
  card: { padding: 16, backgroundColor: cream, borderRadius: 14, borderWidth: 1, borderColor: rule },
  cardHighlighted: { borderColor: gold, borderWidth: 2, backgroundColor: '#FBF2D6' },
  highlightBadge: { fontFamily: 'Georgia', fontSize: 12, fontWeight: '700', color: '#8A6D00', marginBottom: 8 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  animalIdentity: { flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 },
  animal: { fontFamily: 'Georgia', fontSize: 18, fontWeight: '700', color: ink, flexShrink: 1 },
  role: { fontFamily: 'Georgia', fontSize: 12, fontWeight: '700', color: burgundy, borderWidth: 1, borderColor: rule, backgroundColor: 'rgba(201,169,122,.18)', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 999, overflow: 'hidden' },
  dates: { fontFamily: 'Georgia', fontStyle: 'italic', fontSize: 12.5, color: muted, marginTop: 6 },
  daysRow: { flexDirection: 'row', marginTop: 12, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(167,117,72,.4)' },
  dayCell: { flex: 1, alignItems: 'center', gap: 3 },
  dayNumber: { fontFamily: 'Georgia', fontSize: 12, fontWeight: '700', color: ink },
  categories: { marginTop: 10, gap: 6 },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryIcon: { width: 22, alignItems: 'center' },
  categoryLabel: { flex: 1, fontFamily: 'Georgia', fontSize: 13, color: ink },
  categoryCount: { fontFamily: 'Georgia', fontSize: 13, fontWeight: '700', color: burgundy },
  totalBox: { marginTop: 12, backgroundColor: goldSoft, borderWidth: 1, borderColor: gold, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  totalLabel: { fontFamily: 'Georgia', fontSize: 13, fontWeight: '700', color: ink },
  totalValue: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  totalText: { fontFamily: 'Georgia', fontSize: 20, fontWeight: '800', color: burgundy },
  otherPseudo: { fontFamily: 'Georgia', fontSize: 14, fontWeight: '700', color: ink, marginTop: 12 },
  smileState: { fontFamily: 'Georgia', fontSize: 13, color: '#3F6B3F', marginTop: 4 },
});
