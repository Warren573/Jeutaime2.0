import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { titles, badges } from '../data/gameData';

const Avatar = ({ name, size = 80 }: { name: string; size?: number }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
};

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, coins, points, getCurrentTitle, pet } = useStore();
  const title = getCurrentTitle();

  // Calcul progression vers prochain titre
  const currentTitleData = titles.find(t => t.level === title.level);
  const nextTitle = titles.find(t => t.level === title.level + 1);
  const progress = nextTitle 
    ? Math.min(100, ((points - (currentTitleData?.minPoints || 0)) / ((nextTitle.minPoints - (currentTitleData?.minPoints || 0)) || 1)) * 100)
    : 100;

  const menuItems = [
    { icon: '🎮', label: 'Mini-Jeux', route: '/games' },
    { icon: '🐾', label: 'Mon Animal', route: '/pet', badge: pet ? pet.emoji : null },
    { icon: '🌟', label: 'Badges', route: '/badges' },
    { icon: '🛒', label: 'Boutique', route: null },
    { icon: '👑', label: 'Premium', route: null },
    { icon: '🔔', label: 'Notifications', route: null },
    { icon: '❓', label: 'Aide', route: null },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profil card */}
        <View style={styles.profileCard}>
          <Avatar name={currentUser?.name || 'Joueur'} size={80} />
          
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{currentUser?.name || 'Joueur'}</Text>
            
            {/* Titre et niveau */}
            <View style={styles.titleBadge}>
              <Text style={styles.titleEmoji}>{title.emoji}</Text>
              <Text style={styles.titleName}>{title.name}</Text>
              <Text style={styles.titleLevel}>Niv. {title.level}</Text>
            </View>
          </View>
        </View>

        {/* Stats rapides */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💰 {coins}</Text>
            <Text style={styles.statLabel}>Pièces</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>⭐ {points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>💕 {currentUser?.stats?.matches || 0}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
        </View>

        {/* Progression vers prochain titre */}
        {nextTitle && (
          <View style={styles.progressSection}>
            <Text style={styles.progressLabel}>Prochain titre: {nextTitle.emoji} {nextTitle.name}</Text>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${progress}%` }]} />
            </View>
            <Text style={styles.progressText}>{points} / {nextTitle.minPoints} points</Text>
          </View>
        )}

        {/* Badges débloqués */}
        <View style={styles.badgesPreview}>
          <Text style={styles.sectionTitle}>🌟 Badges ({currentUser?.unlockedBadges?.length || 0}/{badges.length})</Text>
          <View style={styles.badgesRow}>
            {badges.slice(0, 5).map(badge => {
              const unlocked = currentUser?.unlockedBadges?.includes(badge.id);
              return (
                <View key={badge.id} style={[styles.badgeItem, !unlocked && styles.badgeLocked]}>
                  <Text style={styles.badgeEmoji}>{unlocked ? badge.emoji : '🔒'}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Menu */}
        <View style={styles.menuSection}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => item.route && router.push(item.route as any)}
              disabled={!item.route}
            >
              <Text style={styles.menuIcon}>{item.icon}</Text>
              <Text style={styles.menuLabel}>{item.label}</Text>
              {item.badge && <Text style={styles.menuBadge}>{item.badge}</Text>}
              <Text style={styles.menuArrow}>{item.route ? '→' : ''}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.version}>JeuTaime v2.0.0 - Expo Edition</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Profile
  profileCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#FFF', fontWeight: '700' },
  profileInfo: { flex: 1, marginLeft: 16 },
  profileName: { fontSize: 22, fontWeight: '700', color: '#3A2818' },
  titleBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFE082', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginTop: 8, alignSelf: 'flex-start' },
  titleEmoji: { fontSize: 16, marginRight: 4 },
  titleName: { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  titleLevel: { fontSize: 12, color: '#8B6F47', marginLeft: 8 },
  
  // Stats
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginHorizontal: 4, alignItems: 'center' },
  statValue: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  statLabel: { fontSize: 11, color: '#8B6F47', marginTop: 4 },
  
  // Progress
  progressSection: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  progressLabel: { fontSize: 14, color: '#5D4037', marginBottom: 8 },
  progressBarBg: { height: 10, backgroundColor: '#E8D5B7', borderRadius: 5, overflow: 'hidden' },
  progressBarFill: { height: '100%', backgroundColor: '#FFD700', borderRadius: 5 },
  progressText: { fontSize: 12, color: '#8B6F47', marginTop: 6, textAlign: 'right' },
  
  // Badges
  badgesPreview: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818', marginBottom: 12 },
  badgesRow: { flexDirection: 'row', justifyContent: 'space-around' },
  badgeItem: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center' },
  badgeLocked: { backgroundColor: '#E8D5B7' },
  badgeEmoji: { fontSize: 24 },
  
  // Menu
  menuSection: { backgroundColor: '#FFF', borderRadius: 16, overflow: 'hidden', marginBottom: 16 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#F0E6D3' },
  menuIcon: { fontSize: 22, marginRight: 14 },
  menuLabel: { flex: 1, fontSize: 16, color: '#3A2818' },
  menuBadge: { fontSize: 18, marginRight: 8 },
  menuArrow: { fontSize: 18, color: '#8B6F47' },
  
  version: { textAlign: 'center', fontSize: 12, color: '#8B6F47', marginTop: 10 },
});
