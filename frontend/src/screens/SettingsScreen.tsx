import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import Avatar from '../components/Avatar';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, coins, setCurrentUser } = useStore();

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', onPress: () => setCurrentUser(null), style: 'destructive' },
      ]
    );
  };

  const menuItems = [
    { icon: '👤', label: 'Mon profil', action: () => {} },
    { icon: '🎨', label: 'Éditeur d\'avatar', action: () => {} },
    { icon: '🛒', label: 'Boutique', action: () => {} },
    { icon: '👑', label: 'Premium', action: () => {} },
    { icon: '🔔', label: 'Notifications', action: () => {} },
    { icon: '🔒', label: 'Confidentialité', action: () => {} },
    { icon: '❓', label: 'Aide', action: () => {} },
    { icon: '📜', label: 'Règles du jeu', action: () => {} },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>⚙️ Paramètres</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profil card */}
        <View style={styles.profileCard}>
          <Avatar
            name={currentUser?.name || 'Utilisateur'}
            size={80}
            online={true}
          />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || 'Utilisateur'}</Text>
            <Text style={styles.profileEmail}>{currentUser?.email || 'email@exemple.com'}</Text>
            <View style={styles.coinsRow}>
              <Text style={styles.coinsText}>💰 {coins} pièces</Text>
            </View>
          </View>
        </View>

        {/* Menu items */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.action}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutBtnText}>🚪 Déconnexion</Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.version}>JeuTaime v2.0.0 - Expo Edition</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#3A2818',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  profileName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#3A2818',
  },
  profileEmail: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
  },
  coinsRow: {
    marginTop: 10,
    backgroundColor: '#FFD700',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  coinsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A2818',
  },
  menuSection: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0E6D3',
  },
  menuIcon: {
    fontSize: 22,
    marginRight: 14,
  },
  menuLabel: {
    flex: 1,
    fontSize: 16,
    color: '#3A2818',
  },
  menuArrow: {
    fontSize: 18,
    color: '#8B6F47',
  },
  logoutBtn: {
    backgroundColor: '#C85A54',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  logoutBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#8B6F47',
  },
});
