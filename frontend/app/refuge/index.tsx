import React, { useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { View, Text } from 'react-native';
import { RefugePolishedScreen } from '../../src/screens/RefugePolishedScreen';
import { RefugeHomeScreen } from '../../src/screens/RefugeHomeScreen';
import { refugeApi } from '../../src/api/refuge-api';

export default function RefugePage() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(() => {
    async function load() {
      try {
        const active = await refugeApi.getActive();
        if (active?.id) {
          setSessionId(active.id);
        } else {
          setSessionId(null);
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setLoading(false);
      }
    }

    load();
  });

  if (loading && !sessionId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF8E7' }}>
        <Text style={{ fontSize: 14, color: '#8B6F47' }}>Chargement...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 }}>
        <Text style={{ fontSize: 16, color: '#d32f2f', textAlign: 'center' }}>
          Erreur de chargement du Refuge
        </Text>
        <Text style={{ fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' }}>
          {error}
        </Text>
      </View>
    );
  }

  if (sessionId) {
    return <RefugePolishedScreen sessionIdProp={sessionId} />;
  }

  return <RefugeHomeScreen />;
}
