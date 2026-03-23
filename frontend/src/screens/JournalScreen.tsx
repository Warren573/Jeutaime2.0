import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';


interface NewsItem {
  id: string;
  type: 'news' | 'event' | 'tip' | 'update';
  title: string;
  content: string;
  emoji: string;
  date: string;
  likes: number;
  comments: number;
  author?: string;
}

const mockNews: NewsItem[] = [
  {
    id: '1',
    type: 'news',
    title: '🎉 Bienvenue sur JeuTaime!',
    content: 'Découvrez une nouvelle façon de faire des rencontres à travers le jeu, les histoires collaboratives et les cadeaux virtuels. Amusez-vous!',
    emoji: '🎉',
    date: 'Aujourd\'hui',
    likes: 142,
    comments: 23,
  },
  {
    id: '2',
    type: 'event',
    title: '☕ Nouveau Salon: Café de Paris',
    content: 'Un nouveau salon intime pour 4 personnes vient d\'ouvrir! Ambiance cosy et conversation face-à-face garanties.',
    emoji: '☕',
    date: 'Hier',
    likes: 89,
    comments: 15,
  },
  {
    id: '3',
    type: 'tip',
    title: '💡 Astuce du jour',
    content: 'Saviez-vous que vous pouvez envoyer des offrandes aux autres joueurs dans les salons? C\'est un excellent moyen de briser la glace!',
    emoji: '💡',
    date: 'Il y a 2 jours',
    likes: 67,
    comments: 8,
  },
  {
    id: '4',
    type: 'update',
    title: '🎮 Nouveaux mini-jeux disponibles!',
    content: 'Pong, Casse-Brique et le Jeu de Cartes sont maintenant disponibles! Gagnez des pièces en jouant.',
    emoji: '🎮',
    date: 'Il y a 3 jours',
    likes: 234,
    comments: 45,
  },
  {
    id: '5',
    type: 'news',
    title: '🐾 Adoptez un compagnon virtuel!',
    content: 'Le refuge est ouvert! Choisissez parmi 9 animaux adorables, du chien commun au dragon légendaire.',
    emoji: '🐾',
    date: 'Il y a 4 jours',
    likes: 178,
    comments: 32,
  },
];

const typeColors = {
  news: '#4CAF50',
  event: '#E91E63',
  tip: '#FF9800',
  update: '#2196F3',
};

const typeLabels = {
  news: 'Actualité',
  event: 'Événement',
  tip: 'Astuce',
  update: 'Mise à jour',
};

export default function JournalScreen() {
  const insets = useSafeAreaInsets();
  const { currentUser, coins, points, getCurrentTitle } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['journal'] ?? '#FFF8E7');
  const [refreshing, setRefreshing] = useState(false);
  const [likedItems, setLikedItems] = useState<string[]>([]);
  const title = getCurrentTitle();

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleLike = (itemId: string) => {
    if (likedItems.includes(itemId)) {
      setLikedItems(prev => prev.filter(id => id !== itemId));
    } else {
      setLikedItems(prev => [...prev, itemId]);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>📰 Journal</Text>
        <Text style={styles.headerSubtitle}>Actualités et événements de la communauté</Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#DAA520" />
        }
      >
        {/* User stats card */}
        <View style={styles.statsCard}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>💰 {coins}</Text>
              <Text style={styles.statLabel}>Pièces</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>⭐ {points}</Text>
              <Text style={styles.statLabel}>Points</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{title.emoji}</Text>
              <Text style={styles.statLabel}>{title.title}</Text>
            </View>
          </View>
        </View>

        {/* News feed */}
        <Text style={styles.sectionTitle}>📝 Fil d'actualité</Text>
        
        {mockNews.map(item => (
          <View key={item.id} style={styles.newsCard}>
            <View style={styles.newsHeader}>
              <View style={[styles.typeBadge, { backgroundColor: typeColors[item.type] }]}>
                <Text style={styles.typeText}>{typeLabels[item.type]}</Text>
              </View>
              <Text style={styles.newsDate}>{item.date}</Text>
            </View>
            
            <Text style={styles.newsTitle}>{item.title}</Text>
            <Text style={styles.newsContent}>{item.content}</Text>
            
            <View style={styles.newsFooter}>
              <TouchableOpacity 
                style={styles.actionBtn}
                onPress={() => handleLike(item.id)}
              >
                <Text style={styles.actionEmoji}>
                  {likedItems.includes(item.id) ? '❤️' : '🤍'}
                </Text>
                <Text style={styles.actionCount}>
                  {item.likes + (likedItems.includes(item.id) ? 1 : 0)}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionEmoji}>💬</Text>
                <Text style={styles.actionCount}>{item.comments}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionBtn}>
                <Text style={styles.actionEmoji}>🔗</Text>
                <Text style={styles.actionCount}>Partager</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {/* Community highlights */}
        <Text style={styles.sectionTitle}>🌟 Moments de la communauté</Text>
        
        <View style={styles.highlightsRow}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightEmoji}>💕</Text>
            <Text style={styles.highlightValue}>1,234</Text>
            <Text style={styles.highlightLabel}>Matchs aujourd'hui</Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightEmoji}>📝</Text>
            <Text style={styles.highlightValue}>567</Text>
            <Text style={styles.highlightLabel}>Histoires créées</Text>
          </View>
        </View>
        
        <View style={styles.highlightsRow}>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightEmoji}>🎁</Text>
            <Text style={styles.highlightValue}>2,891</Text>
            <Text style={styles.highlightLabel}>Cadeaux envoyés</Text>
          </View>
          <View style={styles.highlightCard}>
            <Text style={styles.highlightEmoji}>👥</Text>
            <Text style={styles.highlightValue}>8,432</Text>
            <Text style={styles.highlightLabel}>Membres actifs</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7' },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: '#E8D5B7' },
  headerTitle: { fontSize: 28, fontWeight: '700', color: '#3A2818' },
  headerSubtitle: { fontSize: 14, color: '#8B6F47', marginTop: 4 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  
  // Stats card
  statsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statValue: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  statLabel: { fontSize: 12, color: '#8B6F47', marginTop: 4 },
  
  // Section
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#3A2818', marginBottom: 12, marginTop: 8 },
  
  // News card
  newsCard: { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  newsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  typeText: { color: '#FFF', fontSize: 11, fontWeight: '700' },
  newsDate: { fontSize: 12, color: '#8B6F47' },
  newsTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818', marginBottom: 8 },
  newsContent: { fontSize: 14, color: '#5D4037', lineHeight: 20 },
  newsFooter: { flexDirection: 'row', marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#E8D5B7' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
  actionEmoji: { fontSize: 18, marginRight: 4 },
  actionCount: { fontSize: 13, color: '#8B6F47' },
  
  // Highlights
  highlightsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  highlightCard: { flex: 1, backgroundColor: '#FFF', borderRadius: 12, padding: 16, marginHorizontal: 4, alignItems: 'center' },
  highlightEmoji: { fontSize: 28, marginBottom: 6 },
  highlightValue: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  highlightLabel: { fontSize: 11, color: '#8B6F47', marginTop: 4, textAlign: 'center' },
});
