import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { acceptPrivateSalonInvite, listPrivateSalonInvites, type PrivateSalonInviteDTO } from '../api/privateSalons';
import { useStore } from '../store/useStore';

const KIND_TO_SLUG: Record<string, string> = {
  PISCINE: 'piscine',
  CAFE_DE_PARIS: 'cafe_paris',
  ILE_PIRATES: 'pirates',
  THEATRE: 'theatre',
  BAR_COCKTAILS: 'cocktails',
  METAL: 'metal',
  PSY: 'psy',
};

export default function PrivateSalonsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const setCurrentSalonSession = useStore((s) => s.setCurrentSalonSession);
  const [items, setItems] = useState<PrivateSalonInviteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => setItems(await listPrivateSalonInvites()), []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const enter = async (invite: PrivateSalonInviteDTO) => {
    try {
      const result = invite.accepted
        ? {
            sessionId: invite.session.id,
            privateName: invite.session.name,
            salonKind: invite.session.salonKind,
            salonId: invite.session.salonId,
            salonName: invite.session.salonName,
            expiresAt: invite.session.expiresAt,
          }
        : await acceptPrivateSalonInvite(invite.id);

      setCurrentSalonSession(
        result.sessionId,
        result.salonKind,
        result.salonId,
        result.privateName,
      );

      const slug = KIND_TO_SLUG[result.salonKind] ?? 'cafe_paris';
      router.push(`/salon/${slug}?privateSessionId=${encodeURIComponent(result.sessionId)}` as any);
    } catch (err) {
      Alert.alert('Salon privé', err instanceof Error ? err.message : 'Impossible d’ouvrir le salon.');
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>Invitations privées</Text>
        <View style={{ width: 28 }} />
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load().finally(() => setRefreshing(false));
          }} />}
        >
          {items.length === 0 && <Text style={styles.empty}>Aucune invitation privée.</Text>}
          {items.map((invite) => (
            <View key={invite.id} style={styles.card}>
              <Text style={styles.badge}>INVITATION PRIVÉE</Text>
              <Text style={styles.name}>{invite.session.name}</Text>
              <Text style={styles.info}>Salon caché · expiration {new Date(invite.session.expiresAt).toLocaleDateString('fr-FR')}</Text>
              <TouchableOpacity style={styles.button} onPress={() => void enter(invite)}>
                <Text style={styles.buttonText}>{invite.accepted ? 'Entrer dans le salon' : 'Accepter et entrer'}</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F0E5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5D6C1' },
  back: { fontSize: 32, color: '#6E563F' },
  title: { fontSize: 17, fontWeight: '800', color: '#3A2818' },
  content: { padding: 16, paddingBottom: 50 },
  card: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#D9C7A9', borderRadius: 16, padding: 18, marginBottom: 12 },
  badge: { fontSize: 10, fontWeight: '900', color: '#8B6F47', letterSpacing: 1, marginBottom: 8 },
  name: { fontSize: 20, fontWeight: '900', color: '#3A2818' },
  info: { fontSize: 12, color: '#927960', marginTop: 5, marginBottom: 14 },
  button: { backgroundColor: '#8B6F47', borderRadius: 10, paddingVertical: 11, alignItems: 'center' },
  buttonText: { color: '#FFF', fontWeight: '800' },
  empty: { textAlign: 'center', color: '#927960', marginTop: 40 },
});
