import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton } from '../src/components/AppBackButton';
import {
  getOfferingsCatalog,
  sendOffering,
  type OfferingCatalogItemDTO,
} from '../src/api/offerings';

const PERSONAL_PREFIX = 'desk_';

const INTENT_LABELS: Record<string, string> = {
  desk_rose: 'Petite attention',
  desk_chocolats: 'Faire plaisir',
  desk_parfum: 'Marquer le coup',
  desk_grand_cru: 'À partager en pensée',
  desk_bouquet: 'Une attention qui reste',
  desk_venise: 'Exceptionnel',
};

export default function ContactOfferingsPage() {
  const router = useRouter();
  const { toUserId, pseudo } = useLocalSearchParams<{ toUserId?: string; pseudo?: string }>();
  const [catalog, setCatalog] = useState<OfferingCatalogItemDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const items = await getOfferingsCatalog();
        setCatalog(items);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Impossible de charger les offrandes');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const personalOfferings = useMemo(
    () => catalog.filter((item) => item.id.startsWith(PERSONAL_PREFIX)),
    [catalog],
  );

  const confirmSend = (item: OfferingCatalogItemDTO) => {
    if (!toUserId || sendingId) return;
    Alert.alert(
      item.name,
      `Déposer cette attention sur le bureau de ${pseudo || 'ce contact'} pour ${item.cost} pièces ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Déposer',
          onPress: async () => {
            try {
              setSendingId(item.id);
              await sendOffering({ offeringId: item.id, toUserId });
              Alert.alert('Offrande déposée', `Ton attention attend maintenant ${pseudo || 'ton contact'} sur son bureau.`, [
                { text: 'D’accord', onPress: () => router.back() },
              ]);
            } catch (err) {
              Alert.alert('Envoi impossible', err instanceof Error ? err.message : "L'offrande n'a pas pu être envoyée.");
            } finally {
              setSendingId(null);
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <AppBackButton onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>UNE ATTENTION POUR</Text>
        <Text style={styles.title}>{pseudo || 'Ton contact'}</Text>
        <Text style={styles.intro}>
          Choisis quelque chose qui lui ressemble. L’offrande sera déposée directement sur son bureau.
        </Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator /></View>
        ) : error ? (
          <Text style={styles.feedback}>{error}</Text>
        ) : personalOfferings.length === 0 ? (
          <Text style={styles.feedback}>Les attentions personnelles arrivent bientôt.</Text>
        ) : (
          <View style={styles.list}>
            {personalOfferings.map((item) => {
              const sending = sendingId === item.id;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.82}
                  disabled={!!sendingId}
                  onPress={() => confirmSend(item)}
                  style={[styles.card, sending && styles.cardSending]}
                >
                  <View style={styles.objectWrap}>
                    <Text style={styles.emoji}>{item.emoji}</Text>
                  </View>
                  <View style={styles.cardText}>
                    <Text style={styles.intent}>{INTENT_LABELS[item.id] || 'Une attention'}</Text>
                    <Text style={styles.name}>{item.name}</Text>
                    <Text style={styles.cost}>{sending ? 'Dépôt en cours…' : `${item.cost} pièces`}</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F2E8DA' },
  topBar: { paddingHorizontal: 16, paddingTop: 2 },
  content: { paddingHorizontal: 22, paddingTop: 8, paddingBottom: 44 },
  eyebrow: { fontSize: 11, letterSpacing: 1.7, color: '#8A6D57', fontWeight: '700', textAlign: 'center' },
  title: { marginTop: 5, fontFamily: 'Georgia', fontSize: 30, color: '#3B2417', fontWeight: '700', textAlign: 'center' },
  intro: { marginTop: 10, marginBottom: 24, paddingHorizontal: 16, fontFamily: 'Georgia', fontSize: 14, lineHeight: 20, color: '#705643', textAlign: 'center' },
  center: { paddingVertical: 42, alignItems: 'center' },
  feedback: { marginTop: 28, fontFamily: 'Georgia', fontSize: 14, lineHeight: 20, color: '#705643', textAlign: 'center', fontStyle: 'italic' },
  list: { gap: 12 },
  card: { minHeight: 94, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#FBF5EB', borderWidth: 1, borderColor: '#DDCBB5', borderRadius: 10 },
  cardSending: { opacity: 0.62 },
  objectWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#F0E0CA', borderRadius: 31 },
  emoji: { fontSize: 35 },
  cardText: { flex: 1 },
  intent: { fontSize: 10, letterSpacing: 0.8, color: '#9A7658', fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  name: { fontFamily: 'Georgia', fontSize: 17, lineHeight: 21, color: '#3B2417', fontWeight: '700' },
  cost: { marginTop: 5, fontSize: 11, color: '#8A6D57' },
  chevron: { marginLeft: 8, fontSize: 28, lineHeight: 30, color: '#A68467' },
});
