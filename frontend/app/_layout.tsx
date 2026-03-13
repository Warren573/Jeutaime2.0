import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store/useStore';

// Polyfill for ReactRefreshRuntime on web
if (Platform.OS === 'web' && typeof window !== 'undefined') {
  // @ts-ignore
  if (!window.__ReactRefreshRuntime) {
    // @ts-ignore
    window.__ReactRefreshRuntime = {
      injectIntoGlobalHook: () => {},
      register: () => {},
      createSignatureFunctionForTransform: () => () => {},
    };
  }
}

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
        <Stack.Screen name="salon/[id]" options={{ presentation: 'card' }} />
        <Stack.Screen name="salon/cafe-paris" options={{ presentation: 'card' }} />
        <Stack.Screen name="games" options={{ presentation: 'card' }} />
        <Stack.Screen name="pet" options={{ presentation: 'card' }} />
        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="bottle" options={{ presentation: 'card' }} />
        <Stack.Screen name="weekly-profile" options={{ presentation: 'card' }} />
      </Stack>
    </SafeAreaProvider>
  );
}
