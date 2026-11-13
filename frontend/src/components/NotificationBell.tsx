import React, { useCallback } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { badgeLabel, unreadSummary } from '../utils/notificationsView';
import { BellGlyph } from './NotificationIcon';


/**
 * Cloche du Journal : ouvre « Mes notifications ». Le badge lit le MÊME compteur que l'icône de
 * l'application (store.unreadNotificationsCount, alimenté par le polling existant).
 */
export function NotificationBell() {
  const router = useRouter();
  const unread = useStore((s) => s.unreadNotificationsCount);
  const loadUnreadCount = useStore((s) => s.loadUnreadCount);
  const label = badgeLabel(unread);

  // Compteur à jour à chaque retour sur le Journal (le polling reste actif en parallèle).
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
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 14 }}
      onPress={() => router.push('/notifications' as never)}
      style={styles.bell}
    >
      <BellGlyph color="#2A2118" />
      {label ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText} allowFontScaling={false}>{label}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FEFAF0',
    borderWidth: 1,
    borderColor: '#B8A377',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#5B3E26',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.18,
    shadowRadius: 2,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: -8,
    right: -12,
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

