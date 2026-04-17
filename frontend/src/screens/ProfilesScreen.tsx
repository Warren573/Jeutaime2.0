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
import { AvatarDefinition } from '../avatar/types/avatarTypes';
import { MOCK_PROFILE_AVATARS } from '../avatar/data/mockAvatars';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface DiscoveryProfile {
  id: string;
  name: string;
  age: number;
  city: string;
  avatarEmoji: string;
  avatarBg: string;
  avatarDef?: AvatarDefinition;
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
    avatarDef: MOCK_PROFILE_AVATARS['p1'],
    mainVibe: 'Romantique curieuse',
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
      { title: 'Mon univers', icon: '✦', items: ['Voyages lointains', 'Cinéma d\'auteur', 'Cuisine du monde'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Avec présence', 'En douceur', 'Par les détails'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['Je ris facilement', 'J\'écoute vraiment', 'Je me souviens de tout'] },
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
    avatarDef: MOCK_PROFILE_AVATARS['p2'],
    mainVibe: 'Artiste libre',
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
      { title: 'Mon univers', icon: '✦', items: ['Peinture', 'Jazz & soul', 'Littérature contemporaine'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Avec intensité', 'De façon créative', 'Sans retenue'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['Je provoque doucement', 'Je crée des ambiances', 'Je reste mystérieuse'] },
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
    avatarDef: MOCK_PROFILE_AVATARS['p3'],
    mainVibe: 'Sportive gourmande',
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
      { title: 'Mon univers', icon: '✦', items: ['Sport & mer', 'Gastronomie locale', 'Voyages spontanés'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Avec énergie', 'Franchement', 'En riant beaucoup'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['Je lance les défis', 'Je mets l\'ambiance', 'Je ne triche pas'] },
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
    avatarDef: MOCK_PROFILE_AVATARS['p4'],
    mainVibe: 'Âme musicale',
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
      { title: 'Mon univers', icon: '✦', items: ['Concerts & scènes', 'Vins du Sud-Ouest', 'Danse improvisée'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Avec des chansons', 'Lentement', 'Avec des surprises'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['Je chante parfois', 'Je teste les gens', 'Je garde un secret'] },
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
    avatarDef: MOCK_PROFILE_AVATARS['p5'],
    mainVibe: 'Intellectuelle discrète',
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
      { title: 'Mon univers', icon: '✦', items: ['Romans & essais', 'Théâtre amateur', 'Débats de fond'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Par les mots', 'Avec profondeur', 'En observant d\'abord'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['Je pose les vraies questions', 'Je décrypte les sous-textes', 'Je ris en dernier mais plus fort'] },
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
    avatarDef: MOCK_PROFILE_AVATARS['p6'],
    mainVibe: 'Nature & sérénité',
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
      { title: 'Mon univers', icon: '✦', items: ['Randonnées & nature', 'Photographie argentique', 'Yoga & silence'] },
      { title: 'Ma manière d\'aimer', icon: '✦', items: ['Avec calme', 'En pleine nature', 'Par la présence'] },
      { title: 'Ma présence dans les salons', icon: '✦', items: ['J\'observe les dynamiques', 'Je parle peu mais juste', 'Je rends le calme contagieux'] },
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
  { threshold: 10, label: 'Révélé',     color: '#8B1A1A' },
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

// ─── NEWSPAPER RULE ──────────────────────────────────────────────────────────

function Rule({ thick = false, style }: { thick?: boolean; style?: object }) {
  return (
    <View
      style={[
        { height: thick ? 2 : 1, backgroundColor: thick ? INK : RULE_COLOR },
        style,
      ]}
    />
  );
}

function DoubleRule({ style }: { style?: object }) {
  return (
    <View style={[{ gap: 3 }, style]}>
      <View style={{ height: 2, backgroundColor: INK }} />
      <View style={{ height: 1, backgroundColor: INK }} />
    </View>
  );
}

// ─── CONSTANTS ────────────────────────────────────────────────────────────────

const PAPER    = '#FDFAF0';   // papier blanc-crème
const OLD_BG   = '#EDE3C8';   // fond parchemin
const INK      = '#1A0A00';   // encre sombre
const INK2     = '#4A2C18';   // encre secondaire
const INK3     = '#8B6F47';   // encre tertiaire
const RULE_COLOR = '#C4A882'; // trait de séparation
const RED_INK  = '#8B1A1A';   // accent rouge journal

// ─── SUB-COMPONENTS ──────────────────────────────────────────────────────────

/** Manchette — en-tête de journal */
function Masthead({
  index,
  total,
}: {
  index: number;
  total: number;
}) {
  return (
    <View style={np.masthead}>
      <Text style={np.mastheadSub}>❧ Édition du jour ❧</Text>
      <Text style={np.mastheadTitle}>LE PROFIL</Text>
      <DoubleRule />
      <View style={np.mastheadMeta}>
        <Text style={np.mastheadMetaText}>Découverte</Text>
        <Text style={np.mastheadMetaText}>No. {index + 1}/{total}</Text>
      </View>
    </View>
  );
}

function ProfileHero({ profile }: { profile: DiscoveryProfile }) {
  return (
    <View style={np.heroWrap}>
      {/* Identité */}
      <View style={np.heroRow}>
        <View style={np.polaroid}>
          <Avatar size={92} {...DEFAULT_AVATAR} />
        </View>
        <View style={np.heroContent}>
          <Text style={np.heroName}>{profile.name}, {profile.age}</Text>
          <Text style={np.heroSwash}>〜〜〜〜〜〜〜</Text>
          <Text style={np.heroVibe}>{profile.mainVibe}</Text>
        </View>
      </View>

      {/* Bla-bla — élément principal, pleine largeur */}
      <Text style={np.heroQuote}>"{profile.quote}"</Text>

      {/* Lien discret */}
      <TouchableOpacity activeOpacity={0.6}>
        <Text style={np.discoverLink}>Découvrir le profil →</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Tags — tampons style cachet */
function Stamps({ tags }: { tags: DiscoveryProfile['tags'] }) {
  return (
    <View style={np.section}>
      <Text style={np.sectionLabel}>— Caractéristiques —</Text>
      <View style={np.stampsWrap}>
        {tags.map((t) => (
          <View key={t.label} style={np.stamp}>
            <Text style={np.stampEmoji}>{t.emoji}</Text>
            <Text style={np.stampText}>{t.label.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Citation — encadré à la une */
function PullQuote({ quote }: { quote: string }) {
  return (
    <View style={np.pullQuoteWrap}>
      <Rule />
      <Text style={np.pullQuoteGuillemet}>«</Text>
      <Text style={np.pullQuoteText}>{quote}</Text>
      <Text style={[np.pullQuoteGuillemet, np.pullQuoteGuillemetsClose]}>»</Text>
      <Rule />
    </View>
  );
}

/** Section — colonne de journal */
function Column({ section }: { section: DiscoveryProfile['sections'][0] }) {
  return (
    <View style={np.column}>
      <DoubleRule />
      <Text style={np.columnTitle}>
        {section.icon}  {section.title.toUpperCase()}
      </Text>
      <Rule />
      <View style={np.columnItems}>
        {section.items.map((item, i) => (
          <Text key={i} style={np.columnItem}>
            — {item}
          </Text>
        ))}
      </View>
    </View>
  );
}

/** Progression — encadré jeu */
function ProgressBox({ game }: { game: DiscoveryProfile['game'] }) {
  return (
    <View style={np.infoBox}>
      <DoubleRule />
      <Text style={np.infoBoxTitle}>◆ FICHE DE JEU</Text>
      <Rule />
      <View style={np.infoBoxRow}>
        <View style={np.infoBoxCell}>
          <Text style={np.infoBoxLabel}>NIVEAU</Text>
          <Text style={np.infoBoxValue}>{game.level}</Text>
        </View>
        <View style={np.infoBoxDivider} />
        <View style={[np.infoBoxCell, { flex: 2 }]}>
          <Text style={np.infoBoxLabel}>DISTINCTIONS</Text>
          <Text style={np.infoBoxValue} numberOfLines={2}>
            {game.badges.join(' · ')}
          </Text>
        </View>
        <View style={np.infoBoxDivider} />
        <View style={np.infoBoxCell}>
          <Text style={np.infoBoxLabel}>ANIMAL</Text>
          <Text style={np.infoBoxValue}>
            {game.petEmoji} {game.pet}
          </Text>
        </View>
      </View>
    </View>
  );
}

/** Courrier — état des lettres */
function MailSection({ letters }: { letters: DiscoveryProfile['letters'] }) {
  const { current, next } = getRevealState(letters.exchanged);
  const progress = Math.min(letters.exchanged / letters.total, 1);
  const remaining = next ? next.threshold - letters.exchanged : 0;
  return (
    <View style={np.infoBox}>
      <DoubleRule />
      <View style={np.mailHeader}>
        <Text style={np.infoBoxTitle}>◆ COURRIER CONFIDENTIEL</Text>
        <View
          style={[
            np.statusStamp,
            { borderColor: current.color },
          ]}
        >
          <Text style={[np.statusStampText, { color: current.color }]}>
            {current.label.toUpperCase()}
          </Text>
        </View>
      </View>
      <Rule />
      <View style={np.progressRail}>
        <View
          style={[
            np.progressFill,
            { width: `${progress * 100}%` as any, backgroundColor: current.color },
          ]}
        />
      </View>
      <View style={np.progressLabels}>
        <Text style={np.progressCount}>
          {letters.exchanged} / {letters.total} lettres échangées
        </Text>
        {next && (
          <Text style={np.progressNext}>
            {remaining} lettre{remaining > 1 ? 's' : ''} → {next.label}
          </Text>
        )}
      </View>
      <View style={np.milestonesRow}>
        {REVEAL_MILESTONES.map((m) => {
          const reached = letters.exchanged >= m.threshold;
          return (
            <View key={m.label} style={np.milestone}>
              <View
                style={[
                  np.milestoneDot,
                  { backgroundColor: reached ? m.color : '#C4A882' },
                ]}
              />
              <Text
                style={[
                  np.milestoneLabel,
                  reached && { color: m.color, fontWeight: '700' },
                ]}
              >
                {m.label.toUpperCase()}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── MAIN SCREEN ─────────────────────────────────────────────────────────────

export default function ProfilesScreen() {
  const insets = useSafeAreaInsets();
  const { likedProfiles, dislikedProfiles, addLike, addDislike, addMatch, currentUser } = useStore();
  const screenBg = useStore(s => s.screenBackgrounds?.['profiles'] ?? OLD_BG);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showMatch, setShowMatch] = useState<string | null>(null);

  const availableProfiles = profiles.filter(
    (p) => !likedProfiles.includes(p.id) && !dislikedProfiles.includes(p.id)
  );
  const profile = availableProfiles[currentIndex % Math.max(availableProfiles.length, 1)];
  const profilePos = profiles.findIndex(p => p.id === profile?.id);

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
      <View style={[np.matchScreen, { paddingTop: insets.top }]}>
        <Text style={np.matchEmoji}>💕</Text>
        <Text style={np.matchTitle}>C'EST UN MATCH !</Text>
        <Text style={np.matchName}>Vous et {showMatch}</Text>
      </View>
    );
  }

  // ── Empty state
  if (!profile || availableProfiles.length === 0) {
    return (
      <View style={[np.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        <Masthead index={0} total={0} />
        <View style={np.emptyState}>
          <Text style={np.emptyEmoji}>○</Text>
          <Text style={np.emptyTitle}>AUCUN PROFIL</Text>
          <Text style={np.emptyText}>Revenez dans la prochaine édition.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[np.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      <ScrollView
        style={np.scroll}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        <ProfileHero profile={profile} />
      </ScrollView>

      {/* Barre d'actions */}
      <View style={[np.actionBar, { paddingBottom: insets.bottom + 6 }]}>
        <TouchableOpacity style={np.actionBtn} onPress={handleSmile} activeOpacity={0.8}>
          <Text style={np.actionEmoji}>😊</Text>
          <Text style={[np.actionLabel, { color: '#2E5D2A' }]}>Sourire</Text>
        </TouchableOpacity>

        <TouchableOpacity style={np.actionBtn} onPress={handlePass} activeOpacity={0.8}>
          <Text style={np.actionEmoji}>😬</Text>
          <Text style={[np.actionLabel, { color: INK2 }]}>Grimace</Text>
        </TouchableOpacity>

        <TouchableOpacity style={np.actionBtn} activeOpacity={0.8}>
          <Text style={np.actionEmoji}>🚩</Text>
          <Text style={[np.actionLabel, { color: INK3 }]}>Signaler</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── STYLES JOURNAL PAPIER ────────────────────────────────────────────────────

const np = StyleSheet.create({
  screen: { flex: 1, backgroundColor: OLD_BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 12, gap: 0 },

  // ── Manchette ──────────────────────────────────────────────────────────────
  masthead: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE_COLOR,
    padding: 14,
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  mastheadSub: {
    fontSize: 10,
    color: INK3,
    letterSpacing: 2,
    fontStyle: 'italic',
  },
  mastheadTitle: {
    fontSize: 32,
    fontWeight: '900',
    color: INK,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  mastheadMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  mastheadMetaText: {
    fontSize: 9,
    color: INK3,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },

  // ── Hero ───────────────────────────────────────────────────────────────────
  heroWrap: {
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 16,
    gap: 22,
  },
  heroRow: {
    flexDirection: 'row',
    gap: 18,
    alignItems: 'center',
  },
  polaroid: {
    backgroundColor: '#fff',
    padding: 6,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 10,
    shadowOffset: { width: 1, height: 4 },
    elevation: 5,
  },
  heroContent: {
    flex: 1,
    gap: 5,
  },
  heroName: {
    fontSize: 26,
    fontWeight: '800',
    color: INK,
    lineHeight: 30,
  },
  heroSwash: {
    fontSize: 12,
    color: INK3,
    letterSpacing: 2,
  },
  heroVibe: {
    fontSize: 13,
    color: INK2,
    fontStyle: 'italic',
    lineHeight: 19,
  },
  heroQuote: {
    fontSize: 19,
    color: INK,
    fontStyle: 'italic',
    lineHeight: 31,
    paddingVertical: 6,
  },
  discoverLink: {
    fontSize: 14,
    color: INK3,
    fontStyle: 'italic',
    letterSpacing: 0.3,
    alignSelf: 'flex-end',
  },

  // ── Tampons ────────────────────────────────────────────────────────────────
  section: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE_COLOR,
    padding: 14,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 9,
    color: INK3,
    letterSpacing: 2,
    textAlign: 'center',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  stampsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'center',
  },
  stamp: {
    borderWidth: 1.5,
    borderColor: INK,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
    gap: 2,
  },
  stampEmoji: { fontSize: 16 },
  stampText: {
    fontSize: 8,
    fontWeight: '700',
    color: INK,
    letterSpacing: 1.5,
  },

  // ── Citation ───────────────────────────────────────────────────────────────
  pullQuoteWrap: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE_COLOR,
    padding: 16,
    marginBottom: 10,
    alignItems: 'center',
    gap: 4,
  },
  pullQuoteGuillemet: {
    fontSize: 40,
    color: RED_INK,
    fontWeight: '900',
    lineHeight: 40,
    marginBottom: -4,
  },
  pullQuoteGuillemetsClose: {
    alignSelf: 'flex-end',
    marginTop: -4,
  },
  pullQuoteText: {
    fontSize: 15,
    color: INK,
    fontStyle: 'italic',
    textAlign: 'center',
    lineHeight: 23,
    paddingHorizontal: 8,
  },

  // ── Colonnes ───────────────────────────────────────────────────────────────
  column: {
    backgroundColor: PAPER,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: RULE_COLOR,
    padding: 14,
    marginBottom: 8,
    gap: 6,
  },
  columnTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: INK,
    letterSpacing: 2,
    marginVertical: 6,
  },
  columnItems: { gap: 5 },
  columnItem: {
    fontSize: 13,
    color: INK2,
    lineHeight: 20,
  },

  // ── Encadré infos ──────────────────────────────────────────────────────────
  infoBox: {
    backgroundColor: PAPER,
    borderWidth: 1,
    borderColor: RULE_COLOR,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  infoBoxTitle: {
    fontSize: 9,
    fontWeight: '900',
    color: INK,
    letterSpacing: 2,
  },
  infoBoxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoBoxCell: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  infoBoxDivider: {
    width: 1,
    height: 32,
    backgroundColor: RULE_COLOR,
  },
  infoBoxLabel: {
    fontSize: 7,
    color: INK3,
    letterSpacing: 1.5,
    fontWeight: '700',
  },
  infoBoxValue: {
    fontSize: 12,
    fontWeight: '700',
    color: INK,
    textAlign: 'center',
  },

  // ── Courrier ───────────────────────────────────────────────────────────────
  mailHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusStamp: {
    borderWidth: 1.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusStampText: {
    fontSize: 8,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  progressRail: {
    height: 5,
    backgroundColor: '#DDD0B8',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressCount: { fontSize: 10, color: INK2, fontWeight: '600' },
  progressNext: { fontSize: 10, color: INK3, fontStyle: 'italic' },
  milestonesRow: { flexDirection: 'row', justifyContent: 'space-between' },
  milestone: { alignItems: 'center', gap: 3 },
  milestoneDot: { width: 8, height: 8, borderRadius: 4 },
  milestoneLabel: { fontSize: 7, color: INK3, letterSpacing: 1 },

  // ── Pied de page ──────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 10,
  },
  footerText: {
    fontSize: 9,
    color: INK3,
    fontStyle: 'italic',
    letterSpacing: 1,
  },

  // ── Barre d'actions ────────────────────────────────────────────────────────
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: PAPER,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: RULE_COLOR,
  },
  actionBtn: {
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  actionEmoji: { fontSize: 28 },
  actionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.3 },

  // ── Match overlay ──────────────────────────────────────────────────────────
  matchScreen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: RED_INK },
  matchEmoji: { fontSize: 80 },
  matchTitle: { fontSize: 28, fontWeight: '900', color: PAPER, marginTop: 20, letterSpacing: 3 },
  matchName: { fontSize: 16, color: PAPER, marginTop: 10, opacity: 0.9, fontStyle: 'italic' },

  // ── État vide ──────────────────────────────────────────────────────────────
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 10 },
  emptyEmoji: { fontSize: 48, color: INK3 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: INK, letterSpacing: 3 },
  emptyText: { fontSize: 13, color: INK3, fontStyle: 'italic', textAlign: 'center' },
});
