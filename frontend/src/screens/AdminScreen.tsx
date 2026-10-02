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
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import { API_URL } from '../api/client';
import {
  AdminOverview,
  AdminReport,
  AdminSalon,
  AdminSalonSession,
  AdminUser,
  AdminUserDetail,
  AuditEntry,
  HealthVersion,
  OperationsOverview,
  LoginEvent,
  SystemIncident,
  AdminSupportTicket,
  EconomyOverview,
  EconomyTransaction,
  EconomyCatalog,
  PremiumAdminUser,
  AdminPrivateSalon,
  CommunityJournalAdminPost,
  ModerationOverview,
  ModerationPhoto,
  ModerationProfile,
  ModerationSalonMessage,
  adjustAdminUserCoins,
  banAdminUser,
  grantAdminPremium,
  getAdminOverview,
  getAdminSalonSession,
  getAdminUser,
  getHealthVersion,
  getOperationsOverview,
  listLoginEvents,
  listSystemIncidents,
  updateSystemIncident,
  listAdminSupportTickets,
  updateAdminSupportTicket,
  getEconomyOverview,
  listEconomyTransactions,
  getEconomyCatalog,
  listPremiumAdminUsers,
  updateOfferingCatalogItem,
  updateMagieCatalogItem,
  sendAdminDirectMessage,
  createAdminPrivateSalon,
  listAdminPrivateSalons,
  listCommunityJournalPosts,
  publishCommunityJournalPost,
  inviteUserToPrivateSalon,
  removeUserFromPrivateSalon,
  getModerationOverview,
  getModerationProfile,
  listModerationPhotos,
  listModerationSalonMessages,
  moderatePhoto,
  moderateProfile,
  moderateSalonMessage,
  listAdminReports,
  listAdminSalons,
  listAdminUsers,
  listAuditLog,
  removeAdminSalonParticipant,
  resetAdminUserRefuge,
  resetAdminUserSalons,
  setAdminSalonActive,
  unbanAdminUser,
  updateAdminReport,
  updateAdminUserRole,
  warnAdminUser,
} from '../api/admin';

type Tab = 'dashboard' | 'users' | 'content' | 'reports' | 'salons' | 'economy' | 'operations' | 'tools';
type ReportFilter = 'ALL' | AdminReport['status'];

const TABS: Array<{ key: Tab; label: string; icon: React.ComponentProps<typeof Ionicons>['name'] }> = [
  { key: 'dashboard', label: 'Vue générale', icon: 'grid-outline' },
  { key: 'users', label: 'Utilisateurs', icon: 'people-outline' },
  { key: 'content', label: 'Contenus', icon: 'images-outline' },
  { key: 'reports', label: 'Signalements', icon: 'flag-outline' },
  { key: 'salons', label: 'Salons', icon: 'chatbubbles-outline' },
  { key: 'economy', label: 'Économie', icon: 'wallet-outline' },
  { key: 'operations', label: 'Incidents', icon: 'pulse-outline' },
  { key: 'tools', label: 'Outils', icon: 'construct-outline' },
];

function formatDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' });
}

function Metric({ value, label }: { value: string | number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

function auditLabel(action: string) {
  const labels: Record<string, string> = {
    'admin.salon.deactivate': 'Salon désactivé',
    'admin.salon.activate': 'Salon activé',
    'admin.report.update': 'Signalement mis à jour',
    'admin.user.ban': 'Utilisateur suspendu',
    'admin.user.unban': 'Utilisateur réactivé',
    'admin.user.warn': 'Avertissement enregistré',
    'admin.user.coins.adjust': 'Solde de pièces ajusté',
    'admin.user.role.update': 'Rôle utilisateur modifié',
    'admin.photo.hide': 'Photo masquée',
    'admin.photo.remove': 'Photo retirée',
    'admin.photo.restore': 'Photo restaurée',
    'admin.profile.bio.clear': 'Bio supprimée par modération',
    'admin.profile.discovery.hide': 'Profil retiré de la découverte',
    'admin.profile.discovery.restore': 'Profil rétabli dans la découverte',
    'admin.salon_message.hide': 'Message de salon masqué',
    'admin.salon_message.restore': 'Message de salon restauré',
    'admin.salon.participant.remove': 'Participant retiré d’un salon',
    'admin.user.message.send': 'Message admin envoyé',
    'admin.private_salon.create': 'Salon privé créé',
    'admin.private_salon.invite': 'Invitation salon privé envoyée',
    'admin.private_salon.remove': 'Participant retiré du salon privé',
    'admin.shop.offering.update': 'Offrande boutique modifiée',
    'admin.shop.magie.update': 'Magie boutique modifiée',
    'admin.incident.resolve': 'Incident technique résolu',
    'admin.incident.reopen': 'Incident technique rouvert',
    'admin.user.premium.grant': 'Premium offert',
    'admin.user.salons.reset': 'Salons réinitialisés',
    'admin.user.refuge.reset': 'Refuge réinitialisé',
    'admin.journal.community.publish': 'Article publié dans le Journal communautaire',
  };
  return labels[action] ?? action.replace(/^admin\./, '').replaceAll('.', ' · ');
}

function roleLabel(role?: string | null) {
  const labels: Record<string, string> = {
    USER: 'Utilisateur',
    MODERATOR: 'Modérateur',
    ADMIN: 'Administrateur',
  };
  return role ? (labels[role] ?? role) : '—';
}

function reportStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    OPEN: 'Ouvert',
    REVIEWING: 'En cours',
    ACTIONED: 'Traité',
    DISMISSED: 'Classé',
  };
  return status ? (labels[status] ?? status) : '—';
}

function moderationStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Publiée',
    HIDDEN: 'Masquée',
    REMOVED: 'Retirée',
  };
  return status ? (labels[status] ?? status) : '—';
}

function participantStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Présent',
    LEFT: 'Parti',
    REMOVED: 'Retiré',
    KICKED: 'Exclu',
  };
  return status ? (labels[status] ?? status) : '—';
}

function privateSalonStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    ACTIVE: 'Actif',
    ENDED: 'Terminé',
    EXPIRED: 'Expiré',
    CLOSED: 'Fermé',
  };
  return status ? (labels[status] ?? status) : '—';
}

function transactionTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    DAILY_LOGIN: 'Connexion quotidienne',
    CARD_GAME_REWARD: 'Gain au jeu de cartes',
    PROFILE_WEEK_VOTE: 'Participation au profil de la semaine',
    AD_REWARD: 'Récompense publicitaire',
    PURCHASE_COINS: 'Achat de pièces',
    PREMIUM_PURCHASE: 'Achat Premium',
    OFFERING_PURCHASE: 'Achat d’une offrande',
    MAGIE_PURCHASE: 'Achat d’une magie',
    REFUND: 'Remboursement',
    ADMIN_ADJUST: 'Ajustement administrateur',
    BONUS: 'Bonus',
    SPEND: 'Dépense',
  };
  return type ? (labels[type] ?? type.replaceAll('_', ' ').toLowerCase()) : '—';
}

function ticketKindLabel(kind?: string | null) {
  const labels: Record<string, string> = {
    BUG: 'Bug',
    SUPPORT: 'Assistance',
  };
  return kind ? (labels[kind] ?? kind) : '—';
}

function ticketStatusLabel(status?: string | null) {
  const labels: Record<string, string> = {
    OPEN: 'Ouvert',
    REVIEWING: 'En cours',
    CLOSED: 'Clos',
  };
  return status ? (labels[status] ?? status) : '—';
}

function loginReasonLabel(reason?: string | null) {
  const labels: Record<string, string> = {
    INVALID_CREDENTIALS: 'Identifiants incorrects',
    BANNED: 'Compte suspendu',
  };
  return reason ? (labels[reason] ?? reason.replaceAll('_', ' ').toLowerCase()) : 'Raison inconnue';
}

function incidentSourceLabel(source?: string | null) {
  const labels: Record<string, string> = {
    backend: 'Serveur',
    push: 'Notifications',
    job: 'Tâche automatique',
  };
  return source ? (labels[source] ?? source) : 'Technique';
}

function reportReasonLabel(reason?: string | null) {
  const labels: Record<string, string> = {
    HARASSMENT: 'Harcèlement',
    HATE_SPEECH: 'Propos haineux',
    INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
    SEXUAL_CONTENT: 'Contenu sexuel',
    VIOLENCE: 'Violence',
    SPAM: 'Spam',
    FAKE_PROFILE: 'Faux profil',
    IMPERSONATION: 'Usurpation d’identité',
    SCAM: 'Arnaque',
    UNDERAGE: 'Utilisateur mineur',
    OTHER: 'Autre motif',
  };
  return reason ? (labels[reason] ?? reason.replaceAll('_', ' ').toLowerCase()) : '—';
}

function catalogCategoryLabel(category?: string | null) {
  const labels: Record<string, string> = {
    BOISSON: 'Boisson',
    NOURRITURE: 'Nourriture',
    CADEAU: 'Cadeau',
    ROMANTIQUE: 'Romantique',
    ACCESSOIRE: 'Accessoire',
    OTHER: 'Autre',
  };
  return category ? (labels[category] ?? category.replaceAll('_', ' ').toLowerCase()) : '—';
}

function magieTypeLabel(type?: string | null) {
  const labels: Record<string, string> = {
    TRANSFORMATION: 'Transformation',
    SPELL: 'Sort',
    ANTISPELL: 'Anti-sort',
    BOOST: 'Bonus',
    EFFECT: 'Effet',
  };
  return type ? (labels[type] ?? type.replaceAll('_', ' ').toLowerCase()) : '—';
}

function salonKindLabel(kind?: string | null) {
  const labels: Record<string, string> = {
    PISCINE: 'Piscine',
    CAFE_DE_PARIS: 'Café de Paris',
    ILE_PIRATES: 'Île des pirates',
    THEATRE: 'Théâtre',
    BAR_COCKTAILS: 'Bar à cocktails',
    METAL: 'Métal',
    PSY: 'Cabinet du psy',
  };
  return kind ? (labels[kind] ?? kind) : '—';
}

function DataLine({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <View style={styles.dataLine}>
      <Text style={styles.dataLabel}>{label}</Text>
      <Text style={styles.dataValue}>{String(value ?? '—')}</Text>
    </View>
  );
}

export default function AdminScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentUser = useStore((s) => s.currentUser);

  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportTotal, setReportTotal] = useState(0);
  const [reportFilter, setReportFilter] = useState<ReportFilter>('ALL');
  const [salons, setSalons] = useState<AdminSalon[]>([]);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [health, setHealth] = useState<HealthVersion | null>(null);
  const [moderationOverview, setModerationOverview] = useState<ModerationOverview | null>(null);
  const [moderationPhotos, setModerationPhotos] = useState<ModerationPhoto[]>([]);
  const [moderationMessages, setModerationMessages] = useState<ModerationSalonMessage[]>([]);
  const [moderationProfile, setModerationProfile] = useState<ModerationProfile | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [operationsOverview, setOperationsOverview] = useState<OperationsOverview | null>(null);
  const [loginEvents, setLoginEvents] = useState<LoginEvent[]>([]);
  const [systemIncidents, setSystemIncidents] = useState<SystemIncident[]>([]);
  const [supportTickets, setSupportTickets] = useState<AdminSupportTicket[]>([]);
  const [economyOverview, setEconomyOverview] = useState<EconomyOverview | null>(null);
  const [economyTransactions, setEconomyTransactions] = useState<EconomyTransaction[]>([]);
  const [economyCatalog, setEconomyCatalog] = useState<EconomyCatalog | null>(null);
  const [premiumUsers, setPremiumUsers] = useState<PremiumAdminUser[]>([]);
  const [privateSalons, setPrivateSalons] = useState<AdminPrivateSalon[]>([]);
  const [adminMessageSubject, setAdminMessageSubject] = useState('');
  const [adminMessageBody, setAdminMessageBody] = useState('');
  const [privateSalonName, setPrivateSalonName] = useState('Sanctuaire privé');
  const [communityJournalPosts, setCommunityJournalPosts] = useState<CommunityJournalAdminPost[]>([]);
  const [communityJournalTitle, setCommunityJournalTitle] = useState('');
  const [communityJournalBody, setCommunityJournalBody] = useState('');

  const [query, setQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUserDetail | null>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [coinAmount, setCoinAmount] = useState('');
  const [coinReason, setCoinReason] = useState('');

  const [selectedSalon, setSelectedSalon] = useState<AdminSalonSession | null>(null);
  const [selectedSalonLoading, setSelectedSalonLoading] = useState(false);

  const loadAll = useCallback(async () => {
    const [o, u, r, s, a, h, mo, mp, mm, oo, le, si, st, eo, et, ec, pu, ps, cj] = await Promise.all([
      getAdminOverview(),
      listAdminUsers(),
      listAdminReports(),
      listAdminSalons(),
      listAuditLog(),
      getHealthVersion().catch(() => ({})),
      getModerationOverview(),
      listModerationPhotos(),
      listModerationSalonMessages(),
      getOperationsOverview(),
      listLoginEvents(),
      listSystemIncidents(),
      listAdminSupportTickets(),
      getEconomyOverview(),
      listEconomyTransactions(),
      getEconomyCatalog(),
      listPremiumAdminUsers(),
      listAdminPrivateSalons(),
      listCommunityJournalPosts(),
    ]);
    setOverview(o);
    setUsers(u);
    setReports(r.items);
    setReportTotal(r.total);
    setSalons(s);
    setAudit(a);
    setHealth(h);
    setModerationOverview(mo);
    setModerationPhotos(mp);
    setModerationMessages(mm);
    setOperationsOverview(oo);
    setLoginEvents(le.items);
    setSystemIncidents(si.items);
    setSupportTickets(st);
    setEconomyOverview(eo);
    setEconomyTransactions(et.items);
    setEconomyCatalog(ec);
    setPremiumUsers(pu);
    setPrivateSalons(ps);
    setCommunityJournalPosts(cj);
  }, []);

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(setAuthToken).catch(() => undefined);
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
    try {
      await loadAll();
      if (selectedUser) {
        setSelectedUser(await getAdminUser(selectedUser.id));
      }
      if (selectedSalon?.salon.id) {
        setSelectedSalon(await getAdminSalonSession(selectedSalon.salon.id));
      }
    } finally {
      setRefreshing(false);
    }
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

  const filteredReports = useMemo(
    () => reportFilter === 'ALL' ? reports : reports.filter((r) => r.status === reportFilter),
    [reportFilter, reports],
  );

  const recentAudit = useMemo(() => {
    const seen = new Set<string>();
    return audit.filter((entry) => {
      const minute = entry.createdAt ? entry.createdAt.slice(0, 16) : '';
      const key = `${entry.action}|${entry.target ?? ''}|${minute}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [audit]);



  const confirm = (title: string, message: string): Promise<boolean> => {
    if (Platform.OS === 'web') {
      return Promise.resolve(typeof window !== 'undefined' && window.confirm(message));
    }
    return new Promise((resolve) => {
      Alert.alert(title, message, [
        { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
        { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
      ]);
    });
  };

  const openUser = async (id: string) => {
    setSelectedUserLoading(true);
    try {
      setSelectedUser(await getAdminUser(id));
      setModerationProfile(await getModerationProfile(id).catch(() => null));
      setWarningMessage('');
      setCoinAmount('');
      setCoinReason('');
    } catch (err) {
      Alert.alert('Utilisateur', err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setSelectedUserLoading(false);
    }
  };

  const syncUserList = (updated: AdminUser) => {
    setUsers((prev) => prev.map((u) => u.id === updated.id ? { ...u, ...updated } : u));
  };

  const toggleBan = async (user: AdminUser | AdminUserDetail) => {
    if (user.role === 'ADMIN') return;
    const ok = await confirm(
      user.isBanned ? 'Réactiver le compte' : 'Suspendre le compte',
      user.isBanned ? `Réactiver ${user.profile?.pseudo ?? user.email} ?` : `Suspendre ${user.profile?.pseudo ?? user.email} ?`,
    );
    if (!ok) return;
    try {
      const updated = user.isBanned
        ? await unbanAdminUser(user.id)
        : await banAdminUser(user.id, 'Suspension depuis le panneau administrateur');
      syncUserList(updated);
      setSelectedUser(await getAdminUser(user.id));
      setOverview(await getAdminOverview());
    } catch (err) {
      Alert.alert('Administration', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const sendWarning = async () => {
    if (!selectedUser || warningMessage.trim().length < 3) return;
    try {
      await warnAdminUser(selectedUser.id, warningMessage.trim());
      setWarningMessage('');
      setSelectedUser(await getAdminUser(selectedUser.id));
      Alert.alert('Administration', 'Avertissement enregistré dans le journal administrateur.');
    } catch (err) {
      Alert.alert('Administration', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const adjustCoins = async (direction: 1 | -1) => {
    if (!selectedUser) return;
    const amount = Number(coinAmount);
    if (!Number.isInteger(amount) || amount <= 0 || coinReason.trim().length < 3) {
      Alert.alert('Pièces', 'Indique un montant positif et un motif.');
      return;
    }
    try {
      await adjustAdminUserCoins(selectedUser.id, amount * direction, coinReason.trim());
      setCoinAmount('');
      setCoinReason('');
      setSelectedUser(await getAdminUser(selectedUser.id));
      setAudit(await listAuditLog());
    } catch (err) {
      Alert.alert('Pièces', err instanceof Error ? err.message : 'Modification impossible.');
    }
  };

  const changeRole = async (role: 'USER' | 'MODERATOR') => {
    if (!selectedUser || selectedUser.role === 'ADMIN') return;
    try {
      const updated = await updateAdminUserRole(selectedUser.id, role);
      syncUserList(updated);
      setSelectedUser(await getAdminUser(selectedUser.id));
    } catch (err) {
      Alert.alert('Rôle', err instanceof Error ? err.message : 'Modification impossible.');
    }
  };

  const changeReport = async (report: AdminReport, status: AdminReport['status']) => {
    try {
      const updated = await updateAdminReport(
        report.id,
        status,
        status === 'DISMISSED' ? 'Signalement classé sans suite' : undefined,
      );
      setReports((prev) => prev.map((r) => r.id === report.id ? updated : r));
      setOverview(await getAdminOverview());
    } catch (err) {
      Alert.alert('Signalement', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const toggleSalon = async (salon: AdminSalon, value: boolean) => {
    try {
      const updated = await setAdminSalonActive(salon.id, value);
      setSalons((prev) => prev.map((s) => s.id === salon.id ? updated : s));
      setOverview(await getAdminOverview());
    } catch (err) {
      Alert.alert('Salon', err instanceof Error ? err.message : 'Modification impossible.');
    }
  };

  const openSalon = async (salon: AdminSalon) => {
    setSelectedSalonLoading(true);
    try {
      setSelectedSalon(await getAdminSalonSession(salon.id));
    } catch (err) {
      Alert.alert('Salon', err instanceof Error ? err.message : 'Chargement impossible.');
    } finally {
      setSelectedSalonLoading(false);
    }
  };

  const removeParticipant = async (participantId: string) => {
    if (!selectedSalon) return;
    const ok = await confirm('Retirer du salon', 'Retirer ce participant de la session active ?');
    if (!ok) return;
    try {
      await removeAdminSalonParticipant(selectedSalon.salon.id, participantId);
      setSelectedSalon(await getAdminSalonSession(selectedSalon.salon.id));
      setAudit(await listAuditLog());
    } catch (err) {
      Alert.alert('Salon', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const refreshModeration = async () => {
    const [mo, mp, mm] = await Promise.all([
      getModerationOverview(),
      listModerationPhotos(),
      listModerationSalonMessages(),
    ]);
    setModerationOverview(mo);
    setModerationPhotos(mp);
    setModerationMessages(mm);
    setAudit(await listAuditLog());
  };

  const applyPhotoModeration = async (photo: ModerationPhoto, status: 'ACTIVE' | 'HIDDEN' | 'REMOVED') => {
    const reason =
      status === 'ACTIVE'
        ? 'Contenu vérifié et restauré par l’administration'
        : status === 'HIDDEN'
          ? 'Contenu masqué après contrôle administrateur'
          : 'Contenu retiré après contrôle administrateur';
    try {
      await moderatePhoto(photo.id, status, reason);
      await refreshModeration();
    } catch (err) {
      Alert.alert('Modération photo', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const applyProfileModeration = async (
    action: 'HIDE_FROM_DISCOVERY' | 'RESTORE_DISCOVERY' | 'CLEAR_BIO',
  ) => {
    if (!moderationProfile) return;
    const reason =
      action === 'CLEAR_BIO'
        ? 'Bio retirée après contrôle administrateur'
        : action === 'HIDE_FROM_DISCOVERY'
          ? 'Profil retiré temporairement de la découverte'
          : 'Profil rétabli dans la découverte après contrôle';
    try {
      setModerationProfile(await moderateProfile(moderationProfile.id, action, reason));
      setAudit(await listAuditLog());
    } catch (err) {
      Alert.alert('Modération profil', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const applyMessageModeration = async (message: ModerationSalonMessage, hidden: boolean) => {
    const reason = hidden
      ? 'Message masqué après contrôle administrateur'
      : 'Message restauré après contrôle administrateur';
    try {
      await moderateSalonMessage(message.id, hidden, reason);
      await refreshModeration();
    } catch (err) {
      Alert.alert('Modération message', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const sendMessageToSelectedUser = async () => {
    if (!selectedUser || adminMessageBody.trim().length < 2) return;
    try {
      await sendAdminDirectMessage(
        selectedUser.id,
        adminMessageBody.trim(),
        adminMessageSubject.trim() || undefined,
      );
      setAdminMessageSubject('');
      setAdminMessageBody('');
      setAudit(await listAuditLog());
      Alert.alert('Administration', 'Message envoyé à l’utilisateur.');
    } catch (err) {
      Alert.alert('Message', err instanceof Error ? err.message : 'Envoi impossible.');
    }
  };

  const createPrivateSalon = async () => {
    try {
      await createAdminPrivateSalon({
        name: privateSalonName.trim() || 'Sanctuaire privé',
        salonKind: 'CAFE_DE_PARIS',
        durationDays: 7,
      });
      setPrivateSalons(await listAdminPrivateSalons());
      setAudit(await listAuditLog());
      Alert.alert('Salon privé', 'Le Sanctuaire privé a été créé.');
    } catch (err) {
      Alert.alert('Salon privé', err instanceof Error ? err.message : 'Création impossible.');
    }
  };

  const inviteSelectedUser = async (sessionId: string) => {
    if (!selectedUser) return;
    try {
      await inviteUserToPrivateSalon(sessionId, selectedUser.id);
      setPrivateSalons(await listAdminPrivateSalons());
      setAudit(await listAuditLog());
      Alert.alert('Salon privé', 'Invitation envoyée.');
    } catch (err) {
      Alert.alert('Salon privé', err instanceof Error ? err.message : 'Invitation impossible.');
    }
  };

  const refreshEconomy = async () => {
    const [eo, et, ec, pu] = await Promise.all([
      getEconomyOverview(),
      listEconomyTransactions(),
      getEconomyCatalog(),
      listPremiumAdminUsers(),
    ]);
    setEconomyOverview(eo);
    setEconomyTransactions(et.items);
    setEconomyCatalog(ec);
    setPremiumUsers(pu);
    setAudit(await listAuditLog());
  };

  const refreshOperations = async () => {
    const [oo, le, si, st] = await Promise.all([
      getOperationsOverview(),
      listLoginEvents(),
      listSystemIncidents(),
      listAdminSupportTickets(),
    ]);
    setOperationsOverview(oo);
    setLoginEvents(le.items);
    setSystemIncidents(si.items);
    setSupportTickets(st);
    setAudit(await listAuditLog());
  };

  const resolveIncident = async (incident: SystemIncident) => {
    try {
      await updateSystemIncident(incident.id, !incident.resolved, incident.resolved ? undefined : 'Vérifié depuis le panneau admin');
      await refreshOperations();
    } catch (err) {
      Alert.alert('Incident', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const changeTicketStatus = async (ticket: AdminSupportTicket, status: 'OPEN' | 'REVIEWING' | 'CLOSED') => {
    try {
      await updateAdminSupportTicket(ticket.id, status);
      await refreshOperations();
    } catch (err) {
      Alert.alert('Support', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const grantPremiumToSelectedUser = async (days: number) => {
    if (!selectedUser) return;
    try {
      await grantAdminPremium(
        selectedUser.id,
        days,
        days === 1 ? 'Journée Premium offerte par l’administration' : 'Mois Premium offert par l’administration',
      );
      setSelectedUser(await getAdminUser(selectedUser.id));
      setPremiumUsers(await listPremiumAdminUsers());
      setOverview(await getAdminOverview());
      setAudit(await listAuditLog());
      Alert.alert('Premium', days === 1 ? '1 journée de Premium offerte.' : '1 mois de Premium offert.');
    } catch (err) {
      Alert.alert('Premium', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const resetSelectedUserSalons = async () => {
    if (!selectedUser) return;
    const ok = await confirm(
      'Réinitialiser les salons',
      'Retirer cet utilisateur de toutes ses sessions de salons actives ?',
    );
    if (!ok) return;
    try {
      const result = await resetAdminUserSalons(
        selectedUser.id,
        'Réinitialisation manuelle depuis le panneau administrateur',
      );
      setSelectedUser(await getAdminUser(selectedUser.id));
      setAudit(await listAuditLog());
      Alert.alert('Salons', `${result.resetCount} session(s) réinitialisée(s).`);
    } catch (err) {
      Alert.alert('Salons', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const resetSelectedUserRefuge = async () => {
    if (!selectedUser) return;
    const ok = await confirm(
      'Réinitialiser le Refuge',
      'Clôturer le Refuge en cours de cet utilisateur pour lui permettre de recommencer ?',
    );
    if (!ok) return;
    try {
      const result = await resetAdminUserRefuge(
        selectedUser.id,
        'Réinitialisation manuelle depuis le panneau administrateur',
      );
      setSelectedUser(await getAdminUser(selectedUser.id));
      setAudit(await listAuditLog());
      Alert.alert('Refuge', `${result.resetCount} session(s) réinitialisée(s).`);
    } catch (err) {
      Alert.alert('Refuge', err instanceof Error ? err.message : 'Action impossible.');
    }
  };

  const publishCommunityJournal = async () => {
    if (communityJournalTitle.trim().length < 3 || communityJournalBody.trim().length < 3) {
      Alert.alert('Journal communautaire', 'Ajoute un titre et un texte.');
      return;
    }
    try {
      await publishCommunityJournalPost(
        communityJournalTitle.trim(),
        communityJournalBody.trim(),
      );
      setCommunityJournalTitle('');
      setCommunityJournalBody('');
      setCommunityJournalPosts(await listCommunityJournalPosts());
      setAudit(await listAuditLog());
      Alert.alert('Journal communautaire', 'Publication ajoutée à l’édition du jour.');
    } catch (err) {
      Alert.alert('Journal communautaire', err instanceof Error ? err.message : 'Publication impossible.');
    }
  };

  const resolveTargetLabel = (target: string | null) => {
    if (!target) return '—';
    const user = users.find((u) => u.id === target);
    if (user) return user.pseudo || user.email;
    const salon = salons.find((s) => s.id === target);
    if (salon) return salon.name;
    return target;
  };

  if (currentUser?.role !== 'ADMIN') return null;

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
        <View style={styles.adminBadge}><Text style={styles.adminBadgeText}>ADMINISTRATEUR</Text></View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
      >
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setTab(t.key)}
            style={[styles.tab, tab === t.key && styles.tabActive]}
          >
            <Ionicons name={t.icon} size={16} color={tab === t.key ? '#FFF' : '#7D6348'} />
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
          {tab === 'dashboard' && overview && (
            <>
              <Text style={styles.sectionTitle}>Vue générale</Text>
              <View style={styles.statsGrid}>
                <Metric value={overview.users.total} label="Utilisateurs" />
                <Metric value={overview.users.activeToday} label="Actifs aujourd’hui" />
                <Metric value={`+${overview.users.registrations7d}`} label="Inscrits sur 7 jours" />
                <Metric value={overview.users.premiumActive} label="Premium actifs" />
                <Metric value={overview.moderation.openReports} label="À modérer" />
                <Metric value={overview.users.banned} label="Suspendus" />
                <Metric value={`${overview.salons.active}/${overview.salons.total}`} label="Salons actifs" />
                <Metric value={overview.salons.activeSessions} label="Sessions salons" />
              </View>

              <SectionCard title="Alertes administrateur">
                {moderationOverview?.openReports ? (
                  <Text style={styles.alertText}>{moderationOverview.openReports} signalement(s) attendent une décision.</Text>
                ) : (
                  <Text style={styles.goodText}>Aucun signalement en attente.</Text>
                )}
                {!!moderationOverview?.photos.hidden && (
                  <Text style={styles.alertText}>{moderationOverview.photos.hidden} photo(s) sont actuellement masquées.</Text>
                )}
                {!!moderationOverview?.photos.removed && (
                  <Text style={styles.alertText}>{moderationOverview.photos.removed} photo(s) ont été retirées par la modération.</Text>
                )}
                {!!operationsOverview?.incidents.unresolved && (
                  <Text style={styles.alertText}>{operationsOverview.incidents.unresolved} incident(s) technique(s) non résolu(s).</Text>
                )}
                {!!operationsOverview?.support.bugsOpen && (
                  <Text style={styles.alertText}>{operationsOverview.support.bugsOpen} ticket(s) BUG attendent un traitement.</Text>
                )}
                {!!operationsOverview?.logins.failedLastHour && operationsOverview.logins.failedLastHour >= 3 && (
                  <Text style={styles.alertText}>{operationsOverview.logins.failedLastHour} échec(s) de connexion durant la dernière heure.</Text>
                )}
                {!moderationOverview?.openReports && !operationsOverview?.incidents.unresolved && !operationsOverview?.support.bugsOpen && (
                  <Text style={styles.goodText}>Aucune alerte prioritaire supplémentaire.</Text>
                )}
              </SectionCard>

              <Text style={styles.subSectionTitle}>Activité du jour</Text>
              <View style={styles.statsGrid}>
                <Metric value={overview.activity.matchesToday} label="Nouveaux matchs" />
                <Metric value={overview.activity.lettersToday} label="Lettres envoyées" />
                <Metric value={overview.activity.bottlesActive} label="Bouteilles actives" />
                <Metric value={overview.activity.refugesActive} label="Refuges actifs" />
              </View>

              <SectionCard title="Croissance">
                <DataLine label="Inscriptions aujourd’hui" value={overview.users.registrationsToday} />
                <DataLine label="Inscriptions sur 7 jours" value={overview.users.registrations7d} />
                <DataLine label="Inscriptions sur 30 jours" value={overview.users.registrations30d} />
                <DataLine label="Moyenne par jour · 7 jours" value={overview.analytics.registrations.averagePerDay7d} />
                <DataLine label="Moyenne par jour · 30 jours" value={overview.analytics.registrations.averagePerDay30d} />
                <DataLine
                  label="Évolution vs semaine précédente"
                  value={overview.analytics.registrations.weeklyChangePct === null ? '—' : `${overview.analytics.registrations.weeklyChangePct > 0 ? '+' : ''}${overview.analytics.registrations.weeklyChangePct} %`}
                />
                <DataLine label="Actifs sur 7 jours" value={overview.users.active7d} />
                <DataLine label="Actifs sur 30 jours" value={overview.users.active30d} />
              </SectionCard>

              <SectionCard title="Répartition des utilisateurs">
                <DataLine label="Âge moyen" value={overview.analytics.demographics.averageAge === null ? '—' : `${overview.analytics.demographics.averageAge} ans`} />
                <DataLine label="Âge moyen · hommes" value={overview.analytics.demographics.averageAgeMen === null ? '—' : `${overview.analytics.demographics.averageAgeMen} ans`} />
                <DataLine label="Âge moyen · femmes" value={overview.analytics.demographics.averageAgeWomen === null ? '—' : `${overview.analytics.demographics.averageAgeWomen} ans`} />
                <DataLine label="Hommes" value={`${overview.analytics.demographics.men} · ${overview.analytics.demographics.menPct} %`} />
                <DataLine label="Femmes" value={`${overview.analytics.demographics.women} · ${overview.analytics.demographics.womenPct} %`} />
                <DataLine label="Autres" value={`${overview.analytics.demographics.other} · ${overview.analytics.demographics.otherPct} %`} />
                <DataLine label="Actifs sur 7 jours · hommes" value={overview.analytics.demographics.active7dMen} />
                <DataLine label="Actifs sur 7 jours · femmes" value={overview.analytics.demographics.active7dWomen} />
                <DataLine label="Premium actifs · hommes" value={overview.analytics.demographics.premiumMen} />
                <DataLine label="Premium actifs · femmes" value={overview.analytics.demographics.premiumWomen} />
              </SectionCard>

              <SectionCard title="Tranches d’âge">
                <DataLine label="18–24 ans" value={overview.analytics.demographics.ageBands.age18to24} />
                <DataLine label="25–34 ans" value={overview.analytics.demographics.ageBands.age25to34} />
                <DataLine label="35–44 ans" value={overview.analytics.demographics.ageBands.age35to44} />
                <DataLine label="45–54 ans" value={overview.analytics.demographics.ageBands.age45to54} />
                <DataLine label="55 ans et +" value={overview.analytics.demographics.ageBands.age55plus} />
              </SectionCard>

              <SectionCard title="Parcours utilisateur">
                <Text style={styles.details}>Utilisateurs uniques depuis le lancement.</Text>
                <DataLine label="Comptes inscrits" value={overview.analytics.funnel.registered} />
                <DataLine label="Utilisateurs avec un profil" value={`${overview.analytics.funnel.profileCreated} · ${overview.analytics.funnel.profileRatePct} %`} />
                <DataLine label="Utilisateurs ayant envoyé un sourire" value={`${overview.analytics.funnel.sentSmile} · ${overview.analytics.funnel.smileRatePct} %`} />
                <DataLine label="Utilisateurs ayant obtenu un match" value={`${overview.analytics.funnel.matched} · ${overview.analytics.funnel.matchRatePct} %`} />
                <DataLine label="Utilisateurs ayant envoyé une lettre" value={`${overview.analytics.funnel.sentLetter} · ${overview.analytics.funnel.letterRatePct} %`} />
                <DataLine label="Utilisateurs ayant atteint 10 lettres" value={`${overview.analytics.funnel.reachedTenLetters} · ${overview.analytics.funnel.tenLettersRatePct} %`} />
                <DataLine label="Utilisateurs Premium actifs" value={`${overview.analytics.funnel.premiumActive} · ${overview.analytics.funnel.premiumRatePct} %`} />
              </SectionCard>

              <SectionCard title="Utilisation sur 7 jours">
                <DataLine label="Entrées dans les salons" value={overview.analytics.features7d.salonJoins} />
                <DataLine label="Refuges commencés" value={overview.analytics.features7d.refugesStarted} />
                <DataLine label="Bouteilles envoyées" value={overview.analytics.features7d.bottlesSent} />
                <DataLine label="Parties de cartes commencées" value={overview.analytics.features7d.cardGamesStarted} />
                <DataLine label="Duels créés" value={overview.analytics.features7d.duelsCreated} />
              </SectionCard>

              <SectionCard title="Dernières actions administrateur">
                {audit.length === 0 && <Text style={styles.mutedLeft}>Aucune action enregistrée.</Text>}
                {recentAudit.slice(0, 8).map((a) => (
                  <View key={a.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{auditLabel(a.action)}</Text>
                    <Text style={styles.rowSub}>{resolveTargetLabel(a.target)} · {formatDate(a.createdAt)}</Text>
                  </View>
                ))}
              </SectionCard>
            </>
          )}

          {tab === 'users' && (
            <>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Utilisateurs</Text>
                {selectedUser && (
                  <TouchableOpacity style={styles.smallButton} onPress={() => setSelectedUser(null)}>
                    <Text style={styles.smallButtonText}>Liste</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!selectedUser && (
                <>
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Pseudo, e-mail ou identifiant"
                    placeholderTextColor="#A48C72"
                    style={styles.search}
                  />
                  {selectedUserLoading && <ActivityIndicator />}
                  {filteredUsers.map((u) => (
                    <TouchableOpacity key={u.id} style={styles.card} onPress={() => void openUser(u.id)}>
                      <View style={styles.userHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{u.pseudo || 'Sans pseudo'}</Text>
                          <Text style={styles.rowSub}>{u.email}</Text>
                        </View>
                        <View style={[styles.rolePill, u.role === 'ADMIN' && styles.rolePillAdmin, u.role === 'MODERATOR' && styles.rolePillModerator]}>
                          <Text style={styles.roleText}>{roleLabel(u.role)}</Text>
                        </View>
                      </View>
                      <Text style={[styles.status, u.isBanned && styles.statusBad]}>
                        {u.isBanned ? 'Suspendu' : 'Actif'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {selectedUser && (
                <>
                  <SectionCard title={selectedUser.profile?.pseudo ?? 'Compte utilisateur'}>
                    <DataLine label="E-mail" value={selectedUser.email} />
                    <DataLine label="Créé le" value={formatDate(selectedUser.createdAt)} />
                    <DataLine label="Dernière connexion" value={formatDate(selectedUser.lastLoginAt)} />
                    <DataLine label="Ville" value={selectedUser.profile?.city ?? '—'} />
                    <DataLine label="Premium" value={selectedUser.premiumTier === 'PREMIUM' ? `Oui · jusqu’au ${formatDate(selectedUser.premiumUntil)}` : 'Non'} />
                    <DataLine label="État" value={selectedUser.isBanned ? 'Suspendu' : 'Actif'} />
                    {selectedUser.isBanned && (
                      <DataLine label="Motif de suspension" value={selectedUser.banReason || 'Non renseigné'} />
                    )}

                    <View style={styles.actionsLeft}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => router.push(`/profile/${selectedUser.id}?adminPreview=1` as any)}
                      >
                        <Text style={styles.secondaryText}>Voir le profil</Text>
                      </TouchableOpacity>

                      {selectedUser.role !== 'ADMIN' && (
                        <TouchableOpacity
                          style={[styles.actionButton, selectedUser.isBanned && styles.actionButtonGood]}
                          onPress={() => void toggleBan(selectedUser)}
                        >
                          <Text style={styles.actionButtonText}>
                            {selectedUser.isBanned ? 'Réactiver le compte' : 'Suspendre le compte'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </SectionCard>

                  <Text style={styles.subSectionTitle}>Activité</Text>
                  <View style={styles.statsGrid}>
                    <Metric value={selectedUser.stats.matches} label="Matchs" />
                    <Metric value={selectedUser.stats.lettersSent} label="Lettres envoyées" />
                    <Metric value={selectedUser.stats.lettersReceived} label="Lettres reçues" />
                    <Metric value={selectedUser.stats.reportsReceived} label="Signalements reçus" />
                    <Metric value={selectedUser.stats.salonParticipations} label="Participations salons" />
                    <Metric value={selectedUser.stats.bottlesSent} label="Bouteilles envoyées" />
                  </View>

                  <SectionCard title="Message de l’administration">
                    <Text style={styles.details}>
                      Message séparé des Lettres, clairement identifié comme venant de l’administration JeuTaime.
                    </Text>
                    <TextInput
                      value={adminMessageSubject}
                      onChangeText={setAdminMessageSubject}
                      placeholder="Sujet (facultatif)"
                      placeholderTextColor="#A48C72"
                      style={styles.search}
                    />
                    <TextInput
                      value={adminMessageBody}
                      onChangeText={setAdminMessageBody}
                      placeholder="Message"
                      placeholderTextColor="#A48C72"
                      multiline
                      style={[styles.search, styles.multiline]}
                    />
                    <TouchableOpacity style={styles.actionButton} onPress={() => void sendMessageToSelectedUser()}>
                      <Text style={styles.actionButtonText}>Envoyer</Text>
                    </TouchableOpacity>
                  </SectionCard>

                  <SectionCard title="Pièces et Premium">
                    <DataLine label="Solde" value={`${selectedUser.wallet?.coins ?? 0} pièces`} />

                    <TextInput
                      value={coinAmount}
                      onChangeText={setCoinAmount}
                      keyboardType="number-pad"
                      placeholder="Nombre de pièces"
                      placeholderTextColor="#A48C72"
                      style={styles.search}
                    />
                    <TextInput
                      value={coinReason}
                      onChangeText={setCoinReason}
                      placeholder="Motif"
                      placeholderTextColor="#A48C72"
                      style={styles.search}
                    />
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity style={[styles.actionButton, styles.actionButtonGood]} onPress={() => void adjustCoins(1)}>
                        <Text style={styles.actionButtonText}>Offrir les pièces</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dangerButton} onPress={() => void adjustCoins(-1)}>
                        <Text style={styles.actionButtonText}>Retirer des pièces</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={[styles.actionsLeft, { marginTop: 12 }]}>
                      <TouchableOpacity style={[styles.secondaryButton, styles.compactAction]} onPress={() => void grantPremiumToSelectedUser(1)}>
                        <Text style={styles.secondaryText}>Offrir 1 jour Premium</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={[styles.secondaryButton, styles.compactAction]} onPress={() => void grantPremiumToSelectedUser(30)}>
                        <Text style={styles.secondaryText}>Offrir 1 mois Premium</Text>
                      </TouchableOpacity>
                    </View>
                  </SectionCard>

                  <SectionCard title="Salon privé">
                    {privateSalons.filter((s) => s.status === 'ACTIVE').length === 0 ? (
                      <Text style={styles.mutedLeft}>Aucun salon privé actif.</Text>
                    ) : (
                      privateSalons.filter((s) => s.status === 'ACTIVE').map((s) => {
                        const invitation = s.invitations?.find((i) => i.userId === selectedUser.id);
                        return (
                          <View key={s.id} style={styles.row}>
                            <Text style={styles.rowTitle}>{s.privateName || 'Sanctuaire privé'}</Text>
                            {invitation ? (
                              <Text style={styles.rowSub}>
                                {invitation.accepted ? 'Cet utilisateur est déjà présent.' : 'Invitation déjà envoyée.'}
                              </Text>
                            ) : (
                              <TouchableOpacity
                                style={[styles.secondaryButton, { alignSelf: 'flex-start', marginTop: 8 }]}
                                onPress={() => void inviteSelectedUser(s.id)}
                              >
                                <Text style={styles.secondaryText}>Inviter</Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })
                    )}
                  </SectionCard>

                  {selectedUser.recentTransactions.length > 0 && (
                    <SectionCard title="Dernières transactions">
                      {selectedUser.recentTransactions.slice(0, 10).map((t) => (
                        <View key={t.id} style={styles.row}>
                          <View style={styles.rowSplit}>
                            <Text style={styles.rowTitle}>{transactionTypeLabel(t.type)}</Text>
                            <Text style={[styles.amount, t.amount < 0 && styles.amountNegative]}>
                              {t.amount > 0 ? '+' : ''}{t.amount}
                            </Text>
                          </View>
                          <Text style={styles.rowSub}>Solde {t.balance} · {formatDate(t.createdAt)}</Text>
                        </View>
                      ))}
                    </SectionCard>
                  )}

                  {selectedUser.adminHistory.length > 0 && (
                    <SectionCard title="Historique administratif">
                      {selectedUser.adminHistory.map((a) => (
                        <View key={a.id} style={styles.row}>
                          <Text style={styles.rowTitle}>{auditLabel(a.action)}</Text>
                          <Text style={styles.rowSub}>{formatDate(a.createdAt)}</Text>
                        </View>
                      ))}
                    </SectionCard>
                  )}
                </>
              )}
            </>
          )}

          {tab === 'content' && (
            <>
              <Text style={styles.sectionTitle}>Contenus</Text>

              <SectionCard title="Journal communautaire">
                <Text style={styles.details}>Publier une information dans l’édition commune visible par tous les utilisateurs.</Text>
                <TextInput
                  value={communityJournalTitle}
                  onChangeText={setCommunityJournalTitle}
                  placeholder="Titre"
                  placeholderTextColor="#A48C72"
                  style={styles.search}
                />
                <TextInput
                  value={communityJournalBody}
                  onChangeText={setCommunityJournalBody}
                  placeholder="Texte de l’article"
                  placeholderTextColor="#A48C72"
                  multiline
                  style={[styles.search, styles.multiline]}
                />
                <TouchableOpacity style={styles.actionButton} onPress={() => void publishCommunityJournal()}>
                  <Text style={styles.actionButtonText}>Publier dans le Journal</Text>
                </TouchableOpacity>
                {communityJournalPosts.slice(0, 5).map((post) => (
                  <View key={post.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{post.title}</Text>
                    <Text style={styles.rowSub}>{formatDate(post.publishedAt)}</Text>
                  </View>
                ))}
              </SectionCard>

              <Text style={styles.subSectionTitle}>Modération des contenus</Text>

              {moderationOverview && (
                <View style={styles.statsGrid}>
                  <Metric value={moderationOverview.photos.active} label="Photos publiées" />
                  <Metric value={moderationOverview.photos.hidden} label="Photos masquées" />
                  <Metric value={moderationOverview.photos.removed} label="Photos retirées" />
                  <Metric value={moderationOverview.salonMessages.hidden} label="Messages masqués" />
                </View>
              )}


              <Text style={styles.subSectionTitle}>Photos récentes</Text>
              {moderationPhotos.length === 0 && <Text style={styles.muted}>Aucune photo.</Text>}
              {moderationPhotos.map((photo) => {
                const uri = API_URL + photo.adminPreviewUrl.replace(/^\/api/, '');
                return (
                  <View key={photo.id} style={styles.card}>
                    <View style={styles.userHead}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cardTitle}>{photo.pseudo || 'Sans pseudo'}</Text>
                        <Text style={styles.rowSub}>{photo.email}</Text>
                      </View>
                      <Text style={[
                        styles.status,
                        photo.moderationStatus !== 'ACTIVE' && styles.statusBad,
                      ]}>
                        {moderationStatusLabel(photo.moderationStatus)}
                      </Text>
                    </View>

                    {authToken && (
                      <Image
                        source={{ uri, headers: { Authorization: `Bearer ${authToken}` } }}
                        style={styles.moderationPhoto}
                        contentFit="contain"
                        cachePolicy="none"
                      />
                    )}

                    <Text style={styles.rowSub}>Publiée le {formatDate(photo.createdAt)}</Text>
                    {!!photo.moderationReason && (
                      <Text style={styles.details}>Motif : {photo.moderationReason}</Text>
                    )}

                    <View style={styles.actionsLeft}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={() => {
                          setTab('users');
                          void openUser(photo.userId);
                        }}
                      >
                        <Text style={styles.secondaryText}>Voir le compte</Text>
                      </TouchableOpacity>

                      {photo.moderationStatus !== 'ACTIVE' && (
                        <TouchableOpacity
                          style={styles.actionButtonGood}
                          onPress={() => void applyPhotoModeration(photo, 'ACTIVE')}
                        >
                          <Text style={styles.actionButtonText}>Restaurer</Text>
                        </TouchableOpacity>
                      )}

                      {photo.moderationStatus === 'ACTIVE' && (
                        <TouchableOpacity
                          style={styles.actionButton}
                          onPress={() => void applyPhotoModeration(photo, 'HIDDEN')}
                        >
                          <Text style={styles.actionButtonText}>Masquer</Text>
                        </TouchableOpacity>
                      )}

                      {photo.moderationStatus !== 'REMOVED' && (
                        <TouchableOpacity
                          style={styles.dangerButton}
                          onPress={() => void applyPhotoModeration(photo, 'REMOVED')}
                        >
                          <Text style={styles.actionButtonText}>Retirer</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {moderationProfile && (
                <>
                  <Text style={styles.subSectionTitle}>Profil à contrôler</Text>
                  <SectionCard title={moderationProfile.pseudo || moderationProfile.email}>
                    <DataLine label="E-mail" value={moderationProfile.email} />
                    <DataLine label="Découverte" value={moderationProfile.showInDiscovery ? 'Visible' : 'Masqué'} />
                    <Text style={styles.details}>
                      Bio : {moderationProfile.bio || 'Aucune bio'}
                    </Text>
                    <View style={styles.actionsLeft}>
                      {moderationProfile.showInDiscovery ? (
                        <TouchableOpacity style={styles.actionButton} onPress={() => void applyProfileModeration('HIDE_FROM_DISCOVERY')}>
                          <Text style={styles.actionButtonText}>Retirer de la découverte</Text>
                        </TouchableOpacity>
                      ) : (
                        <TouchableOpacity style={styles.actionButtonGood} onPress={() => void applyProfileModeration('RESTORE_DISCOVERY')}>
                          <Text style={styles.actionButtonText}>Rétablir la découverte</Text>
                        </TouchableOpacity>
                      )}
                      {!!moderationProfile.bio && (
                        <TouchableOpacity style={styles.dangerButton} onPress={() => void applyProfileModeration('CLEAR_BIO')}>
                          <Text style={styles.actionButtonText}>Supprimer la bio</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </SectionCard>
                </>
              )}

              <Text style={styles.subSectionTitle}>Messages de salons récents</Text>
              {moderationMessages.slice(0, 30).map((message) => (
                <View key={message.id} style={styles.card}>
                  <View style={styles.userHead}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{message.salonName}</Text>
                      <Text style={styles.rowSub}>{message.pseudo || message.email} · {formatDate(message.createdAt)}</Text>
                    </View>
                    <Text style={[styles.status, message.isHidden && styles.statusBad]}>
                      {message.isHidden ? 'MASQUÉ' : 'VISIBLE'}
                    </Text>
                  </View>
                  <Text style={styles.details}>{message.content}</Text>
                  {!!message.hiddenReason && <Text style={styles.rowSub}>Motif : {message.hiddenReason}</Text>}
                  <View style={styles.actionsLeft}>
                    <TouchableOpacity
                      style={styles.secondaryButton}
                      onPress={() => {
                        setTab('users');
                        void openUser(message.userId);
                      }}
                    >
                      <Text style={styles.secondaryText}>Voir le compte</Text>
                    </TouchableOpacity>
                    {message.isHidden ? (
                      <TouchableOpacity style={styles.actionButtonGood} onPress={() => void applyMessageModeration(message, false)}>
                        <Text style={styles.actionButtonText}>Restaurer</Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity style={styles.dangerButton} onPress={() => void applyMessageModeration(message, true)}>
                        <Text style={styles.actionButtonText}>Masquer le message</Text>
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
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterRow}>
                {(['ALL', 'OPEN', 'REVIEWING', 'ACTIONED', 'DISMISSED'] as ReportFilter[]).map((status) => (
                  <TouchableOpacity
                    key={status}
                    onPress={() => setReportFilter(status)}
                    style={[styles.filterChip, reportFilter === status && styles.filterChipActive]}
                  >
                    <Text style={[styles.filterText, reportFilter === status && styles.filterTextActive]}>
                      {status === 'ALL' ? 'Tous' : reportStatusLabel(status)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {filteredReports.length === 0 && <Text style={styles.muted}>Aucun signalement.</Text>}
              {filteredReports.map((r) => (
                <View key={r.id} style={styles.card}>
                  <View style={styles.userHead}>
                    <Text style={styles.cardTitle}>{reportReasonLabel(r.reason)}</Text>
                    <Text style={styles.status}>{reportStatusLabel(r.status)}</Text>
                  </View>
                  <Text style={styles.rowSub}>Signalé : {r.target.email}</Text>
                  <Text style={styles.rowSub}>Par : {r.reporter.email}</Text>
                  {!!r.details && <Text style={styles.details}>{r.details}</Text>}
                  <Text style={styles.rowSub}>{formatDate(r.createdAt)}</Text>
                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => { setTab('users'); void openUser(r.target.id); }}>
                      <Text style={styles.secondaryText}>Voir le compte</Text>
                    </TouchableOpacity>
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
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Salons</Text>
                {selectedSalon && (
                  <TouchableOpacity style={styles.smallButton} onPress={() => setSelectedSalon(null)}>
                    <Text style={styles.smallButtonText}>Liste</Text>
                  </TouchableOpacity>
                )}
              </View>

              {!selectedSalon && (
                <>
                  {selectedSalonLoading && <ActivityIndicator />}
                  {salons.map((s) => (
                    <View key={s.id} style={[styles.card, styles.salonRow]}>
                      <TouchableOpacity style={{ flex: 1 }} onPress={() => void openSalon(s)}>
                        <Text style={styles.cardTitle}>{s.name}</Text>
                        <Text style={styles.rowSub}>{salonKindLabel(s.kind)} · ordre {s.order}</Text>
                        <Text style={styles.linkText}>Voir la session et les participants</Text>
                      </TouchableOpacity>
                      <Switch value={s.isActive} onValueChange={(v) => void toggleSalon(s, v)} />
                    </View>
                  ))}
                </>
              )}

              {!selectedSalon && (
                <SectionCard title="Sanctuaire privé">
                  <Text style={styles.details}>
                    Salon invisible de la liste publique. Seuls les utilisateurs invités peuvent y entrer.
                  </Text>
                  <TextInput
                    value={privateSalonName}
                    onChangeText={setPrivateSalonName}
                    placeholder="Nom du salon privé"
                    placeholderTextColor="#A48C72"
                    style={styles.search}
                  />
                  <TouchableOpacity style={styles.actionButton} onPress={() => void createPrivateSalon()}>
                    <Text style={styles.actionButtonText}>Créer un salon privé</Text>
                  </TouchableOpacity>
                  {privateSalons.map((s) => (
                    <View key={s.id} style={styles.row}>
                      <Text style={styles.rowTitle}>{s.privateName || 'Salon privé'}</Text>
                      <Text style={styles.rowSub}>État : {privateSalonStatusLabel(s.status)} · expire le {formatDate(s.expiresAt)}</Text>
                      <Text style={styles.rowSub}>{s.acceptedCount}/{s.invitedCount} invitation(s) acceptée(s)</Text>
                      {s.participants.map((p) => (
                        <View key={p.userId} style={styles.rowSplit}>
                          <Text style={styles.rowSub}>{p.pseudo || p.email}</Text>
                          <TouchableOpacity
                            style={styles.secondaryButton}
                            onPress={async () => {
                              try {
                                await removeUserFromPrivateSalon(s.id, p.userId);
                                setPrivateSalons(await listAdminPrivateSalons());
                              } catch (err) {
                                Alert.alert('Salon privé', err instanceof Error ? err.message : 'Retrait impossible.');
                              }
                            }}
                          >
                            <Text style={styles.secondaryText}>Retirer</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  ))}
                </SectionCard>
              )}

              {selectedSalon && (
                <>
                  <SectionCard title={selectedSalon.salon.name}>
                    <DataLine label="Type" value={salonKindLabel(selectedSalon.salon.kind)} />
                    <DataLine label="Session active" value={selectedSalon.session ? 'Oui' : 'Non'} />
                    {selectedSalon.session && (
                      <>
                        <DataLine label="Début" value={formatDate(selectedSalon.session.startedAt)} />
                        <DataLine label="Fin prévue" value={formatDate(selectedSalon.session.expiresAt)} />
                        <DataLine label="Participants" value={selectedSalon.session.participants.filter((p) => p.status === 'ACTIVE').length} />
                      </>
                    )}
                  </SectionCard>
                  <Text style={styles.subSectionTitle}>Participants</Text>
                  {!selectedSalon.session && <Text style={styles.muted}>Aucune session active.</Text>}
                  {selectedSalon.session?.participants.map((p) => (
                    <View key={p.id} style={styles.card}>
                      <View style={styles.userHead}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.cardTitle}>{p.pseudo ?? p.email}</Text>
                          <Text style={styles.rowSub}>{p.email}</Text>
                        </View>
                        <Text style={[styles.status, p.status !== 'ACTIVE' && styles.statusBad]}>{participantStatusLabel(p.status)}</Text>
                      </View>
                      <DataLine label="Arrivé le" value={formatDate(p.joinedAt)} />
                      <DataLine label="Dernière connexion" value={formatDate(p.lastLoginAt)} />
                      {p.status === 'ACTIVE' && (
                        <View style={styles.actions}>
                          <TouchableOpacity style={styles.dangerButton} onPress={() => void removeParticipant(p.id)}>
                            <Text style={styles.actionButtonText}>Retirer de la session</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          {tab === 'economy' && (
            <>
              <Text style={styles.sectionTitle}>Économie & Boutique</Text>

              <SectionCard title="Opérations sur un utilisateur">
                {selectedUser ? (
                  <>
                    <Text style={styles.cardTitle}>{selectedUser.profile?.pseudo || selectedUser.email}</Text>
                    <DataLine label="Solde actuel" value={`${selectedUser.wallet?.coins ?? 0} pièces`} />
                    <TextInput
                      value={coinAmount}
                      onChangeText={setCoinAmount}
                      keyboardType="number-pad"
                      placeholder="Nombre de pièces"
                      placeholderTextColor="#A48C72"
                      style={styles.search}
                    />
                    <TextInput
                      value={coinReason}
                      onChangeText={setCoinReason}
                      placeholder="Motif (ex. geste commercial)"
                      placeholderTextColor="#A48C72"
                      style={styles.search}
                    />
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity style={styles.actionButtonGood} onPress={() => void adjustCoins(1)}>
                        <Text style={styles.actionButtonText}>Offrir les pièces</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.dangerButton} onPress={() => void adjustCoins(-1)}>
                        <Text style={styles.actionButtonText}>Retirer des pièces</Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={[styles.cardTitle, { marginTop: 12 }]}>Premium</Text>
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity style={styles.actionButtonGood} onPress={() => void grantPremiumToSelectedUser(1)}>
                        <Text style={styles.actionButtonText}>Offrir 1 journée</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonGood} onPress={() => void grantPremiumToSelectedUser(30)}>
                        <Text style={styles.actionButtonText}>Offrir 1 mois</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={styles.details}>Choisis d’abord un utilisateur depuis l’onglet Utilisateurs.</Text>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab('users')}>
                      <Text style={styles.secondaryText}>Choisir un utilisateur</Text>
                    </TouchableOpacity>
                  </>
                )}
              </SectionCard>
              {economyOverview && (
                <>
                  <View style={styles.statsGrid}>
                    <Metric value={economyOverview.wallets.totalCoins} label="Pièces en circulation" />
                    <Metric value={economyOverview.wallets.averageCoins} label="Solde moyen" />
                    <Metric value={economyOverview.today.transactions} label="Transactions aujourd’hui" />
                    <Metric value={economyOverview.premiumActive} label="Premium actifs" />
                    <Metric value={economyOverview.today.coinPurchases} label="Achats de pièces" />
                    <Metric value={economyOverview.today.premiumPurchases} label="Achats Premium" />
                    <Metric value={economyOverview.today.offeringsSent} label="Offrandes envoyées" />
                    <Metric value={economyOverview.today.magiesCast} label="Magies lancées" />
                  </View>

                  <SectionCard title="Flux du jour">
                    <DataLine label="Pièces gagnées" value={economyOverview.today.earnedCoins} />
                    <DataLine label="Pièces dépensées" value={economyOverview.today.spentCoins} />
                    <DataLine label="Remboursements" value={economyOverview.today.refunds} />
                    <DataLine label="Transactions sur 7 jours" value={economyOverview.transactions7d} />
                    <DataLine label="Solde maximum" value={economyOverview.wallets.maxCoins} />
                  </SectionCard>
                </>
              )}

              <Text style={styles.subSectionTitle}>Transactions récentes</Text>
              {economyTransactions.slice(0, 50).map((tx) => (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.card}
                  onPress={() => {
                    setTab('users');
                    void openUser(tx.userId);
                  }}
                >
                  <View style={styles.rowSplit}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle}>{tx.pseudo || tx.email}</Text>
                      <Text style={styles.rowSub}>{transactionTypeLabel(tx.type)} · {formatDate(tx.createdAt)}</Text>
                    </View>
                    <Text style={[styles.amount, tx.amount < 0 && styles.amountNegative]}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount}
                    </Text>
                  </View>
                  <Text style={styles.rowSub}>Solde après transaction : {tx.balance}</Text>
                </TouchableOpacity>
              ))}

              <Text style={styles.subSectionTitle}>Catalogue des offrandes</Text>
              {economyCatalog?.offerings.map((item) => (
                <View key={item.id} style={[styles.card, styles.salonRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.rowSub}>{item.cost} pièces · {catalogCategoryLabel(item.category)} · {item.sentCount} envoi(s)</Text>
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={async () => {
                          await updateOfferingCatalogItem(item.id, { cost: Math.max(0, item.cost - 10) });
                          await refreshEconomy();
                        }}
                      >
                        <Text style={styles.secondaryText}>-10</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={async () => {
                          await updateOfferingCatalogItem(item.id, { cost: item.cost + 10 });
                          await refreshEconomy();
                        }}
                      >
                        <Text style={styles.secondaryText}>+10</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Switch
                    value={item.enabled}
                    onValueChange={async (v) => {
                      await updateOfferingCatalogItem(item.id, { enabled: v });
                      await refreshEconomy();
                    }}
                  />
                </View>
              ))}

              <Text style={styles.subSectionTitle}>Catalogue des magies</Text>
              {economyCatalog?.magies.map((item) => (
                <View key={item.id} style={[styles.card, styles.salonRow]}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <Text style={styles.rowSub}>{item.cost} pièces · {magieTypeLabel(item.type)} · {item.castCount} utilisation(s)</Text>
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={async () => {
                          await updateMagieCatalogItem(item.id, { cost: Math.max(0, item.cost - 10) });
                          await refreshEconomy();
                        }}
                      >
                        <Text style={styles.secondaryText}>-10</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={async () => {
                          await updateMagieCatalogItem(item.id, { cost: item.cost + 10 });
                          await refreshEconomy();
                        }}
                      >
                        <Text style={styles.secondaryText}>+10</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                  <Switch
                    value={item.enabled}
                    onValueChange={async (v) => {
                      await updateMagieCatalogItem(item.id, { enabled: v });
                      await refreshEconomy();
                    }}
                  />
                </View>
              ))}

              <Text style={styles.subSectionTitle}>Abonnements Premium</Text>
              {premiumUsers.map((u) => (
                <TouchableOpacity key={u.id} style={styles.card} onPress={() => { setTab('users'); void openUser(u.id); }}>
                  <Text style={styles.cardTitle}>{u.pseudo || u.email}</Text>
                  <Text style={[styles.status, !u.active && styles.statusBad]}>{u.active ? 'ACTIF' : 'EXPIRÉ'}</Text>
                  <Text style={styles.rowSub}>Jusqu’au {formatDate(u.premiumUntil)} · {u.coins} pièces</Text>
                </TouchableOpacity>
              ))}
            </>
          )}

          {tab === 'operations' && (
            <>
              <Text style={styles.sectionTitle}>Incidents & Support</Text>
              {operationsOverview && (
                <View style={styles.statsGrid}>
                  <Metric value={operationsOverview.logins.failedToday} label="Échecs connexion aujourd’hui" />
                  <Metric value={operationsOverview.logins.successfulToday} label="Connexions réussies" />
                  <Metric value={operationsOverview.incidents.unresolved} label="Incidents non résolus" />
                  <Metric value={operationsOverview.support.bugsOpen} label="Bugs ouverts" />
                </View>
              )}

              <Text style={styles.subSectionTitle}>Incidents techniques</Text>
              {systemIncidents.length === 0 && <Text style={styles.muted}>Aucun incident enregistré.</Text>}
              {systemIncidents.map((incident) => (
                <View key={incident.id} style={styles.card}>
                  <View style={styles.rowSplit}>
                    <Text style={styles.cardTitle}>{incidentSourceLabel(incident.source)} · {incident.code ? incident.code.replaceAll('_', ' ').toLowerCase() : 'Erreur'}</Text>
                    <Text style={[styles.status, !incident.resolved && styles.statusBad]}>
                      {incident.resolved ? 'RÉSOLU' : 'OUVERT'}
                    </Text>
                  </View>
                  <Text style={styles.details}>{incident.message}</Text>
                  <Text style={styles.rowSub}>{incident.method || ''} {incident.path || ''} · {formatDate(incident.createdAt)}</Text>
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => void resolveIncident(incident)}>
                    <Text style={styles.secondaryText}>{incident.resolved ? 'Rouvrir' : 'Marquer résolu'}</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <Text style={styles.subSectionTitle}>Problèmes de connexion</Text>
              {loginEvents.filter((e) => !e.success).slice(0, 50).map((event) => (
                <View key={event.id} style={styles.card}>
                  <Text style={styles.cardTitle}>{event.email}</Text>
                  <Text style={styles.rowSub}>Échec : {loginReasonLabel(event.reason)} · {formatDate(event.createdAt)}</Text>
                  {!!event.userId && (
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => { setTab('users'); void openUser(event.userId!); }}>
                      <Text style={styles.secondaryText}>Voir le compte</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              <Text style={styles.subSectionTitle}>Tickets BUG / Support</Text>
              {supportTickets.map((ticket) => (
                <View key={ticket.id} style={styles.card}>
                  <View style={styles.rowSplit}>
                    <Text style={styles.cardTitle}>{ticketKindLabel(ticket.kind)} · {ticket.subject}</Text>
                    <Text style={[styles.status, ticket.status === 'OPEN' && styles.statusBad]}>{ticketStatusLabel(ticket.status)}</Text>
                  </View>
                  <Text style={styles.rowSub}>{ticket.pseudo || ticket.email} · {formatDate(ticket.createdAt)}</Text>
                  <Text style={styles.details}>{ticket.message}</Text>
                  <View style={styles.actionsLeft}>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => void changeTicketStatus(ticket, 'REVIEWING')}>
                      <Text style={styles.secondaryText}>Prendre en charge</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionButtonGood} onPress={() => void changeTicketStatus(ticket, 'CLOSED')}>
                      <Text style={styles.actionButtonText}>Clore</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.secondaryButton} onPress={() => { setTab('users'); void openUser(ticket.userId); }}>
                      <Text style={styles.secondaryText}>Voir le compte</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {tab === 'tools' && (
            <>
              <Text style={styles.sectionTitle}>Outils & Support</Text>

              <SectionCard title="Réparations techniques d’un compte">
                <Text style={styles.details}>Ces actions servent uniquement à débloquer un état technique anormal. Elles ne sont pas des actions normales de gestion du profil.</Text>
                {selectedUser ? (
                  <>
                    <Text style={styles.cardTitle}>Compte ciblé : {selectedUser.profile?.pseudo || selectedUser.email}</Text>
                    <View style={styles.actionsLeft}>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => void resetSelectedUserSalons()}>
                        <Text style={styles.secondaryText}>Réinitialiser ses salons</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.secondaryButton} onPress={() => void resetSelectedUserRefuge()}>
                        <Text style={styles.secondaryText}>Réinitialiser son Refuge</Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  <TouchableOpacity style={styles.secondaryButton} onPress={() => setTab('users')}>
                    <Text style={styles.secondaryText}>Choisir un utilisateur</Text>
                  </TouchableOpacity>
                )}
              </SectionCard>

              <SectionCard title="État technique">
                <DataLine label="API" value={health?.service ?? 'jeutaime-api'} />
                <DataLine label="Environnement" value={health?.environment ?? '—'} />
                <DataLine label="Build" value={health?.buildSha ? health.buildSha.slice(0, 10) : '—'} />
                <DataLine label="Backend" value={health?.error ? 'À vérifier' : 'En ligne'} />
              </SectionCard>

              <SectionCard title="Règles de confidentialité admin">
                <Text style={styles.details}>Les lettres et conversations privées ne sont pas exposées ici. La modération passe par les signalements et les informations nécessaires au traitement.</Text>
                <Text style={styles.details}>Les modifications de rôle, suspensions et ajustements de pièces sont journalisés.</Text>
              </SectionCard>

              <SectionCard title="Journal d’administration">
                {audit.length === 0 && <Text style={styles.mutedLeft}>Aucune action enregistrée.</Text>}
                {audit.map((a) => (
                  <View key={a.id} style={styles.row}>
                    <Text style={styles.rowTitle}>{auditLabel(a.action)}</Text>
                    <Text style={styles.rowSub}>Cible : {resolveTargetLabel(a.target)}</Text>
                    <Text style={styles.rowSub}>{formatDate(a.createdAt)}</Text>
                  </View>
                ))}
              </SectionCard>
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#F7F0E5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E5D6C1',
    backgroundColor: '#FFFDF8',
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5E9D8',
    marginRight: 10,
  },
  title: { fontSize: 22, fontWeight: '800', color: '#3A2818' },
  subtitle: { fontSize: 12, color: '#8F765C', marginTop: 2 },
  adminBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, backgroundColor: '#A7324B' },
  adminBadgeText: { color: '#FFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  tabsScroll: { flexGrow: 0, maxHeight: 58, backgroundColor: '#F7F0E5' },
  tabs: { paddingHorizontal: 12, paddingVertical: 8, gap: 8, alignItems: 'center' },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 11,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#FFFDF8',
    borderWidth: 1,
    borderColor: '#E5D6C1',
  },
  tabActive: { backgroundColor: '#8B6F47', borderColor: '#8B6F47' },
  tabText: { color: '#6E563F', fontWeight: '700', fontSize: 12 },
  tabTextActive: { color: '#FFF' },
  content: { padding: 16, paddingBottom: 60 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  sectionTitle: { fontSize: 21, fontWeight: '800', color: '#3A2818', marginBottom: 12 },
  subSectionTitle: { fontSize: 16, fontWeight: '800', color: '#4D3726', marginBottom: 10, marginTop: 4 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  stat: {
    width: '47%',
    flexGrow: 1,
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5D6C1',
    padding: 14,
  },
  statValue: { fontSize: 25, fontWeight: '900', color: '#A7324B' },
  statLabel: { fontSize: 12, color: '#8F765C', marginTop: 4 },
  card: {
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5D6C1',
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#3A2818', marginBottom: 4 },
  row: { paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9DED0' },
  rowSplit: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  rowTitle: { fontSize: 13, fontWeight: '700', color: '#4D3726' },
  rowSub: { fontSize: 11, color: '#927960', marginTop: 3 },
  search: {
    backgroundColor: '#FFFDF8',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#DCCCB7',
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: '#3A2818',
    marginBottom: 10,
  },
  multiline: { minHeight: 76, textAlignVertical: 'top' },
  userHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#EFE4D4' },
  rolePillAdmin: { backgroundColor: '#F1D7DE' },
  rolePillModerator: { backgroundColor: '#DCE8EF' },
  roleText: { fontSize: 10, fontWeight: '900', color: '#6A4F38' },
  status: { fontSize: 12, fontWeight: '800', color: '#5A7B55', marginTop: 6 },
  statusBad: { color: '#B34343' },
  details: { fontSize: 13, lineHeight: 19, color: '#5B4634', marginTop: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionsLeft: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginVertical: 10 },
  actionButton: { backgroundColor: '#8B6F47', borderRadius: 9, paddingHorizontal: 12, paddingVertical: 9, alignSelf: 'flex-start' },
  dangerButton: {
    backgroundColor: '#A7324B',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  actionButtonGood: {
    backgroundColor: '#5F7D58',
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    alignSelf: 'flex-start',
  },
  actionButtonText: { color: '#FFF', fontSize: 12, fontWeight: '800' },
  secondaryButton: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: '#D7C4AA',
    alignSelf: 'flex-start',
    justifyContent: 'center',
  },
  compactAction: { maxWidth: '100%' },
  selectedSecondary: { backgroundColor: '#EFE4D4' },
  secondaryText: { color: '#6F5943', fontSize: 12, fontWeight: '700' },
  smallButton: { borderRadius: 9, paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1, borderColor: '#D7C4AA' },
  smallButtonText: { color: '#6F5943', fontSize: 12, fontWeight: '800' },
  salonRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  muted: { color: '#927960', textAlign: 'center', marginVertical: 20 },
  mutedLeft: { color: '#927960', marginTop: 6 },
  helper: { fontSize: 11, color: '#927960', marginTop: 8, lineHeight: 16 },
  dataLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 14, paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E9DED0' },
  dataLabel: { flex: 1, fontSize: 12, color: '#8F765C' },
  dataValue: { flex: 1, fontSize: 12, fontWeight: '700', color: '#4D3726', textAlign: 'right' },
  amount: { fontSize: 13, fontWeight: '900', color: '#5A7B55' },
  amountNegative: { color: '#B34343' },
  linkText: { fontSize: 11, fontWeight: '700', color: '#8B6F47', marginTop: 8 },
  filterScroll: { flexGrow: 0, marginBottom: 12 },
  filterRow: { gap: 8 },
  filterChip: { paddingHorizontal: 11, paddingVertical: 7, borderRadius: 16, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: '#DCCCB7' },
  filterChipActive: { backgroundColor: '#8B6F47', borderColor: '#8B6F47' },
  filterText: { fontSize: 11, fontWeight: '700', color: '#6F5943' },
  filterTextActive: { color: '#FFF' },
  moderationPhoto: { width: '100%', height: 260, borderRadius: 12, backgroundColor: '#F4EBDD', marginVertical: 12 },
  alertText: { fontSize: 13, lineHeight: 19, color: '#A7324B', marginTop: 6, fontWeight: '700' },
  goodText: { fontSize: 13, lineHeight: 19, color: '#5A7B55', marginTop: 6, fontWeight: '700' },
});

// ADMIN_UI_DEPLOY_SYNC
