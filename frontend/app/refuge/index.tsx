import React, { useCallback, useState } from 'react';
import { Button, View, Text } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import RefugeDefaultSessionScreen from '../../src/screens/RefugeDefaultSessionScreen';
import { refugeApi } from '../../src/api/refuge-api';

export default function RefugePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(useCallback(() => {
    let active = true;
    refugeApi.getActive()
      .then((session) => { if (active) setSessionId(session?.id ?? null); })
      .catch((e) => { if (active) setError(e instanceof Error ? e.message : String(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []));

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error) return <View><Text>Erreur de chargement du Refuge : {error}</Text></View>;
  if (sessionId) return <RefugeDefaultSessionScreen sessionId={sessionId} />;

  return (
    <View>
      <Text>Refuge</Text>
      <Text>Aucune session active.</Text>
      <Button title="Proposer un animal" onPress={() => router.push('/refuge/propose')} />
      <Button title="Adopter" onPress={() => router.push('/refuge/adopt')} />
      <Button title="Historique" onPress={() => router.push('/refuge/history')} />
    </View>
  );
}
