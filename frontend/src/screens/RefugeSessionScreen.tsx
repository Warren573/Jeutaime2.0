import React from 'react';
import { View, ScrollView, Text } from 'react-native';

export default function RefugeSessionScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: '#fff' }}>
      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        <View style={{ padding: 20 }}>
          <Text>Structure OK</Text>
        </View>
      </ScrollView>
    </View>
  );
}
