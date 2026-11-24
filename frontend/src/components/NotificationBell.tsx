import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { badgeLabel, unreadSummary } from '../utils/notificationsView';
import { BellGlyph } from './NotificationIcon';


/**
 * Cloche de l’accueil : ouvre « Mes notifications ». Le badge lit le MÊME compteur que l'icône de
 * l'application (store.unreadNotificationsCount, alimenté par le polling existant).
 */
export function NotificationBell({ style }: { style: StyleProp<ViewStyle> }) {
  const router = useRouter();
  const unread = useStore((s) => s.unreadNotificationsCount);
  const loadUnreadCount = useStore((s) => s.loadUnreadCount);
  const label = badgeLabel(unread);

  // Compteur à jour à chaque retour sur l’accueil (le polling reste actif en parallèle).
  useFocusEffect(
    useCallback(() => {
      void loadUnreadCount();
    }, [loadUnreadCount]),
  );

  return (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={`Mes notifications, ${unreadSummary(unread).toLowerCase()}`}
      activeOpacity={0.7}
      onPress={() => router.push('/notifications' as never)}
      style={style}
    >
      <BellGlyph color="#FFF8E7" />
      {label ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>{label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: -8,
    right: -4,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    backgroundColor: '#8B2E3C',
    borderWidth: 1.5,
    borderColor: '#F4EFE1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#FFF8E7',
    fontSize: 11.5,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'System' : undefined,
    fontVariant: ['tabular-nums'],
    includeFontPadding: false,
  },
});

