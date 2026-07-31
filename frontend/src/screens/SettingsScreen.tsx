import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { getInbox } from '../api/bottles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SettingsItem {
  icon:     string;
  label:    string;
  route?:   string;
  action?:  () => void;
  badge?:   string | null;
  danger?:  boolean;
  warning?: boolean;
}

interface SettingsSection {
  key:   string;
  title: string;
  items: SettingsItem[];
}

// ─── Sous-composants ──────────────────────────────────────────────────────────

// Une seule carte par section : le titre est la rangée du haut, cliquable
// (accordéon). Les items se déploient À L'INTÉRIEUR de cette même carte au
// lieu d'être toujours affichés dans une carte séparée en dessous.
function SectionAccordion({
  section,
  expanded,
  onToggle,
  onItemPress,
}: {
  section: SettingsSection;
  expanded: boolean;
  onToggle: () => void;
  onItemPress: (item: SettingsItem) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <TouchableOpacity
        style={[styles.sectionHeaderRow, expanded && styles.sectionHeaderRowExpanded]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
        <Text style={styles.sectionChevron}>{expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {expanded && section.items.map((item, idx) => {
        const tappable = !!(item.route || item.action);
        return (
          <TouchableOpacity
            key={idx}
            style={[
              styles.item,
              idx < section.items.length - 1 && styles.itemBorder,
              !tappable && styles.itemStatic,
            ]}
            onPress={() => tappable && onItemPress(item)}
            activeOpacity={tappable ? 0.65 : 1}
          >
            <View style={[
              styles.itemIconBox,
              item.danger  && styles.itemIconDanger,
              item.warning && styles.itemIconWarning,
            ]}>
              <Text style={styles.itemIcon}>{item.icon}</Text>
            </View>

            <Text style={[
              styles.itemLabel,
              item.danger  && styles.itemLabelDanger,
              item.warning && styles.itemLabelWarning,
            ]}>
              {item.label}
            </Text>

            {item.badge != null && (
              <Text style={styles.itemBadge}>{item.badge}</Text>
            )}

            {tappable && (
              <Text style={[
                styles.itemArrow,
                item.danger  && styles.itemArrowDanger,
                item.warning && styles.itemArrowWarning,
              ]}>›</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export default function SettingsScreen() {
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { currentUser, coins, points, pet, logout } = useStore();
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const screenBg = useStore(s => s.screenBackgrounds?.['settings'] ?? '#FFF8E7');

  // Sections repliées par défaut (accordéon) : on ne montre que les 7 titres
  // tant que l'utilisateur ne déplie pas celle qui l'intéresse.
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const avatarResolution = resolveAvatarConfig(
    currentUser?.id || 'unknown',
    currentUser?.avatarConfig,
    currentUser?.gender,
    'SettingsScreen'
  );
  const profileAvatarConfig = avatarResolution.config;

  const canDiscover = currentUser?.canDiscover;
  const hasQuestions = (currentUser?.apiQuestions?.length ?? 0) > 0;

  const nav = (route: string) => router.push(route as any);

  const doLogout = () => {
    // Don't await — navigate regardless of backend revocation outcome
    logout().catch(() => {});
    router.replace('/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      // Alert.alert uses window.confirm on web, which can be blocked silently
      // Use window.confirm directly for reliable behaviour
      if (typeof window !== 'undefined' && !window.confirm('Tu veux vraiment te déconnecter ?')) return;
      doLogout();
      return;
    }
    Alert.alert(
      'Déconnexion',
      'Tu veux vraiment te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui', style: 'destructive', onPress: doLogout },
      ],
    );
  };

  const doDebugReset = () => {
    // logout() already clears the persist key — just call it
    logout().catch(() => {});
    router.replace('/login');
  };

  const handleDebugReset = () => {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && !window.confirm('Effacer toutes les données locales et retourner au login ?')) return;
      doDebugReset();
      return;
    }
    Alert.alert(
      'Réinitialiser la session',
      'Efface toutes les données locales (tokens, cache Zustand) et retourne au login.',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Réinitialiser', style: 'destructive', onPress: doDebugReset },
      ],
    );
  };

  const handleBottlePress = () => {
    router.push('/bottles-main');
  };

  // ── Config des sections ─────────────────────────────────────────────────────

  const SECTIONS: SettingsSection[] = [
    {
      key: 'profil',
      title: 'Mon profil',
      items: [
        // Onboarding shortcuts — shown when the user hasn't completed mandatory steps
        ...(canDiscover === false ? [{ icon: '⚠️', label: 'Compléter mon profil', route: '/create-profile', warning: true } as SettingsItem] : []),
        ...(isAuthenticated && !hasQuestions ? [{ icon: '❓', label: 'Mes 3 questions', route: '/setup-questions' } as SettingsItem] : []),
        { icon: '✏️', label: 'Modifier mon profil',       route: '/edit-profile' },
        { icon: '🎨', label: 'Personnaliser mon avatar',   action: () => router.push({ pathname: '/avatar-builder' } as any) },
        { icon: '📸', label: 'Mes photos',                route: '/my-photos' },
        { icon: '🎯', label: 'Préférences de rencontre',  route: '/matching-preferences' },
        { icon: '📍', label: 'Localisation',              route: '/location' },
        { icon: '✅', label: 'Vérification du profil',    route: '/profile-verification' },
      ],
    },
    {
      key: 'univers',
      title: 'Univers JeuTaime',
      items: [
        { icon: '🍾', label: 'Bouteille à la mer',         action: handleBottlePress },
        { icon: '🐾', label: 'Mon Animal',                 route: '/refuge', badge: pet?.petEmoji ?? null },
        { icon: '🏆', label: 'Profil de la semaine',       route: '/weekly-profile' },
        { icon: '📔', label: 'Journal',                    route: '/(tabs)/journal' },
        { icon: '🎁', label: 'Boîte à souvenirs',          route: '/(tabs)/letters?tab=souvenirs' },
        { icon: '✨', label: 'Offrandes et magie',         route: '/offerings' },
      ],
    },
    {
      key: 'coins',
      title: 'Pièces et abonnement',
      items: [
        { icon: '💰', label: 'Mes pièces',                    route: '/coins', badge: `${coins}` },
        { icon: '🛒', label: 'Boutique',                      route: '/shop' },
        { icon: '👑', label: 'Premium',                       route: '/premium' },
        { icon: '🎁', label: 'Récompenses quotidiennes',      route: '/daily-rewards' },
        { icon: '📊', label: 'Historique gains / dépenses',   route: '/coins-history' },
      ],
    },
    {
      key: 'notifs',
      title: 'Notifications',
      items: [
        { icon: '🔔', label: 'Notifications',      route: '/notifications' },
        { icon: '🔊', label: 'Sons et vibrations', route: '/sounds' },
      ],
    },
    {
      key: 'security',
      title: 'Sécurité et confidentialité',
      items: [
        { icon: '🔒', label: 'Confidentialité du profil',    route: '/privacy' },
        { icon: '🚫', label: 'Blocages',                     route: '/blocked-users' },
        { icon: '🚩', label: 'Signalements',                 route: '/user-reports' },
        { icon: '🔑', label: 'Mot de passe et connexion',    route: '/password' },
        { icon: '🗄️', label: 'Données personnelles',         route: '/personal-data' },
        { icon: '🚪', label: 'Se déconnecter',               action: handleLogout,    warning: true },
        { icon: '⏸️', label: 'Désactiver mon compte',        route: '/deactivate',    warning: true },
        { icon: '🗑️', label: 'Supprimer mon compte',         route: '/delete-account', danger: true },
        { icon: '🔄', label: 'Réinitialiser session locale', action: handleDebugReset, danger: true },
      ],
    },
    {
      key: 'support',
      title: 'Support',
      items: [
        { icon: '❓', label: 'Aide',                         route: '/help' },
        { icon: '💬', label: 'FAQ',                          route: '/faq' },
        { icon: '🐛', label: 'Signaler un bug',              route: '/report-bug' },
        { icon: '📩', label: 'Contacter le support',         route: '/contact-support' },
        { icon: '📜', label: 'Règles du Jeu',                route: '/game-rules' },
        { icon: '📋', label: 'Conditions d\'utilisation',    route: '/terms' },
        { icon: '🛡️', label: 'Politique de confidentialité', route: '/privacy-policy' },
      ],
    },
  ];

  const handlePress = (item: SettingsItem) => {
    if (item.action) item.action();
    else if (item.route) nav(item.route);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Carte profil ─────────────────────────────────────────────────── */}
        <TouchableOpacity style={styles.profileCard} onPress={() => nav('/edit-profile')}>
          <Avatar size={80} {...profileAvatarConfig} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || 'Joueur'}</Text>
            <Text style={styles.profileCity}>📍 {(currentUser as any)?.city || 'Paris'}</Text>
          </View>
          <Text style={styles.editIcon}>✏️</Text>
        </TouchableOpacity>

        {/* ── Stats ────────────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>💰</Text>
            <Text style={styles.statValue}>{coins}</Text>
            <Text style={styles.statLabel}>Pièces</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statEmoji}>💕</Text>
            <Text style={styles.statValue}>{currentUser?.stats?.matchesCount || 0}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
        </View>

        {/* ── Sections (accordéon) ──────────────────────────────────────────── */}
        {SECTIONS.map(section => (
          <SectionAccordion
            key={section.key}
            section={section}
            expanded={!!expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            onItemPress={handlePress}
          />
        ))}

        {/* ── À propos ─────────────────────────────────────────────────────── */}
        <View style={styles.aboutCard}>
          <Text style={styles.aboutLabel}>À PROPOS</Text>
          <Text style={styles.version}>JeuTaime v2.0.0</Text>
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container:    { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },

  // Profil
  profileCard:  { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.09, shadowRadius: 8, elevation: 4 },
  profileInfo:  { flex: 1, marginLeft: 14 },
  profileName:  { fontSize: 22, fontWeight: '800', color: '#3A2818' },
  profileCity:  { fontSize: 13, color: '#8B6F47', marginTop: 3 },
  editIcon:     { fontSize: 18, color: '#C4A77D' },

  // Stats
  statsRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox:    { flex: 1, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statEmoji:  { fontSize: 22, marginBottom: 4 },
  statValue:  { fontSize: 20, fontWeight: '800', color: '#3A2818' },
  statLabel:  { fontSize: 11, color: '#8B6F47', marginTop: 3 },

  // Sections (accordéon : une carte, titre cliquable en haut, items dedans)
  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 16 },
  sectionHeaderRowExpanded: { borderBottomWidth: 1, borderBottomColor: '#F5EFE6' },
  sectionHeaderText: { fontSize: 12, fontWeight: '700', color: '#B8956A', letterSpacing: 1.2 },
  sectionChevron: { fontSize: 16, color: '#C4A77D', fontWeight: '700' },

  item:        { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  itemBorder:  { borderBottomWidth: 1, borderBottomColor: '#F5EFE6' },
  itemStatic:  { opacity: 0.75 },

  itemIconBox:     { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FFF8E7', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  itemIconDanger:  { backgroundColor: '#FFF0F0' },
  itemIconWarning: { backgroundColor: '#FFF5E8' },

  itemIcon:    { fontSize: 19 },

  itemLabel:        { flex: 1, fontSize: 15, fontWeight: '500', color: '#3A2818' },
  itemLabelDanger:  { color: '#C0392B', fontWeight: '600' },
  itemLabelWarning: { color: '#D35400', fontWeight: '600' },

  itemBadge: { fontSize: 14, color: '#8B6F47', fontWeight: '600', marginRight: 6 },

  itemArrow:        { fontSize: 22, color: '#C4A77D', fontWeight: '300' },
  itemArrowDanger:  { color: '#E57373' },
  itemArrowWarning: { color: '#F0A060' },

  // À propos
  aboutCard:  { marginTop: 20, alignItems: 'center', paddingVertical: 12 },
  aboutLabel: { fontSize: 10, letterSpacing: 1.5, color: '#C4A77D', fontWeight: '700', marginBottom: 4 },
  version:    { fontSize: 13, color: '#B8A082' },
});