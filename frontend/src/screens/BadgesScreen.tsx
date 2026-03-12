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
import { badges } from '../data/gameData';

export default function BadgesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser } = useStore();
  
  const unlockedCount = currentUser?.unlockedBadges?.length || 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🌟 Badges</Text>
        <Text style={styles.subtitle}>{unlockedCount}/{badges.length} débloqués</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.badgesGrid}>
          {badges.map(badge => {
            const unlocked = currentUser?.unlockedBadges?.includes(badge.id);
            return (
              <View key={badge.id} style={[styles.badgeCard, !unlocked && styles.badgeCardLocked]}>
                <View style={[styles.badgeIcon, !unlocked && styles.badgeIconLocked]}>
                  <Text style={styles.badgeEmoji}>{unlocked ? badge.emoji : '🔒'}</Text>
                </View>
                <Text style={[styles.badgeName, !unlocked && styles.badgeNameLocked]}>
                  {badge.name}
                </Text>
                <Text style={styles.badgeDesc}>{badge.description}</Text>
                {unlocked && <View style={styles.unlockedBadge}><Text style={styles.unlockedText}>✓</Text></View>}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47', marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollContent: { padding: 16 },
  badgesGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  badgeCard: { width: '48%', backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  badgeCardLocked: { backgroundColor: '#F5F5F5' },
  badgeIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  badgeIconLocked: { backgroundColor: '#E0E0E0' },
  badgeEmoji: { fontSize: 30 },
  badgeName: { fontSize: 14, fontWeight: '700', color: '#3A2818', textAlign: 'center' },
  badgeNameLocked: { color: '#9E9E9E' },
  badgeDesc: { fontSize: 11, color: '#8B6F47', textAlign: 'center', marginTop: 4 },
  unlockedBadge: { position: 'absolute', top: 8, right: 8, width: 20, height: 20, borderRadius: 10, backgroundColor: '#4CAF50', alignItems: 'center', justifyContent: 'center' },
  unlockedText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
});
