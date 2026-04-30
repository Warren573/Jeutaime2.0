import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import type { NotificationDto, NotificationType } from '../api/notifications';
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
    markNotificationRead,
    markAllNotificationsRead,
  } = useStore();

  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadNotifications().finally(() => setLoading(false));
  }, []);

  const handlePress = useCallback(async (notification: NotificationDto) => {
    // Marquer comme lu si nécessaire (fire-and-forget, ne bloque pas la nav)
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

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 8 }]}>
      {/* Header */}
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
      ) : notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyEmoji}>🔕</Text>
          <Text style={styles.emptyText}>Aucune notification pour l'instant.</Text>
        </View>
      ) : (
        <FlatList<NotificationDto>
          data={notifications}
          keyExtractor={(n) => n.id}
          renderItem={({ item }) => (
            <NotifItem item={item as NotificationDto} onPress={handlePress} />
          )}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
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
  emptyEmoji: {
    fontSize: 48,
  },
  emptyText: {
    fontSize: 15,
    color: '#6B6B6B',
  },
});
