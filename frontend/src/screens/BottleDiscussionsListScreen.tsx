import React, { useState, useCallback } from 'react';
import { Button, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { getInbox, InboxBottleDTO } from '../api/bottles';

export default function BottleDiscussionsListScreen() {
  const router = useRouter();
  const [active, setActive] = useState<InboxBottleDTO[]>([]);
  const [closed, setClosed] = useState<InboxBottleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const bottles = await getInbox();
      setActive(bottles.filter(b => b.status === 'ACCEPTED' || b.status === 'REVEALED'));
      setClosed(bottles.filter(b => b.status === 'EXPIRED' || b.status === 'BROKEN'));
    } catch (e: any) { setError(e?.message || 'Impossible de charger les discussions.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <View><Text>Chargement...</Text></View>;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <Text>Discussions Bouteille</Text>
      {error ? <Text>Erreur : {error}</Text> : null}
      <Text>Actives ({active.length})</Text>
      {active.length === 0 && <Text>Aucune discussion active.</Text>}
      {active.map(b => <View key={b.id}><Text>État : {b.status}</Text><Text>Ville : {b.senderCity || '-'}</Text><Text>{b.message}</Text><Button title="Continuer" onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: b.id } })} /></View>)}
      <Text>Closes ({closed.length})</Text>
      {closed.length === 0 && <Text>Aucune discussion close.</Text>}
      {closed.map(b => <View key={b.id}><Text>État : {b.status}</Text><Text>Ville : {b.senderCity || '-'}</Text><Text>{b.message}</Text><Button title="Ouvrir" onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: b.id } })} /></View>)}
      <Button title="Créer une bouteille" onPress={() => router.push('/bottles-create')} />
      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
