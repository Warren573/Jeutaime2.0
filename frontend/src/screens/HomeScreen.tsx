/**
 * HomeScreen — Tableau Personnel
 * Style : Tableau magnétique personnel
 */
import React from 'react';
import { View, Pressable, Text } from 'react-native';
import { PersonalBoard } from '../components/PersonalBoard';

export default function HomeScreen() {
  return (
    <View style={{ flex: 1 }}>
      <Pressable
        style={{ padding: 20, backgroundColor: 'yellow' }}
        onPress={() => console.log('TEST BUTTON CLICKED')}
      >
        <Text>TEST BUTTON</Text>
      </Pressable>
      <PersonalBoard />
    </View>
  );
}
