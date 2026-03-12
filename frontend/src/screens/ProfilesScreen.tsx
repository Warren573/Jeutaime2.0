import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const profiles = [
  { id: 'p1', name: 'Sophie', age: 28, city: 'Paris', bio: 'Amoureuse de la vie et des voyages ✈️', interests: ['Voyages', 'Cinéma', 'Cuisine'], compatibility: 89 },
  { id: 'p2', name: 'Emma', age: 26, city: 'Lyon', bio: 'Artiste dans l\'âme 🎨', interests: ['Art', 'Musique', 'Lecture'], compatibility: 76 },
  { id: 'p3', name: 'Chloé', age: 29, city: 'Marseille', bio: 'Sportive et gourmande 🏊', interests: ['Sport', 'Cuisine', 'Nature'], compatibility: 92 },
  { id: 'p4', name: 'Léa', age: 25, city: 'Bordeaux', bio: 'Passionnée de musique 🎵', interests: ['Musique', 'Concerts', 'Danse'], compatibility: 84 },
  { id: 'p5', name: 'Camille', age: 27, city: 'Toulouse', bio: 'Bookworm assumée 📚', interests: ['Lecture', 'Théâtre', 'Poésie'], compatibility: 71 },
  { id: 'p6', name: 'Julie', age: 30, city: 'Nantes', bio: 'Nature lover 🌿', interests: ['Rando', 'Photo', 'Yoga'], compatibility: 88 },
];

const Avatar = ({ name, size = 120 }: { name: string; size?: number }) => {
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

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const { likedProfiles, dislikedProfiles, addLike, addDislike, addMatch, currentUser } = useStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatch, setShowMatch] = useState<string | null>(null);

  const availableProfiles = profiles.filter(
    p => !likedProfiles.includes(p.id) && !dislikedProfiles.includes(p.id)
  );

  const currentProfile = availableProfiles[currentIndex % availableProfiles.length];

  const handleSmile = () => {
    if (!currentProfile) return;
    addLike(currentProfile.id);
    
    // 50% de chance de match
    if (Math.random() > 0.5) {
      addMatch({
        id: `match_${Date.now()}`,
        userAId: currentUser?.id || 'me',
        userBId: currentProfile.id,
        createdAt: Date.now(),
        questionValidation: { userACorrect: 2, userBCorrect: 2, isValid: true },
        status: 'active',
        letterCount: 0,
      });
      setShowMatch(currentProfile.name);
      setTimeout(() => setShowMatch(null), 2000);
    }
    
    setCurrentIndex(prev => prev + 1);
  };

  const handleGrimace = () => {
    if (!currentProfile) return;
    addDislike(currentProfile.id);
    setCurrentIndex(prev => prev + 1);
  };

  if (showMatch) {
    return (
      <View style={[styles.container, styles.matchScreen, { paddingTop: insets.top }]}>
        <Text style={styles.matchEmoji}>💕</Text>
        <Text style={styles.matchTitle}>C'est un Match!</Text>
        <Text style={styles.matchName}>Vous et {showMatch}</Text>
      </View>
    );
  }

  if (!currentProfile || availableProfiles.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🔍 Découverte</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😢</Text>
          <Text style={styles.emptyText}>Plus de profils disponibles</Text>
          <Text style={styles.emptySubtext}>Revenez plus tard!</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🔍 Découverte</Text>
        <Text style={styles.headerSubtitle}>{availableProfiles.length} profils restants</Text>
      </View>

      <View style={styles.cardContainer}>
        <View style={styles.profileCard}>
          <Avatar name={currentProfile.name} size={140} />
          
          <Text style={styles.profileName}>{currentProfile.name}, {currentProfile.age}</Text>
          <Text style={styles.profileCity}>📍 {currentProfile.city}</Text>
          
          <View style={styles.compatBadge}>
            <Text style={styles.compatText}>💕 {currentProfile.compatibility}% compatible</Text>
          </View>
          
          <Text style={styles.profileBio}>{currentProfile.bio}</Text>
          
          <View style={styles.interests}>
            {currentProfile.interests.map((interest, i) => (
              <View key={i} style={styles.interestTag}>
                <Text style={styles.interestText}>{interest}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Boutons Sourire / Grimace */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.grimaceBtn} onPress={handleGrimace}>
          <Text style={styles.actionEmoji}>😬</Text>
          <Text style={styles.actionLabel}>Passer</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.giftBtn}>
          <Text style={styles.actionEmoji}>🎁</Text>
          <Text style={styles.actionLabel}>Cadeau</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.smileBtn} onPress={handleSmile}>
          <Text style={styles.actionEmoji}>😊</Text>
          <Text style={styles.actionLabel}>Sourire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  cardContainer: { flex: 1, padding: 16, justifyContent: 'center' },
  profileCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 },
  avatar: { alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { color: '#FFF', fontWeight: '700' },
  profileName: { fontSize: 26, fontWeight: '700', color: '#3A2818' },
  profileCity: { fontSize: 16, color: '#8B6F47', marginTop: 4 },
  compatBadge: { backgroundColor: '#FFE4EC', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, marginTop: 12 },
  compatText: { fontSize: 14, fontWeight: '600', color: '#E91E63' },
  profileBio: { fontSize: 16, color: '#5D4037', textAlign: 'center', marginTop: 16, lineHeight: 22 },
  interests: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', marginTop: 16, gap: 8 },
  interestTag: { backgroundColor: '#E8D5B7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 },
  interestText: { fontSize: 12, color: '#5D4037', fontWeight: '600' },
  actions: { flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 20, paddingHorizontal: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: '#E8D5B7' },
  grimaceBtn: { alignItems: 'center', backgroundColor: '#FFCDD2', width: 80, height: 80, borderRadius: 40, justifyContent: 'center' },
  smileBtn: { alignItems: 'center', backgroundColor: '#C8E6C9', width: 80, height: 80, borderRadius: 40, justifyContent: 'center' },
  giftBtn: { alignItems: 'center', backgroundColor: '#FFE082', width: 70, height: 70, borderRadius: 35, justifyContent: 'center' },
  actionEmoji: { fontSize: 32 },
  actionLabel: { fontSize: 11, fontWeight: '600', color: '#5D4037', marginTop: 4 },
  // Match screen
  matchScreen: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#E91E63' },
  matchEmoji: { fontSize: 80 },
  matchTitle: { fontSize: 36, fontWeight: '700', color: '#FFF', marginTop: 20 },
  matchName: { fontSize: 20, color: '#FFF', marginTop: 10 },
  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: { fontSize: 14, color: '#8B6F47', marginTop: 8 },
});
