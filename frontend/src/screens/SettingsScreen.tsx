import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { getUserSettings, updateUserSettings } from '../api/userSettings';

interface SettingsItem {
  icon: string;
  label: string;
  route?: string;
  action?: () => void;
  badge?: string | null;
  danger?: boolean;
  warning?: boolean;
}

interface SettingsSection {
  key: string;
  title: string;
  items: SettingsItem[];
}

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
        style={[
          styles.sectionHeaderRow,
          expanded && styles.sectionHeaderRowExpanded,
        ]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>
        <Text style={styles.sectionChevron}>{expanded ? '⌃' : '⌄'}</Text>
      </TouchableOpacity>

      {expanded &&
        section.items.map((item, idx) => {
          const tappable = !!(item.route || item.action);

          return (
            <TouchableOpacity
              key={`${section.key}-${idx}`}
              style={[
                styles.item,
                idx < section.items.length - 1 && styles.itemBorder,
              ]}
              onPress={() => tappable && onItemPress(item)}
              activeOpacity={tappable ? 0.65 : 1}
            >
              <View
                style={[
                  styles.itemIconBox,
                  item.danger && styles.itemIconDanger,
                  item.warning && styles.itemIconWarning,
                ]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
              </View>

              <Text
                style={[
                  styles.itemLabel,
                  item.danger && styles.itemLabelDanger,
                  item.warning && styles.itemLabelWarning,
                ]}
              >
                {item.label}
              </Text>

              {item.badge != null && (
                <Text style={styles.itemBadge}>{item.badge}</Text>
              )}

              {tappable && (
                <Text
                  style={[
                    styles.itemArrow,
                    item.danger && styles.itemArrowDanger,
                    item.warning && styles.itemArrowWarning,
                  ]}
                >
                  ›
                </Text>
              )}
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, coins, logout } = useStore();
  const isAuthenticated = useStore(s => s.isAuthenticated);
  const screenBg = useStore(
    s => s.screenBackgrounds?.['settings'] ?? '#FFF8E7'
  );

  const [expandedSections, setExpandedSections] = useState<
    Record<string, boolean>
  >({});
  const [vacationMode, setVacationMode] = useState(false);
  const [vacationSaving, setVacationSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getUserSettings()
      .then((settings) => {
        if (active) setVacationMode(settings.vacationMode);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const handleVacationChange = async (value: boolean) => {
    if (vacationSaving) return;
    const previous = vacationMode;
    setVacationMode(value);
    setVacationSaving(true);
    try {
      const updated = await updateUserSettings({ vacationMode: value });
      setVacationMode(updated.vacationMode);
    } catch (err) {
      setVacationMode(previous);
      Alert.alert(
        value ? 'Mode vacances' : 'Retour de vacances',
        err instanceof Error ? err.message : 'Modification impossible.',
      );
    } finally {
      setVacationSaving(false);
    }
  };

  const toggleSection = (key: string) =>
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const nav = (route: string) => router.push(route as any);

  const doLogout = () => {
    logout().catch(() => {});
    router.replace('/login');
  };

  const handleLogout = () => {
    if (Platform.OS === 'web') {
      if (
        typeof window !== 'undefined' &&
        !window.confirm('Tu veux vraiment te déconnecter ?')
      ) {
        return;
      }
      doLogout();
      return;
    }

    Alert.alert(
      'Déconnexion',
      'Tu veux vraiment te déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Oui', style: 'destructive', onPress: doLogout },
      ]
    );
  };

  const canDiscover = currentUser?.canDiscover;
  const hasQuestions = (currentUser?.apiQuestions?.length ?? 0) > 0;

  const SECTIONS: SettingsSection[] = [
    {
      key: 'profil',
      title: 'Mon profil',
      items: [
        ...(canDiscover === false
          ? [
              {
                icon: '⚠️',
                label: 'Compléter mon profil',
                route: '/create-profile',
                warning: true,
              } as SettingsItem,
            ]
          : []),
        ...(isAuthenticated && !hasQuestions
          ? [
              {
                icon: '❓',
                label: 'Mes 3 questions',
                route: '/setup-questions',
              } as SettingsItem,
            ]
          : []),
        { icon: '✏️', label: 'Modifier mon profil', route: '/edit-profile' },
        {
          icon: '🎨',
          label: 'Personnaliser mon avatar',
          route: '/avatar-builder',
        },
        { icon: '📸', label: 'Mes photos', route: '/my-photos' },
        {
          icon: '🎯',
          label: 'Préférences de rencontre',
          route: '/matching-preferences',
        },
        { icon: '📍', label: 'Localisation', route: '/location' },
        {
          icon: '✅',
          label: 'Vérification du profil',
          route: '/profile-verification',
        },
      ],
    },
    {
      key: 'notifs',
      title: 'Notifications',
      items: [
        { icon: '🔔', label: 'Notifications', route: '/notification-settings' },
      ],
    },
    {
      key: 'privacy',
      title: 'Confidentialité',
      items: [
        {
          icon: '🚫',
          label: 'Utilisateurs bloqués',
          route: '/blocked-users',
        },
        {
          icon: '🗄️',
          label: 'Données personnelles',
          route: '/personal-data',
        },
        { icon: '🔑', label: 'Mot de passe', route: '/password' },
        {
          icon: '🗑️',
          label: 'Supprimer mon compte',
          route: '/delete-account',
          danger: true,
        },
      ],
    },
    {
      key: 'support',
      title: 'Aide & sécurité',
      items: [
        { icon: '❓', label: 'Centre d’aide', route: '/help' },
        { icon: '🐛', label: 'Signaler un problème', route: '/report-bug' },
        { icon: '💬', label: 'Contacter le support', route: '/contact-support' },
        { icon: '📜', label: 'Règles de la communauté', route: '/game-rules' },
      ],
    },
    {
      key: 'about',
      title: 'À propos',
      items: [
        {
          icon: '📋',
          label: "Conditions d'utilisation",
          route: '/terms',
        },
        {
          icon: '🛡️',
          label: 'Politique de confidentialité',
          route: '/privacy-policy',
        },
        { icon: 'ℹ️', label: 'JeuTaime v2.0.0' },
      ],
    },
  ];

  const handlePress = (item: SettingsItem) => {
    if (item.action) item.action();
    else if (item.route) nav(item.route);
  };

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top, backgroundColor: screenBg },
      ]}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.shopCard}
          onPress={() => nav('/shop')}
          activeOpacity={0.8}
        >
          <View style={styles.shopIconBox}>
            <Text style={styles.shopIcon}>🛍️</Text>
          </View>

          <View style={styles.shopMain}>
            <Text style={styles.shopTitle}>Boutique</Text>
            <Text style={styles.shopSubtitle}>Offrandes, bonus et avantages</Text>
          </View>

          <View style={styles.coinPill}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinValue}>{coins}</Text>
          </View>

          <Text style={styles.shopArrow}>›</Text>
        </TouchableOpacity>

        {SECTIONS.map(section => (
          <SectionAccordion
            key={section.key}
            section={section}
            expanded={!!expandedSections[section.key]}
            onToggle={() => toggleSection(section.key)}
            onItemPress={handlePress}
          />
        ))}

        <TouchableOpacity
          style={styles.logoutRow}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <View style={styles.bottomIconBox}>
            <Text style={styles.bottomIcon}>↪️</Text>
          </View>
          <Text style={styles.logoutText}>Se déconnecter</Text>
          <Text style={styles.bottomArrow}>›</Text>
        </TouchableOpacity>

        <View style={styles.vacationCard}>
          <View style={styles.vacationContent}>
            <View style={styles.vacationIconBox}>
              <Text style={styles.bottomIcon}>🏖️</Text>
            </View>
            <View style={styles.vacationTextBlock}>
              <Text style={styles.vacationTitle}>Mode vacances</Text>
              <Text style={styles.vacationSubtitle}>
                Mets ton compte en pause sans perdre tes contacts
              </Text>
            </View>
          </View>

          <Switch
            value={vacationMode}
            onValueChange={(value) => void handleVacationChange(value)}
            disabled={vacationSaving}
            trackColor={{ false: '#E9DDCF', true: '#D7B98E' }}
            thumbColor={vacationMode ? '#8B6F47' : '#FFFFFF'}
            ios_backgroundColor="#E9DDCF"
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 44 },

  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.09,
    shadowRadius: 8,
    elevation: 4,
  },
  shopIconBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#FFF3D8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  shopIcon: { fontSize: 27 },
  shopMain: { flex: 1, paddingRight: 8 },
  shopTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3A2818',
  },
  shopSubtitle: {
    fontSize: 12,
    color: '#8B6F47',
    marginTop: 3,
  },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E7',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginRight: 7,
  },
  coinEmoji: { fontSize: 15, marginRight: 4 },
  coinValue: {
    fontSize: 14,
    fontWeight: '800',
    color: '#6E512E',
  },
  shopArrow: {
    fontSize: 24,
    color: '#C4A77D',
    fontWeight: '300',
  },

  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  sectionHeaderRowExpanded: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B8956A',
    letterSpacing: 1.2,
  },
  sectionChevron: {
    fontSize: 16,
    color: '#C4A77D',
    fontWeight: '700',
  },

  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F5EFE6',
  },
  itemIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemIconDanger: { backgroundColor: '#FFF0F0' },
  itemIconWarning: { backgroundColor: '#FFF5E8' },
  itemIcon: { fontSize: 19 },
  itemLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: '#3A2818',
  },
  itemLabelDanger: {
    color: '#C0392B',
    fontWeight: '600',
  },
  itemLabelWarning: {
    color: '#D35400',
    fontWeight: '600',
  },
  itemBadge: {
    fontSize: 14,
    color: '#8B6F47',
    fontWeight: '600',
    marginRight: 6,
  },
  itemArrow: {
    fontSize: 22,
    color: '#C4A77D',
    fontWeight: '300',
  },
  itemArrowDanger: { color: '#E57373' },
  itemArrowWarning: { color: '#F0A060' },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginTop: 4,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  bottomIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF5E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bottomIcon: { fontSize: 18 },
  logoutText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: '#D35400',
  },
  bottomArrow: {
    fontSize: 22,
    color: '#C4A77D',
    fontWeight: '300',
  },

  vacationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  vacationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  vacationIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF8E7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vacationTextBlock: { flex: 1 },
  vacationTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3A2818',
  },
  vacationSubtitle: {
    fontSize: 11,
    color: '#8B6F47',
    marginTop: 3,
    lineHeight: 15,
  },
});
