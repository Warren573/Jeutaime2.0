import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getOfferingHistory, getReceivedOfferings } from '../api/offerings';
import type { OfferingSentDTO } from '../api/offerings';
import { useStore } from '../store/useStore';

type Tab = 'active' | 'history';

export default function ReceivedOfferingsScreen() {
  const router = useRouter();
  const matches = useStore(s => s.matches);
  const [active, setActive] = useState<OfferingSentDTO[]>([]);
  const [history, setHistory] = useState<OfferingSentDTO[]>([]);
  const [tab, setTab] = useState<Tab>('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setLoading(true); setError(null);
      const [received, past] = await Promise.all([getReceivedOfferings(1, 100, true), getOfferingHistory()]);
      setActive(received.filter(i => i.offering.id.startsWith('desk_') && i.isActive && i.consumptionCount < 3));
      setHistory(past.filter(i => i.offering.id.startsWith('desk_')));
    } catch (e) { setError(e instanceof Error ? e.message : 'Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);
  const senderName = (id: string) => matches?.find(x => x.userAId === id || x.userBId === id)?.otherProfile?.pseudo || 'Quelqu’un';
  const items = tab === 'active' ? active : history;

  return (
    <ScrollView>
      <Text>Bureau d’offrandes</Text>
      <Text>Offrandes actives : {active.length}</Text>
      <Text>Historique : {history.length}</Text>
      <Button title="Offrandes actives" onPress={() => setTab('active')} />
      <Button title="Historique" onPress={() => setTab('history')} />
      {loading && <Text>Chargement...</Text>}
      {error && <Text>Erreur : {error}</Text>}
      {!loading && !error && items.length === 0 && <Text>{tab === 'active' ? 'Aucune offrande active.' : 'Aucune offrande dans les 6 derniers mois.'}</Text>}
      {items.map(item => (
        <View key={item.id}>
          <Text>Offrande : {item.offering.name}</Text>
          <Text>De : {senderName(item.fromUserId)}</Text>
          <Text>Date : {new Date(item.createdAt).toLocaleString('fr-FR')}</Text>
          <Text>Active : {item.isActive ? 'oui' : 'non'}</Text>
          <Text>Consommations : {item.consumptionCount}</Text>
        </View>
      ))}
      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
