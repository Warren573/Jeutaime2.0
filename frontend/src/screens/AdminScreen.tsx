import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import {
  AdminReport,
  AdminSalon,
  AdminUser,
  AuditEntry,
  banAdminUser,
  listAdminReports,
  listAdminSalons,
  listAdminUsers,
  listAuditLog,
  setAdminSalonActive,
  unbanAdminUser,
  updateAdminReport,
} from '../api/admin';

type Tab = 'dashboard' | 'users' | 'reports' | 'salons' | 'tools';

const TABS: Array<{ key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'dashboard', label: 'Vue générale', icon: 'grid-outline' },
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'reports', label: 'Signalements', icon: 'flag-outline' },
  { key: 'salons', label: 'Salons', icon: 'chatbubbles-outline' },
  { key: 'tools', label: 'Outils', icon: 'construct-outline' },
];

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [query, setQuery] = useState('');

  const loadAll = useCallback(async () => {
    const [u, r, s, a] = await Promise.all([
      listAdminUsers(),
      listAdminReports(),
      listAdminSalons(),
      listAuditLog(),
    ]);
    setUsers(u);
    setReports(r.items);
    setReportTotal(r.total);
    setSalons(s);
    setAudit(a);
  }, []);

  useEffect(() => {
    if (currentUser?.role !== 'ADMIN') {
      router.replace('/(tabs)/settings' as any);
      return;
    }
    loadAll()
      .catch((err) => Alert.alert('Administration', err instanceof Error ? err.message : 'Chargement impossible.'))
      .finally(() => setLoading(false));
  }, [currentUser?.role, loadAll, router]);

  const refresh = async () => {
    setRefreshing(true);
    try { await loadAll(); } finally { setRefreshing(false); }
  };

  const filteredUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      u.email.toLowerCase().includes(q) ||
      (u.pseudo ?? '').toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q)
    );
  }, [query, users]);

  const confirm = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') return Promise.resolve(typeof window !== 'undefined' && window.confirm(message));
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const toggleBan = async (user: AdminUser) => {
    if (user.role === 'ADMIN') return;
    const ok = await confirm(
      user.isBanned ? 'Réactiver le compte' : 'Suspendre le compte',
      user.isBanned ? `Réactiver ${user.pseudo ?? user.email} ?` : `Suspendre ${user.pseudo ?? user.email} ?`,
    );
    if (!ok) return;
    try {
      const updated = user.isBanned
        ? await unbanAdminUser(user.id)
        : await banAdminUser(user.id, 'Suspension depuis le panneau administrateur');
      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, ...updated } : u));
    } catch (err) {
      Alert.alert('Administration', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const changeReport = async (report: AdminReport, status: AdminReport['status']) => {
    try {
      const updated = await updateAdminReport(report.id, status, status === 'DISMISSED' ? 'Signalement classé sans suite' : undefined);
      setReports((prev) => prev.map((r) => r.id === report.id ? updated : r));
    } catch (err) {
      Alert.alert('Signalement', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const toggleSalon = async (salon: AdminSalon, value: boolean) => {
    try {
      const updated = await setAdminSalonActive(salon.id, value);
      setSalons((prev) => prev.map((s) => s.id === salon.id ? updated : s));
    } catch (err) {
      Alert.alert('Salon', err instanceof Error ? err.message : 'Modification impossible.');
    }
  };

  if (currentUser?.role !== 'ADMIN') return null;

  const openReports = reports.filter((r) => r.status === 'OPEN' || r.status === 'REVIEWING').length;
  const bannedUsers = users.filter((u) => u.isBanned).length;
  const activeSalons = salons.filter((s) => s.isActive).length;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Ionicons name="chevron-back" size={22} color="#4A3424" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Administration</Text>
          <Text style={styles.subtitle}>JeuTaime · accès administrateur</Text>
        </View>
        <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMIN</Text></View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map((t) => (
          <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={[styles.tab, tab === t.key && styles.tabActive]}>
            <Ionicons name={t.icon} size={17} color={tab === t.key ? '#FFF' : '#7D6348'} />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.loader}><ActivityIndicator size="large" /><Text style={styles.muted}>Chargement…</Text></View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        >
          {tab === 'dashboard' && (
            <>
              <Text style={styles.sectionTitle}>Vue générale</Text>
              <View style={styles.statsGrid}>
                <View style={styles.stat}><Text style={styles.statValue}>{users.length}</Text><Text style={styles.statLabel}>Comptes récents</Text></View>
                <View style={styles.stat}><Text style={styles.statValue}>{openReports}</Text><Text style={styles.statLabel}>À modérer</Text></View>
                <View style={styles.stat}><Text style={styles.statValue}>{activeSalons}/{salons.length}</Text><Text style={styles.statLabel}>Salons actifs</Text></View>
                <View style={styles.stat}><Text style={styles.statValue}>{bannedUsers}</Text><Text style={styles.statLabel}>Suspendus</Text></View>
              </View>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Dernières actions</Text>
                {audit.slice(0, 8).map((a) => (
                  <View key={a.id} style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.rowTitle}>{a.action}</Text>
                      <Text style={styles.rowSub}>{a.target ?? '—'} · {formatDate(a.createdAt)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}

          {tab === 'users' && (
            <>
              <Text style={styles.sectionTitle}>Utilisateurs</Text>
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Pseudo, e-mail ou identifiant"
                placeholderTextColor="#A48C72"
                style={styles.search}
              />
              {filteredUsers.map((u) => (
                <View key={u.id} style={styles.card}>
                  <View style={styles.userHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{u.pseudo || 'Sans pseudo'}</Text>
                      <Text style={styles.rowSub}>{u.email}</Text>
                    </View>
                    <View style={[styles.rolePill, u.role === 'ADMIN' && styles.rolePillAdmin]}>
                      <Text style={styles.roleText}>{u.role}</Text>
                    </View>
                  </View>
                  <View style={styles.actions}>
                    <Text style={[styles.status, u.isBanned && styles.statusBad]}>
                      {u.isBanned ? 'Suspendu' : 'Actif'}
                    </Text>
                    {u.role !== 'ADMIN' && (
                      <TouchableOpacity style={[styles.actionButton, u.isBanned && styles.actionButtonGood]} onPress={() => void toggleBan(u)}>
                        <Text style={styles.actionButtonText}>{u.isBanned ? 'Réactiver' : 'Suspendre'}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {tab === 'reports' && (
            <>
              <Text style={styles.sectionTitle}>Signalements ({reportTotal})</Text>
              {reports.length === 0 && <Text style={styles.muted}>Aucun signalement.</Text>}
              {reports.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.userHead}>
                    <Text style={styles.cardTitle}>{r.reason}</Text>
                    <Text style={styles.status}>{r.status}</Text>
                  </View>
                  <Text style={styles.rowSub}>Cible : {r.target.email}</Text>
                  {!!r.details && <Text style={styles.details}>{r.details}</Text>}
                  <Text style={styles.rowSub}>{formatDate(r.createdAt)}</Text>
                  <View style={styles.actions}>
                    {r.status === 'OPEN' && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => void changeReport(r, 'REVIEWING')}>
                        <Text style={styles.actionButtonText}>Prendre en charge</Text>
                      </TouchableOpacity>
                    )}
                    {(r.status === 'OPEN' || r.status === 'REVIEWING') && (
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => void changeReport(r, 'DISMISSED')}>
                        <Text style={styles.secondaryText}>Classer</Text>
                      </TouchableOpacity>
                    )}
                    {r.status === 'REVIEWING' && (
                      <TouchableOpacity style={styles.actionButton} onPress={() => void changeReport(r, 'ACTIONED')}>
                        <Text style={styles.actionButtonText}>Action effectuée</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </>
          )}

          {tab === 'salons' && (
            <>
              <Text style={styles.sectionTitle}>Salons</Text>
              {salons.map((s) => (
                <View key={s.id} style={[styles.card, styles.salonRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{s.name}</Text>
                    <Text style={styles.rowSub}>{s.kind} · ordre {s.order}</Text>
                  </View>
                  <Switch value={s.isActive} onValueChange={(v) => void toggleSalon(s, v)} />
                </View>
              ))}
            </>
          )}

          {tab === 'tools' && (
            <>
              <Text style={styles.sectionTitle}>Outils</Text>
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Journal d’administration</Text>
                <Text style={styles.details}>Toutes les actions sensibles sont tracées automatiquement.</Text>
              </View>
              {audit.map((a) => (
                <View key={a.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{a.action}</Text>
                  <Text style={styles.rowSub}>Cible : {a.target ?? '—'}</Text>
                  <Text style={styles.rowSub}>{formatDate(a.createdAt)}</Text>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F0E5' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E5D6C1', backgroundColor: '#FFFDF8' },
  back: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5E9D8', marginRight: 10 },
  title: { fontSize: 22, fontWeight: '800', color: '#3A2818' },
  subtitle: { fontSize: 12, color: '#8F765C', marginTop: 2 },
  adminBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#A7324B' },
  adminBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  tabs: { paddingHorizontal: 12, paddingVertical: 10, gap: 8 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 11, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#E5D6C1' },
  tabActive: { backgroundColor: '#8B6F47', borderColor: '#8B6F47' },
  tabText: { color: '#6E563F', fontWeight: '700', fontSize: 13 },
  tabTextActive: { color: '#FFF' },
  content: { padding: 16, paddingBottom: 50 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sectionTitle: { fontSize: 20, fontWeight: '800', color: '#3A2818', marginBottom: 12 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: '#FFFDF8', borderRadius: 14, borderWidth: 1, borderColor: '#E5D6C1', padding: 14 },
  statValue: { fontSize: 24, fontWeight: '900', color: '#A7324B' },
  statLabel: { fontSize: 12, color: '#8F765C', marginTop: 4 },
  card: { backgroundColor: '#FFFDF8', borderRadius: 14, borderWidth: 1, borderColor: '#E5D6C1', padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#3A2818' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9DED0' },
  rowTitle: { fontSize: 14, fontWeight: '700', color: '#4D3726' },
  rowSub: { fontSize: 11, color: '#927960', marginTop: 3 },
  search: { backgroundColor: '#FFFDF8', borderRadius: 12, borderWidth: 1, borderColor: '#DCCCB7', paddingHorizontal: 14, paddingVertical: 12, color: '#3A2818', marginBottom: 12 },
  userHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EFE4D4' },
  rolePillAdmin: { backgroundColor: '#F1D7DE' },
  roleText: { fontSize: 10, fontWeight: '900', color: '#6A4F38' },
  status: { fontSize: 12, fontWeight: '800', color: '#5A7B55' },
  statusBad: { color: '#B34343' },
  details: { fontSize: 13, lineHeight: 19, color: '#5B4634', marginTop: 10 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionButton: { backgroundColor: '#8B6F47', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8 },
  actionButtonGood: { backgroundColor: '#5F7D58' },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  secondaryButton: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#D7C4AA' },
  secondaryText: { color: '#6F5943', fontSize: 12, fontWeight: '700' },
  salonRow: { flexDirection: 'row', alignItems: 'center' },
  muted: { color: '#927960', textAlign: 'center' },
});
