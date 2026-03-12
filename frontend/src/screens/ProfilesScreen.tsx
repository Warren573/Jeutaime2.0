import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Avatar from '../components/Avatar';

const { width } = Dimensions.get('window');

const profiles = [
  { id: 1, name: 'Sophie', age: 28, city: 'Paris', compatibility: 89, online: true },
  { id: 2, name: 'Emma', age: 26, city: 'Lyon', compatibility: 76, online: true },
  { id: 3, name: 'Chloé', age: 29, city: 'Marseille', compatibility: 92, online: false },
  { id: 4, name: 'Léa', age: 25, city: 'Bordeaux', compatibility: 84, online: true },
  { id: 5, name: 'Camille', age: 27, city: 'Toulouse', compatibility: 71, online: false },
];

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Découverte</Text>
        <Text style={styles.headerSubtitle}>Trouvez votre âme soeur</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {profiles.map((profile) => (
          <TouchableOpacity key={profile.id} style={styles.profileCard}>
            <View style={styles.profileHeader}>
              <Avatar
                name={profile.name}
                size={70}
                online={profile.online}
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {profile.name}, {profile.age}
                </Text>
                <Text style={styles.profileCity}>📍 {profile.city}</Text>
                <View style={styles.compatibilityBadge}>
                  <Text style={styles.compatibilityText}>
                    💕 {profile.compatibility}% compatible
                  </Text>
                </View>
              </View>
            </View>
            
            <View style={styles.profileActions}>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionBtnText}>💌 Écrire</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnSecondary]}>
                <Text style={styles.actionBtnTextSecondary}>👁️ Profil</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        ))}
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
  headerSubtitle: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
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
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  profileHeader: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
    justifyContent: 'center',
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3A2818',
  },
  profileCity: {
    fontSize: 14,
    color: '#8B6F47',
    marginTop: 4,
  },
  compatibilityBadge: {
    backgroundColor: '#FFE4EC',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  compatibilityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#E91E63',
  },
  profileActions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    backgroundColor: '#667EEA',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionBtnSecondary: {
    backgroundColor: '#E8D5B7',
  },
  actionBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFF',
  },
  actionBtnTextSecondary: {
    fontSize: 14,
    fontWeight: '700',
    color: '#654321',
  },
});
