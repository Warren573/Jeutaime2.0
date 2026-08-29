import React, { useCallback, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { acceptBottle, getCurrentBottle, getInbox } from '../api/bottles';
import type { GetCurrentBottleResponse, InboxBottleDTO } from '../api/bottles';
import { useStore } from '../store/useStore';

export default function BottleMainScreen() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const [state, setState] = useState<GetCurrentBottleResponse | null>(null);
  const [inbox, setInbox] = useState<InboxBottleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      const [current, inboxData] = await Promise.all([getCurrentBottle(), getInbox()]);
      setState(current);
      setInbox(inboxData);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const available = !currentUser?.id ? [] : inbox.filter((b) => b.status === 'FLOATING' && !b.acceptedById && b.senderId !== currentUser.id);
  const sentFloating = currentUser?.id ? inbox.find((b) => b.status === 'FLOATING' && b.senderId === currentUser.id) : null;

  const accept = async (id: string) => {
    setAcceptingId(id);
    try {
      await acceptBottle(id);
      await load();
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : "Impossible d'accepter cette bouteille");
      await load();
    } finally {
      setAcceptingId(null);
    }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;

  return (
    <ScrollView>
      <Text>Bouteille à la mer</Text>
      {error ? <Text>Erreur : {error}</Text> : null}

      {available.length > 0 && (
        <View>
          <Text>Bouteilles disponibles</Text>
          {available.map((b) => (
            <View key={b.id}>
              <Text>Ville d'origine : {b.senderCity || 'inconnue'}</Text>
              <Text>Message anonyme disponible</Text>
              <Button title={acceptingId === b.id ? 'Acceptation...' : 'Accepter cette bouteille'} disabled={!!acceptingId} onPress={() => accept(b.id)} />
            </View>
          ))}
        </View>
      )}

      {state?.bottle && (state.bottle.status === 'ACCEPTED' || state.bottle.status === 'REVEALED') && (
        <View>
          <Text>Correspondance en cours</Text>
          {state.latestLetter && <Text>{state.latestLetter.content}</Text>}
          <Text>Messages échangés : {state.messageCount}</Text>
          {state.canReply && <Button title="Écrire une réponse" onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: state.bottle!.id } })} />}
          {state.waitingForReply && <Text>En attente d'une réponse</Text>}
          <Button title="Relire la correspondance" onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId: state.bottle!.id } })} />
          <Button title="Gérer la correspondance" onPress={() => router.push({ pathname: '/bottles-discussions', params: { bottleId: state.bottle!.id } })} />
        </View>
      )}

      {sentFloating && (
        <View>
          <Text>Votre bouteille est en attente</Text>
          <Text>{sentFloating.message}</Text>
          <Text>Elle attend encore d'être récupérée.</Text>
        </View>
      )}

      {!state?.bottle && !sentFloating && state?.canCreateBottle && (
        <View>
          <Text>Aucune bouteille active.</Text>
          <Button title="Créer une nouvelle bouteille" onPress={() => router.push('/bottles-create')} />
        </View>
      )}

      {!state?.canCreateBottle && !state?.bottle && !sentFloating && available.length === 0 && (
        <Text>Nombre maximum de bouteilles en attente atteint.</Text>
      )}

      <Button title="Boîte de réception" onPress={() => router.push('/bottles-inbox')} />
      <Button title="Mes discussions" onPress={() => router.push('/bottles-discussions')} />
      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
