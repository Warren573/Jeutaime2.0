import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import Avatar from '../components/Avatar';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, coins } = useStore();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <Avatar
            name={currentUser?.name || 'Utilisateur'}
            size={50}
            online={true}
          />
          <View style={styles.userInfo}>
            <Text style={styles.greeting}>Bonjour,</Text>
            <Text style={styles.userName}>{currentUser?.name || 'Utilisateur'} 👋</Text>
          </View>
        </View>
        <View style={styles.coinsContainer}>
          <Text style={styles.coinsText}>💰 {coins}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats rapides */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>💌</Text>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Lettres</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🎮</Text>
            <Text style={styles.statValue}>28</Text>
            <Text style={styles.statLabel}>Parties</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>👥</Text>
            <Text style={styles.statValue}>5</Text>
            <Text style={styles.statLabel}>Salons</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statEmoji}>🏆</Text>
            <Text style={styles.statValue}>3</Text>
            <Text style={styles.statLabel}>Badges</Text>
          </View>
        </View>

        {/* Activité récente */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📰 Activité récente</Text>
          
          <View style={styles.activityCard}>
            <Text style={styles.activityEmoji}>🔥</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>CLASH EN DIRECT!</Text>
              <Text style={styles.activityDesc}>MaxiCoeur et LoveParis se battent pour Sophie!</Text>
            </View>
            <Text style={styles.activityTime}>5 min</Text>
          </View>

          <View style={styles.activityCard}>
            <Text style={styles.activityEmoji}>🏆</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Champion du jour!</Text>
              <Text style={styles.activityDesc}>LaurenStyle a reçu 47 offrandes! 🎁</Text>
            </View>
            <Text style={styles.activityTime}>12 min</Text>
          </View>

          <View style={styles.activityCard}>
            <Text style={styles.activityEmoji}>💘</Text>
            <View style={styles.activityContent}>
              <Text style={styles.activityTitle}>Love Story!</Text>
              <Text style={styles.activityDesc}>Alex et Emma se sont écrit 15 lettres!</Text>
            </View>
            <Text style={styles.activityTime}>30 min</Text>
          </View>
        </View>

        {/* Offrandes reçues */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🎁 Offrandes reçues</Text>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={styles.offeringsRow}>
              {['🌹', '🧪', '🌹', '💐', '🍫'].map((emoji, i) => (
                <View key={i} style={styles.offeringItem}>
                  <Text style={styles.offeringEmoji}>{emoji}</Text>
                  <Text style={styles.offeringFrom}>Sophie</Text>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E8D5B7',
  },
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userInfo: {
    marginLeft: 12,
  },
  greeting: {
    fontSize: 14,
    color: '#8B6F47',
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
  },
  coinsContainer: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  coinsText: {
    fontSize: 16,
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
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
  },
  statLabel: {
    fontSize: 11,
    color: '#8B6F47',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 12,
  },
  activityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  activityEmoji: {
    fontSize: 28,
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A2818',
  },
  activityDesc: {
    fontSize: 12,
    color: '#8B6F47',
    marginTop: 2,
  },
  activityTime: {
    fontSize: 11,
    color: '#B8860B',
  },
  offeringsRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  offeringItem: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    alignItems: 'center',
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  offeringEmoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  offeringFrom: {
    fontSize: 11,
    color: '#8B6F47',
  },
});
