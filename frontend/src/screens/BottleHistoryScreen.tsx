import React, { useState, useCallback } from 'react';
import { Button, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { getBottleMessages } from '../api/bottles';
import type { BottleMessageWithMetadata } from '../api/bottles';

export default function BottleHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const [messages, setMessages] = useState<BottleMessageWithMetadata[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadMessages = useCallback(async () => {
    if (!bottleId) return;
    try { setError(null); setMessages(await getBottleMessages(bottleId)); }
    catch (err: any) { setError(err?.message || 'Erreur de chargement'); }
    finally { setIsLoading(false); setIsRefreshing(false); }
  }, [bottleId]);

  useFocusEffect(useCallback(() => { setIsLoading(true); loadMessages(); }, [loadMessages]));

  if (isLoading) return <View><Text>Chargement...</Text></View>;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); loadMessages(); }} />}>
      <Text>Historique de la correspondance</Text>
      {error && <Text>Erreur : {error}</Text>}
      {messages.length === 0 && <Text>Aucune lettre</Text>}
      {messages.map((message, index) => (
        <View key={message.id}>
          <Text>Message {index + 1}</Text>
          <Text>{message.isMine ? 'Moi' : 'Correspondant'}</Text>
          <Text>{message.content}</Text>
          <Text>{new Date(message.createdAt).toLocaleString('fr-FR')}</Text>
          <Text>Source : {message.source}</Text>
          <Button title="Ouvrir" onPress={() => router.push({ pathname: '/bottles-old-letter', params: { bottleId, messageId: message.id } })} />
        </View>
      ))}
      <Button title="Actualiser" onPress={loadMessages} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
