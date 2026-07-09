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
      <RefugeMainScreen />
    </View>
  );
}
