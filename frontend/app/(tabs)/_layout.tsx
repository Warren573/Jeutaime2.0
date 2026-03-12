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
          title: 'Lettres',
          tabBarIcon: ({ focused }) => (
            <View style={[styles.tabIcon, focused ? styles.tabIconFocused : null]}>
              <Text style={styles.tabIconText}>💌</Text>
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
    height: 70,
    paddingBottom: 10,
    paddingTop: 5,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  tabIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#DAA520',
  },
  tabIconText: {
    fontSize: 20,
  },
});
