import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { refugeApi, type RefugeHistoryEntry } from '../../src/api/refuge-api';
import { getAnimalLabel } from '../../src/data/refugeAnimals';

const SMILE_LABELS: Record<RefugeHistoryEntry['smileState'], string> = {
  NONE: 'Aucun Sourire envoyé', SENT: 'Sourire envoyé', RECEIVED: 'Sourire reçu', MUTUAL: 'Sourire mutuel',
};
const NEXT: Record<RefugeHistoryEntry['nextStepState'], string> = {
  NONE: 'Aucune suite', QUESTIONS_STARTED: 'Jeu des 3 questions démarré', DISCUSSION_OPEN: 'Discussion ouverte',
};

export default function RefugeHistoryScreen() {
  const router = useRouter();
  const [entries, setEntries] = useState<RefugeHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    refugeApi.getHistory(1, 50).then((r) => setEntries(r.entries)).catch((e) => setError(e?.message || 'Erreur de chargement')).finally(() => setLoading(false));
  }, []);

  const sorted = [...entries].sort((a, b) => Number(a.revealed && a.smileState !== 'MUTUAL') - Number(b.revealed && b.smileState !== 'MUTUAL'));
  const date = (d: string | null) => d ? new Date(d).toLocaleDateString('fr-FR') : '-';

  return (
    <ScrollView>
      <Text>Historique des adoptions</Text>
      {loading && <Text>Chargement...</Text>}
      {error && <Text>Erreur : {error}</Text>}
      {!loading && !error && entries.length === 0 && <Text>Aucune adoption terminée.</Text>}
      {sorted.map((item) => (
        <View key={item.sessionId}>
          <Text>Animal : {getAnimalLabel(item.animalType)}</Text>
          <Text>Rôle : {item.role === 'adopte' ? 'Adopté' : 'Adoptant'}</Text>
          <Text>Du {date(item.startedAt)} au {date(item.endedAt)}</Text>
          <Text>Cœurs : {item.heartsCount}</Text>
          <Text>Échecs : {item.failuresCount}</Text>
          <Text>Incomplets : {item.incompleteCount}</Text>
          <Text>Non joués : {item.notPlayedCount}</Text>
          <Text>Pièces : {item.totalCoinsDelta >= 0 ? '+' : ''}{item.totalCoinsDelta}</Text>
          {item.dailyResults.map((r) => <Text key={r.dayNumber}>Jour {r.dayNumber} : {r.status} — {r.message}</Text>)}
          {item.revealed && item.otherUserSummary && <Text>Avec : {item.otherUserSummary.pseudo}</Text>}
          <Text>{SMILE_LABELS[item.smileState]}</Text>
          <Text>{NEXT[item.nextStepState]}</Text>
          {item.revealed && item.otherUserSummary && <Button title="Voir le profil" onPress={() => router.push(`/profile/${item.otherUserSummary!.userId}` as never)} />}
        </View>
      ))}
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
