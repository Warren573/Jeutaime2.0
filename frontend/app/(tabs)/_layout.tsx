import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#8B6F47',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>⭐</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'Profils',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>🔍</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="salons"
        options={{
          title: 'Salons',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>👥</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="letters"
        options={{
          title: 'Boîte aux lettres',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>💌</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="journal"
        options={{
          title: 'Journal',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>📰</Text>
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Plus',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>⚙️</Text>
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#3A2818',
    borderTopColor: '#DAA520',
    borderTopWidth: 2,
    height: 85,
    paddingBottom: 20,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 4,
  },
  tabIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#DAA520',
    transform: [{ scale: 1.1 }],
  },
  tabIconText: {
    fontSize: 26,
  },
});
