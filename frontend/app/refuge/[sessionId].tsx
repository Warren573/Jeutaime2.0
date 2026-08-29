import React from 'react';
import { Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import RefugeDefaultSessionScreen from '../../src/screens/RefugeDefaultSessionScreen';

export default function RefugeGamePage() {
  const params = useLocalSearchParams();
  const sessionId = typeof params.sessionId === 'string' ? params.sessionId : null;
  if (!sessionId) return <View><Text>Session invalide</Text></View>;
  return <RefugeDefaultSessionScreen sessionId={sessionId} />;
}
