import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const { loadUserData, currentUser, setCurrentUser } = useStore();

  useEffect(() => {
    loadUserData();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="salon/[id]"  options={{ presentation: 'card' }} />
        <Stack.Screen name="duel/create" options={{ presentation: 'card' }} />
        <Stack.Screen name="duel/play"   options={{ presentation: 'card' }} />
        <Stack.Screen name="profile/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="background-picker" options={{ presentation: 'card' }} />
        <Stack.Screen name="games" options={{ presentation: 'card' }} />
        <Stack.Screen name="pet" options={{ presentation: 'card' }} />
        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="bottle" options={{ presentation: 'card' }} />
        <Stack.Screen name="weekly-profile"  options={{ presentation: 'card' }} />
        <Stack.Screen name="avatar-builder" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
