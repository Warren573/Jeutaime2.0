import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import type { NotificationDto } from '../api/notifications';
import { getUserSettings, updateUserSettings } from '../api/userSettings';
import { getNotificationTarget } from '../utils/notifications';

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "À l'instant";
  if (min < 60) return `Il y a ${min} min`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `Il y a ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `Il y a ${days} j`;
  return new Date(iso).toLocaleDateString('fr-FR');
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { notifications, unreadNotificationsCount, loadNotifications, loadUnreadCount, markNotificationRead, markAllNotificationsRead } = useStore();
  const [loading, setLoading] = useState(true);
  const [notifPush, setNotifPush] = useState(true);
  const [savingPreference, setSavingPreference] = useState(false);

  const loadPreferences = useCallback(async () => {
    const settings = await getUserSettings();
    setNotifPush(settings.notifPush);
  }, []);
  const refresh = useCallback(async () => {
    await Promise.all([loadNotifications(), loadUnreadCount(), loadPreferences()]);
  }, [loadNotifications, loadUnreadCount, loadPreferences]);

  useEffect(() => { refresh().catch(() => {}).finally(() => setLoading(false)); }, [refresh]);
  useFocusEffect(useCallback(() => { void refresh().catch(() => {}); }, [refresh]));

  const openNotification = async (notification: NotificationDto) => {
    if (!notification.isRead) await markNotificationRead(notification.id);
    const target = getNotificationTarget(notification);
    if (target) router.push(target as any);
  };

  const setPushPreference = async (value: boolean) => {
    if (savingPreference) return;
    const previous = notifPush;
    setNotifPush(value);
    try {
      setSavingPreference(true);
      const next = await updateUserSettings({ notifPush: value });
      setNotifPush(next.notifPush);
    } catch (error) {
      setNotifPush(previous);
      Alert.alert('Erreur', error instanceof Error ? error.message : 'Impossible de modifier ce réglage.');
    } finally { setSavingPreference(false); }
  };

  if (loading) return <Text>Chargement...</Text>;

  return <ScrollView>
    <Text>Notifications</Text>
    <Text>Notifications push</Text>
    <Switch value={notifPush} onValueChange={(value) => void setPushPreference(value)} disabled={savingPreference} />
    <Text>Non lues : {unreadNotificationsCount}</Text>
    {unreadNotificationsCount > 0 && <Button title="Tout marquer comme lu" onPress={() => void markAllNotificationsRead()} />}
    <Button title="Actualiser" onPress={() => void refresh()} />
    {notifications.length === 0 && <Text>Aucune notification pour l'instant.</Text>}
    {notifications.map((notification) => {
      const target = getNotificationTarget(notification);
      return <View key={notification.id}>
        <Text>{notification.isRead ? 'Lue' : 'Non lue'}</Text>
        <Text>{notification.message}</Text>
        <Text>{formatRelative(notification.createdAt)}</Text>
        <Button title={target ? 'Ouvrir' : notification.isRead ? 'Déjà lue' : 'Marquer comme lue'} onPress={() => void openNotification(notification)} />
      </View>;
    })}
    <Button title="Retour" onPress={() => router.back()} />
  </ScrollView>;
}
