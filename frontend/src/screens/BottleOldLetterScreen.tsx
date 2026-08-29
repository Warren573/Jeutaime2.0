import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { getBottleMessages } from '../api/bottles';
import type { BottleMessageWithMetadata } from '../api/bottles';

export default function BottleOldLetterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const bottleId = params.bottleId as string;
  const messageId = params.messageId as string;
  const [message, setMessage] = useState<BottleMessageWithMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!bottleId || !messageId) { setError('Paramètres manquants'); setLoading(false); return; }
      try {
        const messages = await getBottleMessages(bottleId);
        const found = messages.find(m => m.id === messageId);
        if (found) setMessage(found); else setError("Cette lettre n'existe plus");
      } catch { setError('Erreur de chargement'); }
      finally { setLoading(false); }
    })();
  }, [bottleId, messageId]);

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error || !message) return <View><Text>{error || 'Lettre non trouvée'}</Text><Button title="Retour" onPress={() => router.back()} /></View>;

  return <ScrollView><Text>Ancienne lettre</Text><Text>{message.isMine ? 'Moi' : 'Correspondant'}</Text><Text>{message.content}</Text><Text>{new Date(message.createdAt).toLocaleString('fr-FR')}</Text><Text>Source : {message.source}</Text><Button title="Retour" onPress={() => router.back()} /></ScrollView>;
}
