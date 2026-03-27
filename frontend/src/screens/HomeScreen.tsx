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

const Avatar = ({ name, size = 50 }: { name: string; size?: number }) => {
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const bgColor = colors[Math.abs(hash) % colors.length];
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ color: '#FFF', fontWeight: '700', fontSize: size * 0.35 }}>{initials}</Text>
    </View>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, coins, points, getCurrentTitle, matches, pet } = useStore();
  const title = getCurrentTitle();

  const quickActions = [
    { emoji: '🎮', label: 'Jeux', route: '/games' },
    { emoji: '🐾', label: 'Animal', route: '/pet' },
    { emoji: '🌟', label: 'Badges', route: '/badges' },
  ];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <Avatar name={currentUser?.name || 'Joueur'} size={50} />
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{currentUser?.name || 'Joueur'} 👋</Text>
            <View style={styles.titleRow}>
              <Text style={styles.titleEmoji}>{title.emoji}</Text>
              <Text style={styles.titleName}>{title.title}</Text>
            </View>
          </View>
        </View>
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Stats rapides */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>⭐</Text>
            <Text style={styles.statValue}>{points}</Text>
            <Text style={styles.statLabel}>Points</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💕</Text>
            <Text style={styles.statValue}>{matches.length}</Text>
            <Text style={styles.statLabel}>Matchs</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💬</Text>
            <Text style={styles.statValue}>{currentUser?.stats?.lettersSent || 0}</Text>
            <Text style={styles.statLabel}>Lettres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎮</Text>
            <Text style={styles.statValue}>{currentUser?.stats?.gamesWon || 0}</Text>
            <Text style={styles.statLabel}>Victoires</Text>
          </View>
        </View>

        {/* Actions rapides */}
        <View style={styles.quickActionsRow}>
          {quickActions.map((action, i) => (
            <TouchableOpacity key={i} style={styles.quickAction} onPress={() => router.push(action.route as any)}>
              <Text style={styles.quickEmoji}>{action.emoji}</Text>
              <Text style={styles.quickLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Animal virtuel */}
        {pet && (
          <TouchableOpacity style={styles.petCard} onPress={() => router.push('/pet')}>
            <Text style={styles.petEmoji}>{pet.petEmoji}</Text>
            <View style={styles.petInfo}>
              <Text style={styles.petName}>{pet.petName}</Text>
              <Text style={styles.petStatus}>
                🍖 {Math.round(pet.stats.hunger)}% | 😄 {Math.round(pet.stats.happiness)}%
              </Text>
            </View>
            <Text style={styles.petArrow}>→</Text>
          </TouchableOpacity>
        )}

        {/* Activité récente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📰 Activité récente</Text>
          
          <View style={styles.activityCard}>
            <Text style={styles.activityEmoji}>🔥</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Nouveau salon!</Text>
              <Text style={styles.activityDesc}>Le Café de Paris vous attend</Text>
            </View>
          </View>

          <View style={styles.activityCard}>
            <Text style={styles.activityEmoji}>🎮</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Activités disponibles</Text>
              <Text style={styles.activityDesc}>Morpion, Memory, Whack-a-Mole</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  userSection: { flexDirection: 'row', alignItems: 'center' },
  userInfo: { marginLeft: 12 },
  greeting: { fontSize: 12, color: '#8B6F47' },
  userName: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  titleEmoji: { fontSize: 12 },
  titleName: { fontSize: 11, color: '#DAA520', fontWeight: '600', marginLeft: 4 },
  coinsContainer: { backgroundColor: '#FFD700', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  coinsText: { fontSize: 14, fontWeight: '700', color: '#3A2818' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  statCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 12, marginHorizontal: 3, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  statEmoji: { fontSize: 20, marginBottom: 4 },
  statValue: { fontSize: 18, fontWeight: '700', color: '#3A2818' },
  statLabel: { fontSize: 10, color: '#8B6F47', marginTop: 2 },
  quickActionsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 },
  quickAction: { alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  quickEmoji: { fontSize: 28 },
  quickLabel: { fontSize: 12, fontWeight: '600', color: '#5D4037', marginTop: 4 },
  petCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', borderRadius: 16, padding: 16, marginBottom: 16 },
  petEmoji: { fontSize: 40 },
  petInfo: { flex: 1, marginLeft: 12 },
  petName: { fontSize: 16, fontWeight: '700', color: '#2E7D32' },
  petStatus: { fontSize: 12, color: '#558B2F', marginTop: 4 },
  petArrow: { fontSize: 20, color: '#4CAF50' },
  section: { marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 12 },
  activityCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', borderRadius: 12, padding: 14, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  activityEmoji: { fontSize: 28, marginRight: 12 },
  activityContent: { flex: 1 },
  activityTitle: { fontSize: 14, fontWeight: '700', color: '#3A2818' },
  activityDesc: { fontSize: 12, color: '#8B6F47', marginTop: 2 },
});
