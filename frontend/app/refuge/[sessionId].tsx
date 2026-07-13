import React from 'react';
import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';

export default function RefugeGamePage() {
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : null;

  if (!sessionId) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Session invalide</Text>
      </View>
    );
  }

  return <RefugeMainScreen sessionIdProp={sessionId} />;
}
