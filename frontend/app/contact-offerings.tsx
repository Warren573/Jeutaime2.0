import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Platform, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getOfferingsCatalog,
  getPersonalDeskState,
  sendOffering,
  type OfferingCatalogItemDTO,
  type PersonalDeskStateDTO,
} from '../src/api/offerings';

const PERSONAL_PREFIX = 'desk_';

function remainingHours(expiresAt: string | null) {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return 0;
  return Math.max(1, Math.ceil(ms / 3600000));
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
      `Déposer cette attention pour ${pseudo || 'ce contact'} pour ${item.cost} pièces ?`,
    );
    if (!confirmed) return;
    try {
      setSendingId(item.id);
      await sendOffering({ offeringId: item.id, toUserId });
      await load();
      showMessage('Offrande déposée', `Offrande envoyée à ${pseudo || 'ton contact'}.`);
    } catch (err) {
      showMessage('Envoi impossible', err instanceof Error ? err.message : "L'offrande n'a pas pu être envoyée.");
    } finally {
      setSendingId(null);
    }
  };

  const spotlightItem = deskState?.offering
    ? personalOfferings.find((item) => item.id === deskState.offering?.id) ?? deskState.offering
    : null;

  return (
    <ScrollView>
      <Text>Offrandes pour {pseudo || 'ton contact'}</Text>
      <Text>Une même offrande ne peut être présente qu’une seule fois.</Text>
      <Button title="Retour" onPress={() => router.back()} />
      <Button title="Actualiser" onPress={() => void load()} disabled={loading} />

      {loading ? <Text>Chargement...</Text> : null}
      {error ? <Text>{error}</Text> : null}

      {!loading && !error && spotlightItem ? (
        <View>
          <Text>Mise en avant</Text>
          <Text>{spotlightItem.name}</Text>
          <Text>{spotlightItem.cost} pièces</Text>
          {spotlightHours !== null ? <Text>Encore {spotlightHours} h</Text> : null}
          <Button
            title={ownedSet.has(spotlightItem.id) ? 'Déjà présente' : `Envoyer ${spotlightItem.name}`}
            disabled={!!sendingId || ownedSet.has(spotlightItem.id)}
            onPress={() => void confirmSend(spotlightItem as OfferingCatalogItemDTO)}
          />
        </View>
      ) : null}

      {!loading && !error && personalOfferings.length === 0 ? (
        <Text>Aucune offrande personnelle disponible.</Text>
      ) : null}

      {!loading && !error
        ? personalOfferings.map((item) => {
            const sending = sendingId === item.id;
            const owned = ownedSet.has(item.id);
            return (
              <View key={item.id}>
                <Text>{item.name}</Text>
                <Text>{item.cost} pièces</Text>
                <Button
                  title={owned ? 'Déjà présente' : sending ? 'Envoi...' : 'Envoyer'}
                  disabled={!!sendingId || owned}
                  onPress={() => void confirmSend(item)}
                />
              </View>
            );
          })
        : null}
    </ScrollView>
  );
}
