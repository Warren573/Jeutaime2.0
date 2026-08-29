import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  getCurrentBottle,
  getRevealStatus,
  markBottleAsRead,
  postBottleMessage,
} from '../api/bottles';
import { generateUUID } from '../utils/uuid';
import type { GetCurrentBottleResponse } from '../api/bottles';

export default function BottleDiscussionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const idempotencyKeyRef = useRef(generateUUID());
  const [state, setState] = useState<GetCurrentBottleResponse | null>(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [revealPending, setRevealPending] = useState(false);
  const [revealRequester, setRevealRequester] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      const current = await getCurrentBottle();
      setState(current);
      if (current.bottle?.id === bottleId) {
        await markBottleAsRead(bottleId);
        const reveal = await getRevealStatus(bottleId);
        setRevealPending(reveal.hasPendingRequest);
        setRevealRequester(reveal.isRequester);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, [bottleId]);

  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const value = text.trim();
    if (!value) return Alert.alert('Erreur', 'Écris un message');
    if (value.length > 500) return Alert.alert('Erreur', 'Maximum 500 caractères');
    setSending(true);
    setError('');
    try {
      await postBottleMessage(bottleId, value, idempotencyKeyRef.current);
      setText('');
      idempotencyKeyRef.current = generateUUID();
      await load();
    } catch (e: any) {
      if (e?.code === 'LETTER_TURN_VIOLATION') setError("Ce n'est pas ton tour de répondre.");
      else if (e?.code === 'BOTTLE_NOT_ACTIVE') setError("Cette bouteille n'est plus active.");
      else setError(e?.message || "Erreur lors de l'envoi");
      await load();
    } finally {
      setSending(false);
    }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (!state?.bottle || !state.latestLetter) return <View><Text>Correspondance non trouvée</Text><Button title="Retour" onPress={() => router.back()} /></View>;

  return (
    <ScrollView>
      <Text>Bouteille à la mer</Text>
      <Text>Dernière lettre</Text>
      <Text>{state.latestLetter.content}</Text>
      <Text>Messages échangés : {state.messageCount}</Text>
      {error ? <Text>Erreur : {error}</Text> : null}
      {state.canReply ? <Text>C'est votre tour de répondre.</Text> : null}
      {state.waitingForReply ? <Text>En attente de la réponse de l'autre personne.</Text> : null}
      {revealPending ? <Text>{revealRequester ? 'Demande de dévoilement envoyée.' : 'Demande de dévoilement reçue.'}</Text> : null}

      {state.canReply && (
        <View>
          <TextInput
            placeholder="Écris ta réponse"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            editable={!sending}
          />
          <Text>{500 - text.length} caractères restants</Text>
          <Button title={sending ? 'Envoi...' : 'Envoyer'} disabled={sending || !text.trim()} onPress={send} />
        </View>
      )}

      <Button title="Historique" onPress={() => router.push({ pathname: '/bottles-history', params: { bottleId } })} />
      <Button title="Actions de la correspondance" onPress={() => router.push({ pathname: '/bottles-discussions', params: { bottleId } })} />
      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
