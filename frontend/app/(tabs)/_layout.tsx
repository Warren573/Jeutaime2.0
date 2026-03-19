import React from 'react';
import { Tabs } from 'expo-router';
import CustomTabBar from '../../src/components/CustomTabBar';

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen name="index"       options={{ title: 'Accueil' }} />
      <Tabs.Screen name="profiles"    options={{ title: 'Profils' }} />
      <Tabs.Screen name="social"      options={{ title: 'Social' }} />
      <Tabs.Screen name="letters"     options={{ title: 'Lettres' }} />
      <Tabs.Screen name="journal"     options={{ title: 'Journal' }} />
      <Tabs.Screen name="settings"    options={{ title: 'Plus' }} />
      <Tabs.Screen name="salons-list" options={{ href: null }} />
    </Tabs>
  );
}
