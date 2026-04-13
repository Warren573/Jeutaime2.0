import React, { useState } from 'react';
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
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';

interface WeeklyWinner {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: 'M' | 'F';
  bio: string;
  votes: number;
  emoji: string;
}

const currentWinners: { male: WeeklyWinner; female: WeeklyWinner } = {
  male: {
    id: 'm1',
    name: 'Alexandre',
    age: 29,
    city: 'Lyon',
    gender: 'M',
    bio: 'Passionné de photographie et de voyages, je cherche quelqu\'un pour partager des aventures inoubliables et des couchers de soleil magiques 📸✨',
    votes: 234,
    emoji: '😎',
  },
  female: {
    id: 'f1',
    name: 'Émilie',
    age: 27,
    city: 'Paris',
    gender: 'F',
    bio: 'Amoureuse des mots et de la poésie, je rêve de rencontrer une âme qui comprend que le plus beau voyage est celui qu\'on fait à deux 💕📚',
    votes: 312,
    emoji: '😊',
  },
};

interface Candidate {
  id: string;
  name: string;
  age: number;
  city: string;
  gender: 'M' | 'F';
  bio: string;
  votes: number;
  emoji: string;
}

const candidates: Candidate[] = [
  { id: 'c1', name: 'Sophie', age: 28, city: 'Marseille', gender: 'F', bio: 'La vie est trop courte pour ne pas sourire chaque jour! Je cherche quelqu\'un qui saura me faire rire et partager de beaux moments 🌟', votes: 156, emoji: '🥰' },
  { id: 'c2', name: 'Thomas', age: 31, city: 'Bordeaux', gender: 'M', bio: 'Entre mer et montagne, je suis un aventurier dans l\'âme. Si tu aimes l\'imprévu et les étoiles, on devrait se parler ⭐🏔️', votes: 189, emoji: '🤠' },
  { id: 'c3', name: 'Léa', age: 25, city: 'Toulouse', gender: 'F', bio: 'Artiste le jour, rêveuse la nuit. Je peins ma vie en couleurs et j\'espère trouver quelqu\'un pour partager ma palette 🎨💜', votes: 201, emoji: '😇' },
  { id: 'c4', name: 'Hugo', age: 28, city: 'Nantes', gender: 'M', bio: 'Fan de musique live et de cafés sympas. Le bonheur c\'est simple: une bonne playlist, un bon café, et peut-être toi? ☕🎵', votes: 145, emoji: '😏' },
];

export default function WeeklyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { coins, removeCoins, addPoints } = useStore();
  const [votedFor, setVotedFor] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<'winners' | 'vote'>('winners');

  const handleVote = (candidateId: string) => {
    if (votedFor.includes(candidateId)) return;
    
    // Coût: 5 pièces par vote
    if (!removeCoins(5)) {
      alert('Il te faut 5 pièces pour voter!');
      return;
    }
    
    setVotedFor(prev => [...prev, candidateId]);
    addPoints(2);
  };

  const ProfileCard = ({ profile, isWinner = false }: { profile: WeeklyWinner | Candidate; isWinner?: boolean }) => (
    <View style={[styles.profileCard, isWinner && styles.winnerCard]}>
      {isWinner && (
        <View style={styles.crownBadge}>
          <Text style={styles.crownEmoji}>👑</Text>
          <Text style={styles.crownText}>GAGNANT{profile.gender === 'F' ? 'E' : ''}</Text>
        </View>
      )}
      <Avatar size={80} {...DEFAULT_AVATAR} />
      <Text style={styles.profileName}>{profile.name}, {profile.age}</Text>
      <Text style={styles.profileCity}>📍 {profile.city}</Text>
      <View style={styles.bioBox}>
        <Text style={styles.bioText}>"{profile.bio}"</Text>
      </View>
      <View style={styles.voteInfo}>
        <Text style={styles.voteCount}>❤️ {profile.votes} votes</Text>
      </View>
      {!isWinner && !votedFor.includes(profile.id) && (
        <TouchableOpacity style={styles.voteBtn} onPress={() => handleVote(profile.id)}>
          <Text style={styles.voteBtnText}>👍 Voter (5 🪙)</Text>
        </TouchableOpacity>
      )}
      {votedFor.includes(profile.id) && (
        <View style={styles.votedBadge}>
          <Text style={styles.votedText}>✅ Voté!</Text>
        </View>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>🏆 Profil de la semaine</Text>
        <Text style={styles.subtitle}>Votez pour les meilleures bios!</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'winners' && styles.tabActive]}
          onPress={() => setActiveTab('winners')}
        >
          <Text style={[styles.tabText, activeTab === 'winners' && styles.tabTextActive]}>👑 Gagnants</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'vote' && styles.tabActive]}
          onPress={() => setActiveTab('vote')}
        >
          <Text style={[styles.tabText, activeTab === 'vote' && styles.tabTextActive]}>🗳️ Voter</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'winners' ? (
          <>
            <Text style={styles.sectionTitle}>👸 Profil féminin de la semaine</Text>
            <ProfileCard profile={currentWinners.female} isWinner />
            
            <Text style={styles.sectionTitle}>🤴 Profil masculin de la semaine</Text>
            <ProfileCard profile={currentWinners.male} isWinner />
            
            <View style={styles.rewardsBox}>
              <Text style={styles.rewardsTitle}>🎁 Récompenses</Text>
              <Text style={styles.rewardsText}>• 500 pièces bonus 💰</Text>
              <Text style={styles.rewardsText}>• Badge "Éloquent(e)" exclusif 🌟</Text>
              <Text style={styles.rewardsText}>• Profil mis en avant 7 jours 👀</Text>
            </View>
          </>
        ) : (
          <>
            <View style={styles.rulesBox}>
              <Text style={styles.rulesTitle}>📋 Règles du concours</Text>
              <Text style={styles.rulesText}>• Bio minimum 50 caractères</Text>
              <Text style={styles.rulesText}>• 1 vote = 5 pièces</Text>
              <Text style={styles.rulesText}>• Résultats chaque dimanche</Text>
              <Text style={styles.rulesTip}>💡 Une bonne bio attire plus de matchs!</Text>
            </View>

            <Text style={styles.sectionTitle}>🗳️ Candidats de cette semaine</Text>
            
            {candidates.map(candidate => (
              <ProfileCard key={candidate.id} profile={candidate} />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  backText: { fontSize: 16, color: '#8B6F47' },
  title: { fontSize: 28, fontWeight: '700', color: '#3A2818', marginTop: 4 },
  subtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  
  // Tabs
  tabsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFF' },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 12, marginHorizontal: 4, backgroundColor: '#F5F5F5' },
  tabActive: { backgroundColor: '#FFD700' },
  tabText: { fontSize: 15, fontWeight: '600', color: '#8B6F47' },
  tabTextActive: { color: '#3A2818' },
  
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 12, marginTop: 8 },
  
  // Profile card
  profileCard: { backgroundColor: '#FFF', borderRadius: 24, padding: 24, marginBottom: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.12, shadowRadius: 10, elevation: 5 },
  winnerCard: { borderWidth: 3, borderColor: '#FFD700', backgroundColor: '#FFFEF7' },
  crownBadge: { position: 'absolute', top: -12, backgroundColor: '#FFD700', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, flexDirection: 'row', alignItems: 'center' },
  crownEmoji: { fontSize: 16, marginRight: 4 },
  crownText: { fontSize: 12, fontWeight: '700', color: '#8B6F47' },
  avatarLarge: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#FFE082', alignItems: 'center', justifyContent: 'center', marginBottom: 16, marginTop: 8 },
  avatarEmoji: { fontSize: 50 },
  profileName: { fontSize: 24, fontWeight: '700', color: '#3A2818' },
  profileCity: { fontSize: 15, color: '#8B6F47', marginTop: 4 },
  bioBox: { backgroundColor: '#FFF8E7', borderRadius: 16, padding: 16, marginTop: 16, width: '100%' },
  bioText: { fontSize: 15, color: '#5D4037', fontStyle: 'italic', lineHeight: 22, textAlign: 'center' },
  voteInfo: { marginTop: 16 },
  voteCount: { fontSize: 18, fontWeight: '700', color: '#E91E63' },
  voteBtn: { marginTop: 16, backgroundColor: '#E91E63', paddingHorizontal: 32, paddingVertical: 14, borderRadius: 25 },
  voteBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  votedBadge: { marginTop: 16, backgroundColor: '#4CAF50', paddingHorizontal: 24, paddingVertical: 10, borderRadius: 20 },
  votedText: { color: '#FFF', fontWeight: '700' },
  
  // Rewards box
  rewardsBox: { backgroundColor: '#E8F5E9', borderRadius: 20, padding: 20, marginTop: 8 },
  rewardsTitle: { fontSize: 17, fontWeight: '700', color: '#2E7D32', marginBottom: 12 },
  rewardsText: { fontSize: 14, color: '#4CAF50', marginBottom: 6 },
  
  // Rules box
  rulesBox: { backgroundColor: '#FFF', borderRadius: 20, padding: 18, marginBottom: 16, borderLeftWidth: 4, borderLeftColor: '#FFD700' },
  rulesTitle: { fontSize: 17, fontWeight: '700', color: '#3A2818', marginBottom: 10 },
  rulesText: { fontSize: 14, color: '#5D4037', marginBottom: 6 },
  rulesTip: { fontSize: 13, color: '#DAA520', fontWeight: '600', marginTop: 8 },
});
