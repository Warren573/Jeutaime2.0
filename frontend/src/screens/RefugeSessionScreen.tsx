import React, { useState, useEffect } from 'react';
import { View, ScrollView, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { refugeApi } from '../api/refuge-api';

export function RefugeSessionScreen() {
  const params = useLocalSearchParams();
  const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await refugeApi.getSession(sessionId);
        setSession(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSession();
    }
  }, [sessionId]);

  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          <Text>sessionId: {sessionId}</Text>
          {loading && <Text>Loading...</Text>}
          {error && <Text>Error: {error}</Text>}
          {session && (
            <>
              <Text>status: {session.status}</Text>
              <Text>background: {session.background}</Text>
              <Text>animalType: {session.animalType}</Text>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
