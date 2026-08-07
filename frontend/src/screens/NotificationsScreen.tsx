import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import type { NotificationDto, NotificationType } from '../api/notifications';
import { getUserSettings, updateUserSettings } from '../api/userSettings';
import { getNotificationTarget } from '../utils/notifications';

const TYPE_EMOJI: Record<NotificationType, string> = {
  LETTER_RECEIVED:    '💌',
  MATCH_CREATED:      '💘',
  OFFERING_RECEIVED:  '🎁',
  MAGIE_RECEIVED:     '✨',
  MAGIE_BROKEN:       '💥',
  PREMIUM_SUBSCRIBED: '👑',
  PREMIUM_CANCELLED:  '😔',
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min  = Math.floor(diff / 60_000);
  if (min < 1)   return "À l'instant";
  if (min < 60)  return `Il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24)    return `Il y a ${h} h`;
  const d = Math.floor(h / 24);
  if (d < 7)     return `Il y a ${d} j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

function NotifItem({
  item,
  onPress,
}: {
  item: NotificationDto;
  onPress: (notification: NotificationDto) => void;
}) {
  const hasTarget = !!getNotificationTarget(item);
  return (
    <TouchableOpacity
      style={[styles.item, !item.isRead && styles.itemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={hasTarget ? 0.75 : 1}
    >
      <View style={styles.itemLeft}>
        <Text style={styles.itemEmoji}>{TYPE_EMOJI[item.type] ?? '🔔'}</Text>
        {!item.isRead && <View style={styles.unreadDot} />}
      </View>
      <View style={styles.itemBody}>
        <Text style={[styles.itemMsg, !item.isRead && styles.itemMsgBold]}>
          {item.message}
        </Text>
        <View style={styles.itemFooter}>
          <Text style={styles.itemDate}>{formatRelative(item.createdAt)}</Text>
          {hasTarget && <Text style={styles.itemChevron}>›</Text>}
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const {
    notifications,
    unreadNotificationsCount,
    loadNotifications,
    loadUnreadCount,
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [notifPush, setNotifPush] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);

  const loadPreferences = useCallback(async () => {
    const settings = await getUserSettings();
    setNotifPush(settings.notifPush);
  }, []);

  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount(), loadPreferences()]);
  }, [loadNotifications, loadUnreadCount, loadPreferences]);

  useEffect(() => {
    refresh()
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      void refresh().catch(() => {});
    }, [refresh]),
  );

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }, [refresh]);

  const handlePress = useCallback(async (notification: NotificationDto) => {
    if (!notification.isRead) {
      void markNotificationRead(notification.id);
    }
    const target = getNotificationTarget(notification);
    if (target) {
      router.push(target as any);
    }
  }, [markNotificationRead, router]);

  const handleMarkAll = useCallback(async () => {
    await markAllNotificationsRead();
  }, [markAllNotificationsRead]);

  const handlePushPreference = useCallback(async (value: boolean) => {
    if (savingPreference) return;
    const previous = notifPush;
    setNotifPush(value);

    try {
      setSavingPreference(true);
      const next = await updateUserSettings({ notifPush: value });
      setNotifPush(next.notifPush);
    } catch (err) {
      setNotifPush(previous);
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de modifier ce réglage.',
      );
    } finally {
      setSavingPreference(false);
    }
  }, [notifPush, savingPreference]);

  const preferencesHeader = (
    <>
      <View style={styles.preferencesCard}>
        <Text style={styles.preferencesTitle}>Préférences</Text>
        <View style={[styles.preferenceRow, styles.preferenceRowLast]}>
          <View style={styles.preferenceTextWrap}>
            <Text style={styles.preferenceLabel}>Notifications push</Text>
            <Text style={styles.preferenceHint}>Alertes envoyées sur ton appareil.</Text>
          </View>
          <Switch
            value={notifPush}
            onValueChange={(value) => void handlePushPreference(value)}
            disabled={savingPreference}
          />
        </View>
      </View>
      <Text style={styles.historyTitle}>Historique</Text>
    </>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Notifications</Text>
        {unreadNotificationsCount > 0 ? (
          <TouchableOpacity onPress={handleMarkAll} style={styles.markAllBtn}>
            <Text style={styles.markAllText}>Tout lire</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.markAllBtn} />
        )}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#8B2E3C" />
        </View>
      ) : (
        <FlatList<NotificationDto>
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotifItem item={item as NotificationDto} onPress={handlePress} />
          )}
          ListHeaderComponent={preferencesHeader}
          ListEmptyComponent={(
            <View style={styles.emptyBox}>
              <Text style={styles.emptyEmoji}>🔕</Text>
              <Text style={styles.emptyText}>Aucune notification pour l'instant.</Text>
            </View>
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#8B2E3C"
              colors={['#8B2E3C']}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F5F1E8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#D8D2C4',
  },
  backBtn: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 22,
    color: '#2B2B2B',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: '800',
    color: '#2B2B2B',
  },
  markAllBtn: {
    width: 60,
    alignItems: 'flex-end',
  },
  markAllText: {
    fontSize: 13,
    color: '#8B2E3C',
    fontWeight: '700',
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 28,
  },
  preferencesCard: {
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 18,
    backgroundColor: '#FFF8F0',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#DED4C5',
    paddingHorizontal: 14,
  },
  preferencesTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8B2E3C',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    paddingTop: 14,
    paddingBottom: 4,
  },
  preferenceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E2D8',
  },
  preferenceRowLast: {
    borderBottomWidth: 0,
  },
  preferenceTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  preferenceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#2B2B2B',
  },
  preferenceHint: {
    fontSize: 11,
    color: '#8A8174',
    marginTop: 2,
    lineHeight: 16,
  },
  historyTitle: {
    marginHorizontal: 16,
    marginBottom: 8,
    fontSize: 12,
    fontWeight: '800',
    color: '#8A8174',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  separator: {
    height: 1,
    backgroundColor: '#E8E2D8',
    marginHorizontal: 16,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#F5F1E8',
  },
  itemUnread: {
    backgroundColor: '#FFF8F0',
  },
  itemLeft: {
    width: 44,
    alignItems: 'center',
    position: 'relative',
    paddingTop: 2,
  },
  itemEmoji: {
    fontSize: 26,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 4,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#8B2E3C',
  },
  itemBody: {
    flex: 1,
    paddingLeft: 4,
  },
  itemMsg: {
    fontSize: 14,
    color: '#2B2B2B',
    lineHeight: 20,
  },
  itemMsgBold: {
    fontWeight: '700',
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  itemDate: {
    fontSize: 11,
    color: '#9B9080',
  },
  itemChevron: {
    fontSize: 18,
    color: '#C9A96E',
    lineHeight: 20,
    fontWeight: '700',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B6B6B',
  },
});
