import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../store/useStore';
import type { Match } from '../shared/types';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DiscoveryProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarEmoji: string;
  avatarBg: string;
  mainVibe: string;
  descriptors: string[];
  tags: { emoji: string; label: string }[];
  quote: string;
  sections: { title: string; icon: string; items: string[] }[];
  game: { level: number; badges: string[]; pet: string; petEmoji: string };
  letters: { exchanged: number; total: number; lastLetterDaysAgo: number; nextReveal: number };
  compatibility: number;
}

// ─── MOCK DATA ─────────────────────────────────────────────────────────────────

const profiles: DiscoveryProfile[] = [
  {
    id: 'p1',
    name: 'Sophie',
    age: 28,
    city: 'Paris',
    avatarEmoji: '🌸',
    avatarBg: '#FCE4EC',
    mainVibe: '✨ Romantique curieuse',
    descriptors: ['Douce', 'Rêveuse'],
    tags: [
      { emoji: '✈️', label: 'Voyageuse' },
      { emoji: '🎬', label: 'Cinéphile' },
      { emoji: '🍳', label: 'Cuisinière' },
      { emoji: '🌙', label: 'Nocturne' },
      { emoji: '📖', label: 'Lectrice' },
    ],
    quote: 'Je crois qu\'on se comprend mieux autour d\'un plat qu\'on a cuisiné ensemble.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Voyages lointains', 'Cinéma d\'auteur', 'Cuisine du monde'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Avec présence', 'En douceur', 'Par les détails'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['Je ris facilement', 'J\'écoute vraiment', 'Je me souviens de tout'] },
    ],
    game: { level: 8, badges: ['Romantique', 'Curieuse'], pet: 'Lapin', petEmoji: '🐰' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 89,
  },
  {
    id: 'p2',
    name: 'Emma',
    age: 26,
    city: 'Lyon',
    avatarEmoji: '🎨',
    avatarBg: '#EDE7F6',
    mainVibe: '🎭 Artiste libre',
    descriptors: ['Intense', 'Créative'],
    tags: [
      { emoji: '🎨', label: 'Artiste' },
      { emoji: '🎵', label: 'Musicienne' },
      { emoji: '📚', label: 'Lectrice' },
      { emoji: '🔥', label: 'Passionnée' },
      { emoji: '🌿', label: 'Zen' },
    ],
    quote: 'L\'art m\'a appris à regarder les gens comme des œuvres inachevées.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Peinture', 'Jazz & soul', 'Littérature contemporaine'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Avec intensité', 'De façon créative', 'Sans retenue'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['Je provoque doucement', 'Je crée des ambiances', 'Je reste mystérieuse'] },
    ],
    game: { level: 5, badges: ['Artiste', 'Mystérieuse'], pet: 'Chat', petEmoji: '🐱' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 76,
  },
  {
    id: 'p3',
    name: 'Chloé',
    age: 29,
    city: 'Marseille',
    avatarEmoji: '🏊',
    avatarBg: '#E0F7FA',
    mainVibe: '⚡ Sportive gourmande',
    descriptors: ['Directe', 'Solaire'],
    tags: [
      { emoji: '🏊', label: 'Nageuse' },
      { emoji: '🍕', label: 'Gourmande' },
      { emoji: '🌞', label: 'Solaire' },
      { emoji: '🤸', label: 'Active' },
      { emoji: '🌊', label: 'La mer' },
    ],
    quote: 'Je veux vivre des histoires qui me donnent faim — de tout.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Sport & mer', 'Gastronomie locale', 'Voyages spontanés'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Avec énergie', 'Franchement', 'En riant beaucoup'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['Je lance les défis', 'Je mets l\'ambiance', 'Je ne triche pas'] },
    ],
    game: { level: 14, badges: ['Solaire', 'Compétitive'], pet: 'Dauphin', petEmoji: '🐬' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 92,
  },
  {
    id: 'p4',
    name: 'Léa',
    age: 25,
    city: 'Bordeaux',
    avatarEmoji: '🎵',
    avatarBg: '#FFF8E1',
    mainVibe: '🎶 Âme musicale',
    descriptors: ['Sensible', 'Taquine'],
    tags: [
      { emoji: '🎸', label: 'Guitariste' },
      { emoji: '🎤', label: 'Chanteuse' },
      { emoji: '💃', label: 'Danseuse' },
      { emoji: '🍷', label: 'Œnophile' },
      { emoji: '🌸', label: 'Romantique' },
    ],
    quote: 'Je tombe amoureuse des gens qui ont une playlist secrète.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Concerts & scènes', 'Vins du Sud-Ouest', 'Danse improvisée'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Avec des chansons', 'Lentement', 'Avec des surprises'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['Je chante parfois', 'Je teste les gens', 'Je garde un secret'] },
    ],
    game: { level: 7, badges: ['Musicale', 'Romantique'], pet: 'Renard', petEmoji: '🦊' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 84,
  },
  {
    id: 'p5',
    name: 'Camille',
    age: 27,
    city: 'Toulouse',
    avatarEmoji: '📚',
    avatarBg: '#F3E5F5',
    mainVibe: '🌙 Intellectuelle discrète',
    descriptors: ['Profonde', 'Drôle'],
    tags: [
      { emoji: '📚', label: 'Lectrice' },
      { emoji: '🎭', label: 'Théâtre' },
      { emoji: '✍️', label: 'Écrivaine' },
      { emoji: '🧩', label: 'Analytique' },
      { emoji: '☕', label: 'Café addict' },
    ],
    quote: 'J\'ai plus de personnages fictifs dans ma tête que d\'amis — et j\'assume.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Romans & essais', 'Théâtre amateur', 'Débats de fond'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Par les mots', 'Avec profondeur', 'En observant d\'abord'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['Je pose les vraies questions', 'Je décrypte les sous-textes', 'Je ris en dernier mais plus fort'] },
    ],
    game: { level: 10, badges: ['Intellectuelle', 'Mystérieuse'], pet: 'Hibou', petEmoji: '🦉' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 71,
  },
  {
    id: 'p6',
    name: 'Julie',
    age: 30,
    city: 'Nantes',
    avatarEmoji: '🌿',
    avatarBg: '#E8F5E9',
    mainVibe: '🌿 Nature & sérénité',
    descriptors: ['Apaisante', 'Curieuse'],
    tags: [
      { emoji: '🥾', label: 'Randonneuse' },
      { emoji: '📸', label: 'Photographe' },
      { emoji: '🧘', label: 'Yoga' },
      { emoji: '🌱', label: 'Écolo' },
      { emoji: '☁️', label: 'Contemplative' },
    ],
    quote: 'La meilleure conversation que j\'ai eue, c\'était face à l\'océan à 6h du matin.',
    sections: [
      { title: 'Mon univers', icon: '🌐', items: ['Randonnées & nature', 'Photographie argentique', 'Yoga & silence'] },
      { title: 'Ma manière d\'aimer', icon: '💞', items: ['Avec calme', 'En pleine nature', 'Par la présence'] },
      { title: 'Ma présence dans les salons', icon: '🫧', items: ['J\'observe les dynamiques', 'Je parle peu mais juste', 'Je rends le calme contagieux'] },
    ],
    game: { level: 9, badges: ['Apaisante', 'Contemplative'], pet: 'Panda', petEmoji: '🐼' },
    letters: { exchanged: 0, total: 10, lastLetterDaysAgo: 0, nextReveal: 3 },
    compatibility: 88,
  },
];

// ─── REVEAL HELPERS ────────────────────────────────────────────────────────────

const REVEAL_MILESTONES = [
  { threshold: 0,  label: 'Inconnu',    color: '#9E9E9E' },
  { threshold: 3,  label: 'Mystérieux', color: '#9C27B0' },
  { threshold: 6,  label: 'Familier',   color: '#2196F3' },
  { threshold: 10, label: 'Révélé',     color: '#E91E63' },
];

function getRevealState(exchanged: number) {
  let current = REVEAL_MILESTONES[0];
  for (const m of REVEAL_MILESTONES) {
    if (exchanged >= m.threshold) current = m;
  }
  const idx = REVEAL_MILESTONES.indexOf(current);
  const next = idx < REVEAL_MILESTONES.length - 1 ? REVEAL_MILESTONES[idx + 1] : null;
  return { current, next };
}

// ─── SUB-COMPONENTS ────────────────────────────────────────────────────────────

function ProfileAvatar({ emoji, bg }: { emoji: string; bg: string }) {
  return (
    <View style={[styles.avatarBox, { backgroundColor: bg }]}>
      <Text style={styles.avatarEmoji}>{emoji}</Text>
    </View>
  );
}

function CompatBadge({ value }: { value: number }) {
  const color = value >= 85 ? '#E91E63' : value >= 70 ? '#FF9800' : '#9E9E9E';
  return (
    <View style={[styles.compatBadge, { backgroundColor: color + '18', borderColor: color + '40' }]}>
      <Text style={[styles.compatText, { color }]}>💕 {value}% compatible</Text>
    </View>
  );
}

function Tags({ tags }: { tags: DiscoveryProfile['tags'] }) {
  return (
    <View style={styles.tagsWrap}>
      {tags.map((t) => (
        <View key={t.label} style={styles.tag}>
          <Text style={styles.tagEmoji}>{t.emoji}</Text>
          <Text style={styles.tagLabel}>{t.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Quote({ quote }: { quote: string }) {
  return (
    <View style={styles.quoteCard}>
      <View style={styles.quoteAccent} />
      <Text style={styles.quoteText}>« {quote} »</Text>
    </View>
  );
}

function Section({ section }: { section: DiscoveryProfile['sections'][0] }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionIcon}>{section.icon}</Text>
        <Text style={styles.sectionTitle}>{section.title}</Text>
      </View>
      <View style={styles.sectionItems}>
        {section.items.map((item, i) => (
          <View key={i} style={styles.sectionItem}>
            <View style={styles.sectionBullet} />
            <Text style={styles.sectionItemText}>{item}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function GameSection({ game }: { game: DiscoveryProfile['game'] }) {
  return (
    <View style={styles.gameCard}>
      <Text style={styles.gameCardLabel}>Progression</Text>
      <View style={styles.gameRow}>
        <View style={styles.gameStat}>
          <Text style={styles.gameIcon}>⭐</Text>
          <Text style={styles.gameValue}>Niv. {game.level}</Text>
          <Text style={styles.gameLabel}>Niveau</Text>
        </View>
        <View style={styles.gameDivider} />
        <View style={[styles.gameStat, { flex: 2 }]}>
          <Text style={styles.gameIcon}>🏅</Text>
          <Text style={styles.gameValue} numberOfLines={1}>{game.badges.join(' · ')}</Text>
          <Text style={styles.gameLabel}>Badges</Text>
        </View>
        <View style={styles.gameDivider} />
        <View style={styles.gameStat}>
          <Text style={styles.gameIcon}>{game.petEmoji}</Text>
          <Text style={styles.gameValue}>{game.pet}</Text>
          <Text style={styles.gameLabel}>Animal</Text>
        </View>
      </View>
    </View>
  );
}

function RevealCard({ letters }: { letters: DiscoveryProfile['letters'] }) {
  const { current, next } = getRevealState(letters.exchanged);
  const progress = Math.min(letters.exchanged / letters.total, 1);
  const remaining = next ? next.threshold - letters.exchanged : 0;
  return (
    <View style={styles.revealCard}>
      <View style={styles.revealHeader}>
        <Text style={styles.revealTitle}>Photos cachées</Text>
        <View style={[styles.revealBadge, { backgroundColor: current.color + '18', borderColor: current.color + '40' }]}>
          <Text style={[styles.revealBadgeText, { color: current.color }]}>{current.label}</Text>
        </View>
      </View>
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%`, backgroundColor: current.color }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCount}>{letters.exchanged} / {letters.total} lettres</Text>
        {next && <Text style={styles.progressNext}>{remaining} lettre{remaining > 1 ? 's' : ''} → {next.label}</Text>}
      </View>
      <View style={styles.milestonesRow}>
        {REVEAL_MILESTONES.map((m) => {
          const reached = letters.exchanged >= m.threshold;
          return (
            <View key={m.label} style={styles.milestone}>
              <View style={[styles.milestoneDot, reached ? { backgroundColor: m.color } : styles.milestoneDotEmpty]} />
              <Text style={[styles.milestoneLabel, reached && { color: m.color, fontWeight: '600' }]}>{m.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const { likedProfiles, dislikedProfiles, addLike, addDislike, addMatch, currentUser } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['profiles'] ?? '#FFF8E7');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatch, setShowMatch] = useState<string | null>(null);

  const availableProfiles = profiles.filter(
    (p) => !likedProfiles.includes(p.id) && !dislikedProfiles.includes(p.id)
  );
  const profile = availableProfiles[currentIndex % Math.max(availableProfiles.length, 1)];

  const handleSmile = () => {
    if (!profile) return;
    addLike(profile.id);
    if (Math.random() > 0.5) {
      addMatch({
        id: `match_${Date.now()}`,
        userAId: currentUser?.id || 'me',
        userBId: profile.id,
        createdAt: Date.now(),
        questionValidation: { userACorrect: 2, userBCorrect: 2, isValid: true },
        status: 'active',
        letterCount: 0,
      });
      setShowMatch(profile.name);
      setTimeout(() => setShowMatch(null), 2500);
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const handlePass = () => {
    if (!profile) return;
    addDislike(profile.id);
    setCurrentIndex((prev) => prev + 1);
  };

  // ── Match overlay
  if (showMatch) {
    return (
      <View style={[styles.matchScreen, { paddingTop: insets.top }]}>
        <Text style={styles.matchEmoji}>💕</Text>
        <Text style={styles.matchTitle}>C'est un Match !</Text>
        <Text style={styles.matchName}>Vous et {showMatch}</Text>
      </View>
    );
  }

  // ── Empty state
  if (!profile || availableProfiles.length === 0) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        <View style={styles.topBar}>
          <Text style={styles.topBarTitle}>🔍 Découverte</Text>
        </View>
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😢</Text>
          <Text style={styles.emptyText}>Plus de profils disponibles</Text>
          <Text style={styles.emptySubtext}>Revenez plus tard !</Text>
        </View>
      </View>
    );
  }

  // ── Full profile discovery view
  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <Text style={styles.topBarTitle}>🔍 Découverte</Text>
        <View style={styles.counterPill}>
          <Text style={styles.counterText}>{availableProfiles.length} profils</Text>
        </View>
      </View>

      {/* Scrollable full profile */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header card */}
        <View style={styles.headerCard}>
          <View style={styles.headerRow}>
            <ProfileAvatar emoji={profile.avatarEmoji} bg={profile.avatarBg} />
            <View style={styles.headerInfo}>
              <View style={styles.nameRow}>
                <Text style={styles.nameText}>{profile.name}</Text>
                <View style={styles.agePill}>
                  <Text style={styles.ageText}>{profile.age}</Text>
                </View>
              </View>
              <View style={styles.cityRow}>
                <Text style={styles.cityText}>📍 {profile.city}</Text>
              </View>
              <View style={styles.vibePill}>
                <Text style={styles.vibeText}>{profile.mainVibe}</Text>
              </View>
              <View style={styles.descriptorsRow}>
                {profile.descriptors.map((d) => (
                  <View key={d} style={styles.descriptorPill}>
                    <Text style={styles.descriptorText}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
          <CompatBadge value={profile.compatibility} />
        </View>

        {/* ── Tags */}
        <Tags tags={profile.tags} />

        {/* ── Quote */}
        <Quote quote={profile.quote} />

        {/* ── Journal sections */}
        {profile.sections.map((s) => (
          <Section key={s.title} section={s} />
        ))}

        {/* ── Game progression */}
        <GameSection game={profile.game} />

        {/* ── Reveal system */}
        <RevealCard letters={profile.letters} />

        {/* Bottom padding above fixed action bar */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed action bar */}
      <View style={[styles.actionBar, { paddingBottom: insets.bottom + 8 }]}>
        <TouchableOpacity style={styles.passBtn} onPress={handlePass} activeOpacity={0.85}>
          <Text style={styles.actionEmoji}>😬</Text>
          <Text style={[styles.actionLabel, { color: '#E53935' }]}>Passer</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.giftBtn} activeOpacity={0.85}>
          <Text style={styles.actionEmoji}>🎁</Text>
          <Text style={[styles.actionLabel, { color: '#F57F17' }]}>Cadeau</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.smileBtn} onPress={handleSmile} activeOpacity={0.85}>
          <Text style={styles.actionEmoji}>😊</Text>
          <Text style={[styles.actionLabel, { color: '#2E7D32' }]}>Sourire</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8E7' },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0C8',
  },
  topBarTitle: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  counterPill: {
    backgroundColor: '#F3E5C8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  counterText: { fontSize: 12, fontWeight: '600', color: '#8B6F47' },

  // Scroll
  scroll: { flex: 1 },
  scrollContent: { padding: 14, gap: 10 },

  // Avatar
  avatarBox: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarEmoji: { fontSize: 40 },

  // Header card
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    gap: 12,
  },
  headerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  headerInfo: { flex: 1, gap: 5 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  nameText: { fontSize: 22, fontWeight: '800', color: '#3A2818' },
  agePill: { backgroundColor: '#F3E5C8', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  ageText: { fontSize: 14, fontWeight: '700', color: '#5D4037' },
  cityRow: {},
  cityText: { fontSize: 13, color: '#8B6F47', fontWeight: '500' },
  vibePill: { backgroundColor: '#FCE4EC', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  vibeText: { fontSize: 12, color: '#C2185B', fontWeight: '600' },
  descriptorsRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  descriptorPill: { backgroundColor: '#EDE7F6', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  descriptorText: { fontSize: 11, color: '#6A1B9A', fontWeight: '500' },

  // Compat badge
  compatBadge: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  compatText: { fontSize: 13, fontWeight: '600' },

  // Tags
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFF',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: '#EDE0C8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tagEmoji: { fontSize: 13 },
  tagLabel: { fontSize: 12, color: '#5D4037', fontWeight: '500' },

  // Quote
  quoteCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  quoteAccent: { width: 3, borderRadius: 3, backgroundColor: '#E91E63', alignSelf: 'stretch', minHeight: 36 },
  quoteText: { flex: 1, fontSize: 14, color: '#3A2818', fontStyle: 'italic', lineHeight: 21 },

  // Section
  sectionCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 10 },
  sectionIcon: { fontSize: 15 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#3A2818', letterSpacing: 0.5, textTransform: 'uppercase' },
  sectionItems: { gap: 7 },
  sectionItem: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  sectionBullet: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#E91E63' },
  sectionItemText: { fontSize: 13, color: '#5D4037' },

  // Game
  gameCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  gameCardLabel: { fontSize: 10, fontWeight: '700', color: '#B8A082', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 12 },
  gameRow: { flexDirection: 'row', alignItems: 'center' },
  gameStat: { flex: 1, alignItems: 'center', gap: 2 },
  gameIcon: { fontSize: 18 },
  gameValue: { fontSize: 12, fontWeight: '700', color: '#3A2818' },
  gameLabel: { fontSize: 10, color: '#B8A082' },
  gameDivider: { width: 1, height: 36, backgroundColor: '#EDE0C8' },

  // Reveal
  revealCard: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  revealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  revealTitle: { fontSize: 13, fontWeight: '700', color: '#3A2818' },
  revealBadge: { borderRadius: 8, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3 },
  revealBadgeText: { fontSize: 11, fontWeight: '700' },
  progressBg: { height: 7, backgroundColor: '#EDE0C8', borderRadius: 4, overflow: 'hidden', marginBottom: 7 },
  progressFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 14 },
  progressCount: { fontSize: 11, color: '#5D4037', fontWeight: '600' },
  progressNext: { fontSize: 11, color: '#8B6F47' },
  milestonesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  milestone: { alignItems: 'center', gap: 3 },
  milestoneDot: { width: 9, height: 9, borderRadius: 5 },
  milestoneDotEmpty: { backgroundColor: '#EDE0C8' },
  milestoneLabel: { fontSize: 9, color: '#B8A082', fontWeight: '500' },

  // Fixed action bar
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#EDE0C8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 8,
  },
  passBtn: {
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
  },
  smileBtn: {
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    width: 76,
    height: 76,
    borderRadius: 38,
    justifyContent: 'center',
  },
  giftBtn: {
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 10, fontWeight: '600', marginTop: 3 },

  // Match overlay
  matchScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#E91E63' },
  matchEmoji: { fontSize: 80 },
  matchTitle: { fontSize: 32, fontWeight: '700', color: '#FFF', marginTop: 20 },
  matchName: { fontSize: 18, color: '#FFF', marginTop: 8, opacity: 0.9 },

  // Empty
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyEmoji: { fontSize: 60, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', color: '#3A2818' },
  emptySubtext: { fontSize: 14, color: '#8B6F47', marginTop: 8 },
});
