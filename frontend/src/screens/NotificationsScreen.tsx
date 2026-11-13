import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import type { NotificationDto } from '../api/notifications';
import { getUserSettings, updateUserSettings } from '../api/userSettings';
import { getNotificationTarget } from '../utils/notifications';
import { categoryFor, formatNotificationTime, groupByDay, unreadSummary } from '../utils/notificationsView';
import { NotificationIcon } from '../components/NotificationIcon';

const SERIF = Platform.OS === 'ios' ? 'Georgia' : 'serif';
const INK = '#2A2118';
const INK_SOFT = '#5C4B3A';
const RULE = '#B8A377';
const BURGUNDY = '#8B2E3C';
const GOLD = '#B87333';
const MUTED = '#8B6F47';
const PAPER = '#FEFAF0';

function NotifItem({
  item,
  now,
  onPress,
}: {
  item: NotificationDto;
  now: Date;
  onPress: (notification: NotificationDto) => void;
}) {
  const category = categoryFor(item.type);
  const unread = !item.isRead;
  const hasTarget = !!getNotificationTarget(item);
  return (
    <TouchableOpacity
      style={[styles.item, unread && styles.itemUnread]}
      onPress={() => onPress(item)}
      activeOpacity={hasTarget ? 0.75 : 1}
      accessibilityRole="button"
      accessibilityLabel={`${category.label}. ${item.message}. ${unread ? 'Non lue.' : 'Lue.'}`}
    >
      {unread ? <View style={styles.unreadBar} /> : null}
      <View style={[styles.iconWrap, !unread && styles.iconWrapRead]}>
        <NotificationIcon name={category.icon} color={unread ? BURGUNDY : MUTED} />
      </View>
      <View style={styles.itemBody}>
        <Text style={styles.category}>{category.label.toUpperCase()}</Text>
        <Text style={[styles.itemMsg, unread && styles.itemMsgUnread]}>{item.message}</Text>
      </View>
      <View style={styles.itemWhen}>
        <Text style={styles.itemDate}>{formatNotificationTime(item.createdAt, now)}</Text>
        {unread ? <View style={styles.unreadDot} /> : null}
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

  // Les plus récentes d'abord, regroupées par jour ; l'historique (lues) reste affiché.
  const now = new Date();
  const sections = useMemo(() => groupByDay(notifications as NotificationDto[], new Date()), [notifications]);

  const preferencesFooter = (
    <>
      <View style={styles.preferencesCard}>
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
      {notifications.length > 0 ? <Text style={styles.colophon}>{"— Fin de l'historique —"}</Text> : null}
    </>
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.headerWrap}>
        <TouchableOpacity
          onPress={() => router.replace('/journal' as never)}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Retour au Journal"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 12 }}
        >
          <Text style={styles.backChevron}>‹</Text>
          <Text style={styles.backText}>Journal</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mes notifications</Text>
        <View style={styles.rule} />
        <View style={styles.subRow}>
          <Text style={styles.count}>{unreadSummary(unreadNotificationsCount)}</Text>
          {unreadNotificationsCount > 0 ? (
            <TouchableOpacity
              onPress={handleMarkAll}
              style={styles.markAllBtn}
              accessibilityRole="button"
              accessibilityLabel="Tout marquer comme lu"
            >
              <Text style={styles.markAllText}>✓  Tout marquer comme lu</Text>
            </TouchableOpacity>
          ) : null}
        </View>
        <View style={[styles.rule, { marginTop: 0 }]} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={BURGUNDY} />
        </View>
      ) : (
        <SectionList<NotificationDto, { key: string; title: string; data: NotificationDto[] }>
          sections={sections}
          keyExtractor={(n) => n.id}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => <Text style={styles.dayLabel}>{section.title}</Text>}
          renderItem={({ item }) => <NotifItem item={item} now={now} onPress={handlePress} />}
          ListFooterComponent={preferencesFooter}
          ListEmptyComponent={(
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>{"Aucune notification pour l'instant."}</Text>
              <Text style={styles.emptyText}>Tes lettres, rencontres et invitations apparaîtront ici.</Text>
            </View>
          )}
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 28 }]}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={BURGUNDY}
              colors={[BURGUNDY]}
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
    backgroundColor: '#F4EFE1',
  },
  headerWrap: {
    paddingHorizontal: 18,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginTop: 12,
  },
  backChevron: {
    fontSize: 26,
    lineHeight: 26,
    color: BURGUNDY,
    marginRight: 3,
    marginTop: -2,
  },
  backText: {
    fontSize: 15.5,
    fontFamily: SERIF,
    fontWeight: '700',
    color: BURGUNDY,
  },
  title: {
    textAlign: 'center',
    fontSize: 31,
    lineHeight: 36,
    fontFamily: SERIF,
    fontWeight: '700',
    color: '#1E1813',
    letterSpacing: 0.5,
    marginTop: 4,
  },
  rule: {
    height: 1,
    backgroundColor: INK,
    marginTop: 10,
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 9,
    marginBottom: -1,
    minHeight: 48,
  },
  count: {
    fontSize: 15,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: INK_SOFT,
  },
  markAllBtn: {
    paddingVertical: 7,
    paddingHorizontal: 11,
    borderWidth: 1,
    borderColor: 'rgba(139,46,60,0.45)',
    borderRadius: 999,
    backgroundColor: 'rgba(254,250,240,0.8)',
  },
  markAllText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: BURGUNDY,
  },
  list: {
    paddingTop: 0,
  },
  dayLabel: {
    paddingHorizontal: 18,
    paddingTop: 11,
    paddingBottom: 5,
    fontSize: 10,
    letterSpacing: 2.2,
    fontFamily: SERIF,
    color: INK_SOFT,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: RULE,
    backgroundColor: 'transparent',
  },
  itemUnread: {
    backgroundColor: 'rgba(240,217,140,0.20)',
  },
  unreadBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    backgroundColor: GOLD,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE,
    marginRight: 12,
  },
  iconWrapRead: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(184,163,119,0.7)',
  },
  itemBody: {
    flex: 1,
    minWidth: 0,
  },
  category: {
    fontSize: 9.5,
    letterSpacing: 1.7,
    fontFamily: SERIF,
    color: INK_SOFT,
    marginBottom: 2,
  },
  itemMsg: {
    fontSize: 14.5,
    lineHeight: 19,
    fontFamily: SERIF,
    color: INK_SOFT,
  },
  itemMsgUnread: {
    fontWeight: '700',
    color: INK,
  },
  itemWhen: {
    alignItems: 'flex-end',
    marginLeft: 10,
    paddingTop: 1,
  },
  itemDate: {
    fontSize: 11.5,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: INK_SOFT,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: BURGUNDY,
    marginTop: 7,
  },
  preferencesCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 18,
    marginTop: 16,
    backgroundColor: PAPER,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: RULE,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  preferenceTextWrap: {
    flex: 1,
    paddingRight: 12,
  },
  preferenceLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: INK,
  },
  preferenceHint: {
    fontSize: 11.5,
    color: MUTED,
    marginTop: 2,
  },
  colophon: {
    textAlign: 'center',
    fontSize: 13,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: INK_SOFT,
    paddingTop: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 6,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: SERIF,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13.5,
    fontFamily: SERIF,
    fontStyle: 'italic',
    color: INK_SOFT,
    textAlign: 'center',
  },
});
