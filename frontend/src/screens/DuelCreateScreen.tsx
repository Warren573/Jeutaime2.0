import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';
import {
  createPrivateDuel,
  listPrivateDuelCandidates,
  listPrivateDuels,
  type PrivateDuelCandidate,
  type PrivateDuelDTO,
} from '../api/privateDuels';

export default function DuelCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [candidates, setCandidates] = useState<PrivateDuelCandidate[]>([]);
  const [duels, setDuels] = useState<PrivateDuelDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creatingUserId, setCreatingUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const [candidateData, duelData] = await Promise.all([
        listPrivateDuelCandidates(),
        listPrivateDuels(),
      ]);
      setCandidates(candidateData);
      setDuels(duelData);
    } catch (err: any) {
      setError(err?.message || 'Impossible de charger les duels.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const openDuel = (duelId: string) => {
    router.push({ pathname: '/duel/play', params: { duelId } });
  };

  async function handleSelect(candidate: PrivateDuelCandidate) {
    if (creatingUserId) return;
    try {
      setError(null);
      setCreatingUserId(candidate.id);
      const duel = await createPrivateDuel(candidate.id);
      openDuel(duel.id);
    } catch (err: any) {
      setError(err?.message || 'Impossible de créer ce duel.');
    } finally {
      setCreatingUserId(null);
    }
  };

  const pendingDuels = duels.filter((d) => d.status === 'PENDING');
  const recentResolved = duels.filter((d) => d.status === 'RESOLVED').slice(0, 5);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Text style={styles.back}>← Retour</Text>
        </Pressable>
        <Text style={styles.title}>⚔️ Duels privés</Text>
        <Text style={styles.subtitle}>Défie un correspondant de l’un de tes correspondants</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#7A1A1A" />
        </View>
      ) : (
        <FlatList
          data={candidates}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void load();
              }}
              tintColor="#7A1A1A"
            />
          }
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <>
              {!!error && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              )}

              {pendingDuels.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>DUELS EN ATTENTE</Text>
                  {pendingDuels.map((duel) => {
                    const waitingForMe = !duel.hasPlayed;
                    return (
                      <Pressable
                        key={duel.id}
                        style={styles.pendingCard}
                        onPress={() => openDuel(duel.id)}
                      >
                        <View style={styles.pendingIcon}>
                          <Text style={styles.pendingIconText}>⚔️</Text>
                        </View>
                        <View style={styles.pendingCopy}>
                          <Text style={styles.pendingName}>{duel.opponentPseudo}</Text>
                          <Text style={styles.pendingStatus}>
                            {waitingForMe
                              ? 'À toi de jouer'
                              : duel.opponentHasPlayed
                              ? 'Résultat prêt'
                              : 'En attente de son choix'}
                          </Text>
                        </View>
                        <Text style={styles.pendingArrow}>›</Text>
                      </Pressable>
                    );
                  })}
                </View>
              )}

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>ADVERSAIRES DISPONIBLES</Text>
                <Text style={styles.sectionSubtitle}>
                  Uniquement des correspondants de tes correspondants. Tes propres correspondants sont exclus.
                </Text>
              </View>
            </>
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>⚔️</Text>
              <Text style={styles.emptyText}>Aucun adversaire disponible</Text>
              <Text style={styles.emptySubtext}>
                Aucun de tes correspondants n’a actuellement un autre correspondant que tu puisses défier.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.row}
              onPress={() => void handleSelect(item)}
              disabled={creatingUserId !== null}
            >
              <Avatar size={50} {...DEFAULT_AVATAR} />
              <Text style={styles.name}>{item.pseudo}</Text>
              <View style={styles.challengeBtn}>
                {creatingUserId === item.id ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <Text style={styles.challengeText}>Défier</Text>
                )}
              </View>
            </Pressable>
          )}
          ListFooterComponent={
            recentResolved.length > 0 ? (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>DERNIERS DUELS</Text>
                {recentResolved.map((duel) => (
                  <Pressable
                    key={duel.id}
                    style={styles.historyRow}
                    onPress={() => openDuel(duel.id)}
                  >
                    <Text style={styles.historyName}>{duel.opponentPseudo}</Text>
                    <Text style={styles.historyResult}>
                      {duel.result === 'WIN'
                        ? 'Victoire'
                        : duel.result === 'LOSE'
                        ? 'Défaite'
                        : 'Nul'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4ECD8' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#C4A882',
    backgroundColor: '#2C1A0E',
  },
  back: { color: '#F0D98C', fontSize: 15, fontWeight: '600', marginBottom: 14 },
  title: { color: '#F0D98C', fontSize: 26, fontWeight: '800' },
  subtitle: { color: '#A08870', fontSize: 14, marginTop: 6, fontStyle: 'italic' },
  list: { padding: 16, paddingBottom: 40, gap: 12 },
  section: { marginBottom: 4 },
  sectionTitle: {
    color: '#7A5C3A',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.3,
    marginBottom: 8,
  },
  sectionSubtitle: { color: '#9A7040', fontSize: 13, marginBottom: 8 },
  errorBox: {
    backgroundColor: '#FFF0E8',
    borderWidth: 1,
    borderColor: '#D5A49A',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  errorText: { color: '#7A1A1A', fontSize: 13 },
  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E9',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#C4924A',
    padding: 14,
    marginBottom: 10,
  },
  pendingIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F4ECD8',
  },
  pendingIconText: { fontSize: 20 },
  pendingCopy: { flex: 1, marginLeft: 12 },
  pendingName: { color: '#2C1A0E', fontSize: 16, fontWeight: '800' },
  pendingStatus: { color: '#8A6847', fontSize: 12.5, marginTop: 3 },
  pendingArrow: { color: '#7A1A1A', fontSize: 28, fontWeight: '600' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEFAF0',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#B8956A',
    shadowColor: '#5A3A1A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  name: { flex: 1, color: '#2C1A0E', fontSize: 17, fontWeight: '700', marginLeft: 14 },
  challengeBtn: {
    minWidth: 70,
    alignItems: 'center',
    backgroundColor: '#7A1A1A',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 999,
  },
  challengeText: { color: '#FFF', fontSize: 13, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: 46, paddingHorizontal: 40 },
  emptyEmoji: { fontSize: 56, marginBottom: 16 },
  emptyText: { color: '#2C1A0E', fontSize: 18, fontWeight: '700', textAlign: 'center' },
  emptySubtext: { color: '#7A5C3A', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  historySection: { marginTop: 22 },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#C9B18E',
  },
  historyName: { color: '#2C1A0E', fontSize: 14, fontWeight: '700' },
  historyResult: { color: '#7A5C3A', fontSize: 13 },
  preparingText: {
    marginTop: 14,
    color: '#7A5C3A',
    fontSize: 14,
    fontWeight: '600',
  },
  retryBtn: {
    marginTop: 16,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#C4924A',
    backgroundColor: '#FEFAF0',
  },
  retryText: {
    color: '#7A1A1A',
    fontSize: 14,
    fontWeight: '700',
  },
});
