import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface TabIconProps {
  icon: string;
  focused: boolean;
}

function TabIcon({ icon, focused }: TabIconProps) {
  return (
    <View style={[styles.tabIcon, focused && styles.tabIconFocused]}>
      <Text style={[styles.tabIconText, focused && styles.tabIconTextFocused]}>
        {icon}
      </Text>
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#3A2818',
          borderTopColor: '#DAA520',
          borderTopWidth: 2,
          height: 60 + insets.bottom,
          paddingBottom: insets.bottom,
          paddingTop: 8,
        },
        tabBarShowLabel: false,
        tabBarActiveTintColor: '#FFD700',
        tabBarInactiveTintColor: '#8B6F47',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ focused }) => <TabIcon icon="⭐" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="profiles"
        options={{
          title: 'Profils',
          tabBarIcon: ({ focused }) => <TabIcon icon="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="salons"
        options={{
          title: 'Salons',
          tabBarIcon: ({ focused }) => <TabIcon icon="👥" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="letters"
        options={{
          title: 'Lettres',
          tabBarIcon: ({ focused }) => <TabIcon icon="💌" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Plus',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconFocused: {
    backgroundColor: '#DAA520',
  },
  tabIconText: {
    fontSize: 24,
  },
  tabIconTextFocused: {
    fontSize: 26,
  },
});
