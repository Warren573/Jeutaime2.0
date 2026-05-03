import React from 'react';
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
import { titles } from '../data/gameData';
import { Avatar } from '../avatar/png/Avatar';

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

function SectionHeader({ title }: { title: string }) {
  return (
    <View style={styles.sectionHeaderWrap}>
      <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
    </View>
  );
}

function SectionCard({
  items,
  onPress,
}: {
  items:   SettingsItem[];
  onPress: (item: SettingsItem) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      {items.map((item, idx) => {
        const tappable = !!(item.route || item.action);
        return (
          <TouchableOpacity
            key={idx}
            style={[
              styles.item,
              idx < items.length - 1 && styles.itemBorder,
              !tappable && styles.itemStatic,
            ]}
            onPress={() => tappable && onPress(item)}
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
  const { currentUser, coins, points, getCurrentTitle, pet, avatarPngConfig, logout } = useStore();
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const screenBg = useStore(s => s.screenBackgrounds?.['settings'] ?? '#FFF8E7');
  const title = getCurrentTitle();

  const canDiscover = currentUser?.canDiscover;
  const hasQuestions = (currentUser?.apiQuestions?.length ?? 0) > 0;

  // Progression vers prochain titre
  const currentTitleData = titles.find(t => t.level === title.level);
  const nextTitle        = titles.find(t => t.level === title.level + 1);
  const progress = nextTitle
    ? Math.min(100, ((points - (currentTitleData?.minPoints ?? 0)) /
        ((nextTitle.minPoints - (currentTitleData?.minPoints ?? 0)) || 1)) * 100)
    : 100;

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
        { icon: '📸', label: 'Mes photos',                route: '/my-photos' },
        { icon: '🎯', label: 'Préférences de rencontre',  route: '/matching-preferences' },
        { icon: '📍', label: 'Localisation',              route: '/location' },
        { icon: '✅', label: 'Vérification du profil',    route: '/profile-verification' },
      ],
    },
    {
      key: 'perso',
      title: 'Personnalisation',
      items: [
        { icon: '🎨', label: 'Personnaliser mon avatar',   action: () => router.push({ pathname: '/avatar-builder' } as any) },
        { icon: '🖼️', label: 'Arrière-plans des écrans',  route: '/background-picker' },
        { icon: '🏷️', label: 'Mon titre',                  route: '/my-title' },
        { icon: '🌟', label: 'Mes badges',                 route: '/badges' },
        { icon: '🐾', label: 'Mon Animal',                 route: '/pet', badge: pet?.petEmoji ?? null },
      ],
    },
    {
      key: 'univers',
      title: 'Univers JeuTaime',
      items: [
        { icon: '🎮', label: 'Activités',                  route: '/games' },
        { icon: '🍾', label: 'Bouteille à la mer',         route: '/bottle' },
        { icon: '🏆', label: 'Profil de la semaine',       route: '/weekly-profile' },
        { icon: '📔', label: 'Journal',                    route: '/(tabs)/journal' },
        { icon: '🎁', label: 'Boîte à souvenirs',          route: '/souvenirs' },
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
          <Avatar size={80} {...avatarPngConfig} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || 'Joueur'}</Text>
            <Text style={styles.profileCity}>📍 {(currentUser as any)?.city || 'Paris'}</Text>
            <View style={styles.titleBadge}>
              <Text style={styles.titleEmoji}>{title.emoji}</Text>
              <Text style={styles.titleName}>{title.title}</Text>
              <Text style={styles.titleLevel}>Niv. {title.level}</Text>
            </View>
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

        {/* ── Progression titre ─────────────────────────────────────────────── */}
        {nextTitle && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Prochain titre</Text>
              <Text style={styles.progressNext}>{nextTitle.emoji} {nextTitle.name ?? nextTitle.title}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` as any }]} />
            </View>
            <Text style={styles.progressText}>{points} / {nextTitle.minPoints} pts</Text>
          </View>
        )}

        {/* ── Sections ─────────────────────────────────────────────────────── */}
        {SECTIONS.map(section => (
          <View key={section.key}>
            <SectionHeader title={section.title} />
            <SectionCard items={section.items} onPress={handlePress} />
          </View>
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
  titleBadge:   { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE082', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8, alignSelf: 'flex-start' },
  titleEmoji:   { fontSize: 16, marginRight: 4 },
  titleName:    { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  titleLevel:   { fontSize: 12, color: '#8B6F47', marginLeft: 6 },
  editIcon:     { fontSize: 18, color: '#C4A77D' },

  // Stats
  statsRow:   { flexDirection: 'row', gap: 10, marginBottom: 12 },
  statBox:    { flex: 1, backgroundColor: '#FFF', borderRadius: 16, paddingVertical: 14, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  statEmoji:  { fontSize: 22, marginBottom: 4 },
  statValue:  { fontSize: 20, fontWeight: '800', color: '#3A2818' },
  statLabel:  { fontSize: 11, color: '#8B6F47', marginTop: 3 },

  // Progression
  progressCard:   { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  progressLabel:  { fontSize: 13, color: '#8B6F47' },
  progressNext:   { fontSize: 15, fontWeight: '700', color: '#DAA520' },
  progressBarBg:  { height: 10, backgroundColor: '#E8D5B7', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 5 },
  progressText:   { fontSize: 12, color: '#B8A082', marginTop: 6, textAlign: 'right' },

  // Sections
  sectionHeaderWrap: { paddingHorizontal: 4, paddingTop: 18, paddingBottom: 6 },
  sectionHeaderText: { fontSize: 11, fontWeight: '700', color: '#B8956A', letterSpacing: 1.2 },

  sectionCard: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 4, elevation: 2 },

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