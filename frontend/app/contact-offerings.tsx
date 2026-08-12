import React, { useEffect, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppBackButton } from '../src/components/AppBackButton';
import {
  getOfferingsCatalog,
  getPersonalDeskState,
  sendOffering,
  type OfferingCatalogItemDTO,
  type PersonalDeskStateDTO,
} from '../src/api/offerings';

const PERSONAL_PREFIX = 'desk_';

const OFFERING_IMAGES: Record<string, any> = {
  desk_chocolats: require('../assets/images/offerings/desk/BOITE DE CHOCOLATS.png'),
  desk_bouquet: require('../assets/images/offerings/desk/BOUQUET DE FLEURS.png'),
  desk_rose: require('../assets/images/offerings/desk/ROSE ETERNELLE.png'),
  desk_grand_cru: require('../assets/images/offerings/desk/BOUTEILLE GRAND CRU.png'),
  desk_venise: require('../assets/images/offerings/desk/VOYAGE VENISE.png'),
};

const INTENT_LABELS: Record<string, string> = {
  desk_rose: 'Petite attention',
  desk_chocolats: 'Faire plaisir',
  desk_parfum: 'Marquer le coup',
  desk_grand_cru: 'À partager en pensée',
  desk_bouquet: 'Une attention qui reste',
  desk_venise: 'Exceptionnel',
};

function remainingHours(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 3600000));
}

function OfferingVisual({ item, large = false }: { item: OfferingCatalogItemDTO; large?: boolean }) {
  const image = OFFERING_IMAGES[item.id];
  return image ? (
    <Image source={image} style={large ? styles.spotlightImage : styles.itemImage} resizeMode="contain" />
  ) : (
    <Text style={large ? styles.spotlightEmoji : styles.emoji}>{item.emoji}</Text>
  );
}

function showMessage(title: string, message: string) {
  if (Platform.OS === 'web' && typeof globalThis.alert === 'function') {
    globalThis.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

async function askConfirmation(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web' && typeof globalThis.confirm === 'function') {
    return globalThis.confirm(`${title}\n\n${message}`);
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Déposer', onPress: () => resolve(true) },
    ]);
  });
}

export default function ContactOfferingsPage() {
  const router = useRouter();
  const { toUserId, pseudo } = useLocalSearchParams<{ toUserId?: string; pseudo?: string }>();
  const [catalog, setCatalog] = useState<OfferingCatalogItemDTO[]>([]);
  const [deskState, setDeskState] = useState<PersonalDeskStateDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingId, setSendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!toUserId) {
      setError('Contact introuvable');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const [items, state] = await Promise.all([
        getOfferingsCatalog(),
        getPersonalDeskState(toUserId),
      ]);
      setCatalog(items);
      setDeskState(state);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible de charger les offrandes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [toUserId]);

  const personalOfferings = useMemo(
    () => catalog.filter((item) => item.id.startsWith(PERSONAL_PREFIX)),
    [catalog],
  );

  const ownedSet = useMemo(
    () => new Set(deskState?.ownedOfferingIds ?? []),
    [deskState?.ownedOfferingIds],
  );

  const spotlightHours = remainingHours(deskState?.expiresAt ?? null);

  const confirmSend = async (item: OfferingCatalogItemDTO) => {
    if (!toUserId || sendingId || ownedSet.has(item.id)) return;

    const confirmed = await askConfirmation(
      item.name,
      `Déposer cette attention sur le bureau de ${pseudo || 'ce contact'} pour ${item.cost} pièces ?`,
    );
    if (!confirmed) return;

    try {
      setSendingId(item.id);
      await sendOffering({ offeringId: item.id, toUserId });
      await load();
      showMessage(
        'Offrande déposée',
        `Ton attention attend maintenant ${pseudo || 'ton contact'} sur son bureau.`,
      );
    } catch (err) {
      showMessage(
        'Envoi impossible',
        err instanceof Error ? err.message : "L'offrande n'a pas pu être envoyée.",
      );
    } finally {
      setSendingId(null);
    }
  };

  const spotlightItem = deskState?.offering
    ? personalOfferings.find((item) => item.id === deskState.offering?.id) ?? deskState.offering
    : null;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <AppBackButton onPress={() => router.back()} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.eyebrow}>UNE ATTENTION POUR</Text>
        <Text style={styles.title}>{pseudo || 'Ton contact'}</Text>
        <Text style={styles.intro}>
          Choisis quelque chose qui lui ressemble. Une même offrande ne peut être présente qu’une seule fois sur son bureau.
        </Text>

        {loading ? (
          <View style={styles.center}><ActivityIndicator /></View>
        ) : error ? (
          <Text style={styles.feedback}>{error}</Text>
        ) : (
          <>
            {spotlightItem && (
              <TouchableOpacity
                activeOpacity={0.84}
                disabled={!!sendingId || ownedSet.has(spotlightItem.id)}
                onPress={() => void confirmSend(spotlightItem as OfferingCatalogItemDTO)}
                style={styles.spotlight}
              >
                <View style={styles.spotlightTopLine}>
                  <Text style={styles.spotlightLabel}>IL LUI MANQUE CELLE-CI EN CE MOMENT</Text>
                  {spotlightHours !== null && <Text style={styles.spotlightTime}>{spotlightHours} h</Text>}
                </View>
                <View style={styles.spotlightBody}>
                  <View style={styles.spotlightVisual}>
                    <OfferingVisual item={spotlightItem as OfferingCatalogItemDTO} large />
                  </View>
                  <View style={styles.spotlightTextWrap}>
                    <Text style={styles.spotlightName}>{spotlightItem.name}</Text>
                    <Text style={styles.spotlightCost}>{spotlightItem.cost} pièces</Text>
                  </View>
                  <Text style={styles.spotlightArrow}>›</Text>
                </View>
              </TouchableOpacity>
            )}

            {personalOfferings.length === 0 ? (
              <Text style={styles.feedback}>Les attentions personnelles arrivent bientôt.</Text>
            ) : (
              <View style={styles.list}>
                {personalOfferings.map((item) => {
                  const sending = sendingId === item.id;
                  const owned = ownedSet.has(item.id);
                  const featured = deskState?.offering?.id === item.id;
                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.82}
                      disabled={!!sendingId || owned}
                      onPress={() => void confirmSend(item)}
                      style={[styles.card, (sending || owned) && styles.cardDisabled]}
                    >
                      <View style={styles.objectWrap}><OfferingVisual item={item} /></View>
                      <View style={styles.cardText}>
                        <Text style={styles.intent}>{featured ? 'Mise en avant' : (INTENT_LABELS[item.id] || 'Une attention')}</Text>
                        <Text style={styles.name}>{item.name}</Text>
                        <Text style={[styles.cost, owned && styles.ownedText]}>
                          {owned ? 'Déjà sur son bureau' : sending ? 'Dépôt en cours…' : `${item.cost} pièces`}
                        </Text>
                      </View>
                      {!owned && <Text style={styles.chevron}>›</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
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
  intro: { marginTop: 10, marginBottom: 20, paddingHorizontal: 12, fontFamily: 'Georgia', fontSize: 14, lineHeight: 20, color: '#705643', textAlign: 'center' },
  center: { paddingVertical: 42, alignItems: 'center' },
  feedback: { marginTop: 28, fontFamily: 'Georgia', fontSize: 14, lineHeight: 20, color: '#705643', textAlign: 'center', fontStyle: 'italic' },
  spotlight: { marginBottom: 20, padding: 15, backgroundColor: '#E8D2AF', borderWidth: 1, borderColor: '#B98A57', borderRadius: 12 },
  spotlightTopLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 11 },
  spotlightLabel: { flex: 1, fontSize: 10, lineHeight: 14, letterSpacing: 0.8, color: '#765137', fontWeight: '800' },
  spotlightTime: { marginLeft: 10, fontSize: 11, color: '#8A2F3C', fontWeight: '800' },
  spotlightBody: { flexDirection: 'row', alignItems: 'center' },
  spotlightVisual: { width: 70, height: 70, alignItems: 'center', justifyContent: 'center' },
  spotlightImage: { width: 68, height: 68 },
  spotlightEmoji: { fontSize: 40 },
  spotlightTextWrap: { flex: 1, paddingLeft: 8 },
  spotlightName: { fontFamily: 'Georgia', fontSize: 19, lineHeight: 23, color: '#3B2417', fontWeight: '700' },
  spotlightCost: { marginTop: 4, fontSize: 11, color: '#765137' },
  spotlightArrow: { fontSize: 30, color: '#8A6242' },
  list: { gap: 12 },
  card: { minHeight: 94, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 11, backgroundColor: '#FBF5EB', borderWidth: 1, borderColor: '#DDCBB5', borderRadius: 10 },
  cardDisabled: { opacity: 0.5 },
  objectWrap: { width: 62, height: 62, alignItems: 'center', justifyContent: 'center', marginRight: 12, backgroundColor: '#F0E0CA', borderRadius: 31, overflow: 'hidden' },
  itemImage: { width: 58, height: 58 },
  emoji: { fontSize: 35 },
  cardText: { flex: 1 },
  intent: { fontSize: 10, letterSpacing: 0.8, color: '#9A7658', fontWeight: '700', textTransform: 'uppercase', marginBottom: 3 },
  name: { fontFamily: 'Georgia', fontSize: 17, lineHeight: 21, color: '#3B2417', fontWeight: '700' },
  cost: { marginTop: 5, fontSize: 11, color: '#8A6D57' },
  ownedText: { color: '#765137', fontWeight: '700' },
  chevron: { marginLeft: 8, fontSize: 28, lineHeight: 30, color: '#A68467' },
});