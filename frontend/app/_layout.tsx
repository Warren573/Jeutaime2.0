import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useStore } from '../src/store/useStore';

export default function RootLayout() {
  const { loadUserData, setCurrentUser, currentUser } = useStore();

  useEffect(() => {
    // Charger les données utilisateur
    loadUserData();
    
    // Créer un utilisateur par défaut si aucun n'existe
    if (!currentUser) {
      setCurrentUser({
        id: 'user_1',
        name: 'Joueur',
        email: 'joueur@jeutaime.com',
        gender: 'M',
        age: 25,
        coins: 500,
        premium: false,
      });
    }
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
        <Stack.Screen 
          name="salon/[id]" 
          options={{ 
            headerShown: false,
            presentation: 'card',
          }} 
        />
      </Stack>
    </SafeAreaProvider>
  );
}
