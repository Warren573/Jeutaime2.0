import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';

/**
 * Route dynamique pour une session Refuge spécifique
 * Accès: /refuge/[sessionId]
 * Le composant RefugeMainScreen récupère sessionId via useLocalSearchParams()
 */
export default function RefugeGamePage() {
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : null;

  return (
    <View style={{ flex: 1 }}>
      <View style={{ backgroundColor: '#0000FF', padding: 20, zIndex: 9999 }}>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' }}>
          ✅ TEST [sessionId].TSX GAME ACTIVE
        </Text>
        <Text style={{ fontSize: 16, color: '#FFFFFF', textAlign: 'center', marginTop: 10 }}>
          Session: {sessionId}
        </Text>
      </View>
      <RefugeMainScreen />
    </View>
  );
}
