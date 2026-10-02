import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { listAdminMessages, markAdminMessageRead, type AdminMessageDTO } from '../api/adminMessages';

export default function AdminMessagesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AdminMessageDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setItems(await listAdminMessages());
  }, []);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  const openMessage = async (item: AdminMessageDTO) => {
    if (!item.isRead) {
      await markAdminMessageRead(item.id).catch(() => undefined);
      setItems((prev) => prev.map((m) => m.id === item.id ? { ...m, isRead: true } : m));
    }
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.back}>‹</Text></TouchableOpacity>
        <Text style={styles.title}>Messages de l’administration</Text>
        <View style={{ width: 28 }} />
      </View>
      {loading ? <ActivityIndicator style={{ marginTop: 40 }} /> : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => {
            setRefreshing(true);
            await load().finally(() => setRefreshing(false));
          }} />}
        >
          {items.length === 0 && <Text style={styles.empty}>Aucun message de l’administration.</Text>}
          {items.map((item) => (
            <TouchableOpacity key={item.id} style={[styles.card, !item.isRead && styles.unread]} onPress={() => void openMessage(item)}>
              <Text style={styles.badge}>ADMINISTRATION JEUTAIME</Text>
              <Text style={styles.subject}>{item.subject || 'Message de l’administration'}</Text>
              <Text style={styles.message}>{item.message}</Text>
              <Text style={styles.date}>{new Date(item.createdAt).toLocaleString('fr-FR')}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F0E5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: '#E5D6C1' },
  back: { fontSize: 32, color: '#6E563F' },
  title: { fontSize: 17, fontWeight: '800', color: '#3A2818' },
  content: { padding: 16, paddingBottom: 50 },
  card: { backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E5D6C1', borderRadius: 14, padding: 16, marginBottom: 12 },
  unread: { borderColor: '#A7324B', borderWidth: 2 },
  badge: { fontSize: 10, fontWeight: '900', color: '#A7324B', letterSpacing: 0.8, marginBottom: 8 },
  subject: { fontSize: 16, fontWeight: '800', color: '#3A2818', marginBottom: 8 },
  message: { fontSize: 14, lineHeight: 21, color: '#5B4634' },
  date: { fontSize: 11, color: '#927960', marginTop: 12 },
  empty: { textAlign: 'center', color: '#927960', marginTop: 40 },
});
