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
import { CoinIcon } from '../components/CoinIcon';

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

function SettingsSectionList({
  section,
  onItemPress,
}: {
  section: SettingsSection;
  onItemPress: (item: SettingsItem) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionHeaderText}>{section.title.toUpperCase()}</Text>

      {section.items.map((item, idx) => {
        const tappable = !!(item.route || item.action);
        return (
          <TouchableOpacity
            key={`${section.key}-${idx}`}
            style={[styles.item, idx < section.items.length - 1 && styles.itemBorder]}
            onPress={() => tappable && onItemPress(item)}
            activeOpacity={tappable ? 0.65 : 1}
          >
            <View style={styles.itemIconBox}>
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

            {item.badge != null && <Text style={styles.itemBadge}>{item.badge}</Text>}

            {tappable && <Text style={styles.itemArrow}>›</Text>}
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
        { icon: '🎨', label: 'Personnaliser mon avatar', route: '/avatar-builder' },
        { icon: '📸', label: 'Mes photos', route: '/my-photos' },
        { icon: '🎯', label: 'Préférences de rencontre', route: '/matching-preferences' },
        { icon: '📍', label: 'Localisation', route: '/location' },
        { icon: '✅', label: 'Vérification du profil', route: '/profile-verification' },
      ],
    },
    {
      key: 'account',
      title: 'Compte',
      items: [
        { icon: '✉️', label: 'E-mail', route: '/email' },
        { icon: '🔑', label: 'Mot de passe', route: '/password' },
        { icon: '⭐', label: 'Abonnement', route: '/premium' },
        { icon: '⏸️', label: 'Désactiver temporairement mon compte', route: '/deactivate' },
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
        { icon: '👁️', label: 'Visibilité du profil et partage de la ville', route: '/privacy' },
        { icon: '🚫', label: 'Utilisateurs bloqués', route: '/blocked-users' },
        { icon: '🗄️', label: 'Données personnelles', route: '/personal-data' },
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
        { icon: '📋', label: "Conditions d'utilisation", route: '/terms' },
        { icon: '🛡️', label: 'Politique de confidentialité', route: '/privacy-policy' },
        { icon: '⚖️', label: 'Mentions légales', route: '/legal-notice' },
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
            <Text style={styles.shopSubtitle}>Obtiens des pièces et des options Premium</Text>
          </View>

          <View style={styles.coinPill}>
            <CoinIcon size={15} style={{ marginRight: 4 }} />
            <Text style={styles.coinValue}>{coins}</Text>
          </View>

          <Text style={styles.shopArrow}>›</Text>
        </TouchableOpacity>

        {SECTIONS.map(section => (
          <SettingsSectionList
            key={section.key}
            section={section}
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
  scrollContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 44 },

  shopCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8D6BD',
    shadowColor: '#7D6040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  shopIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFF2DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  shopIcon: { fontSize: 22 },
  shopMain: { flex: 1, paddingRight: 8 },
  shopTitle: { fontSize: 16, fontWeight: '800', color: '#3A2818' },
  shopSubtitle: { fontSize: 11, color: '#9A7C5A', marginTop: 2 },
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderLeftWidth: 1,
    borderLeftColor: '#E8D6BD',
    paddingLeft: 12,
    marginRight: 8,
  },
  coinValue: { fontSize: 14, fontWeight: '800', color: '#3A2818' },
  shopArrow: { fontSize: 22, color: '#C8A878', fontWeight: '300' },

  sectionCard: {
    backgroundColor: '#FFFDF8',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#E8D6BD',
    shadowColor: '#7D6040',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  sectionHeaderText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#A7324B',
    letterSpacing: 1.8,
    paddingHorizontal: 16,
    paddingTop: 13,
    paddingBottom: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
    paddingHorizontal: 14,
  },
  itemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#EFE4D4',
  },
  itemIconBox: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  itemIcon: { fontSize: 18 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '500', color: '#3A2818' },
  itemLabelDanger: { color: '#C0392B', fontWeight: '600' },
  itemLabelWarning: { color: '#D35400', fontWeight: '600' },
  itemBadge: { fontSize: 13, color: '#8B6F47', fontWeight: '600', marginRight: 6 },
  itemArrow: { fontSize: 21, color: '#C6A271', fontWeight: '300' },

  logoutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF6F4',
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    marginTop: 2,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F0CFC8',
  },
  bottomIconBox: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  bottomIcon: { fontSize: 18 },
  logoutText: { flex: 1, fontSize: 15, fontWeight: '700', color: '#D6453A' },
  bottomArrow: { fontSize: 21, color: '#C6A271', fontWeight: '300' },

  vacationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFDF8',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: '#E8D6BD',
  },
  vacationContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10,
  },
  vacationIconBox: {
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  vacationTextBlock: { flex: 1 },
  vacationTitle: { fontSize: 15, fontWeight: '600', color: '#3A2818' },
  vacationSubtitle: { fontSize: 11, color: '#9A7C5A', marginTop: 2, lineHeight: 15 },
});
