import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useStore } from '../store/useStore';
import { AvatarDefinition } from '../avatar/types/avatarTypes';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../avatar/png/defaults';
import { getPublicProfile, PublicProfileResponse } from '../api/profiles';
import type { MatchDTO } from '../api/matches';

const { width } = Dimensions.get('window');

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface JournalSection {
  title: string;
  icon: string;
  items: string[];
}

interface ProfileData {
  id: string;
  name: string;
  age: number;
  city: string;
  mainVibe: string;
  descriptors: string[];
  avatarEmoji: string;
  avatarBg: string;
  avatarDef?: AvatarDefinition;
  tags: { emoji: string; label: string }[];
  quote: string;
  sections: JournalSection[];
  game: {
    level: number;
    badges: string[];
    pet: string;
    petEmoji: string;
  };
  letters: {
    exchanged: number;
    total: number;
    lastLetterDaysAgo: number;
    nextReveal: number;
  };
}

// ─── DATA HELPERS ─────────────────────────────────────────────────────────────

function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const bd = new Date(birthDate);
  if (isNaN(bd.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  if (
    now.getMonth() < bd.getMonth() ||
    (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())
  ) age--;
  return age;
}

const TAG_EMOJIS = ['✨', '💫', '🌟', '💎', '🔥', '🌸', '⚡', '🦋', '🎭', '🎯'];

function mapApiToProfileData(
  data: PublicProfileResponse,
  match?: MatchDTO,
): ProfileData {
  const p = data.profile;

  const myCount = match
    ? (match.currentUserSide === 'A' ? match.letterCountA : match.letterCountB)
    : 0;
  const theirCount = match
    ? (match.currentUserSide === 'A' ? match.letterCountB : match.letterCountA)
    : 0;
  const totalExchanged = myCount + theirCount;

  const lastAt = match?.lastLetterAt ? new Date(match.lastLetterAt) : null;
  const lastLetterDaysAgo = lastAt
    ? Math.max(0, Math.floor((Date.now() - lastAt.getTime()) / 86_400_000))
    : 0;

  const nextMilestone = REVEAL_MILESTONES.find((m) => m.threshold > totalExchanged);
  const nextReveal = nextMilestone ? nextMilestone.threshold - totalExchanged : 0;

  const sections: JournalSection[] = [];
  if ((p.interests ?? []).length > 0)
    sections.push({ title: 'Mon univers', icon: '🌐', items: p.interests! });
  if ((p.idealDay ?? []).length > 0)
    sections.push({ title: 'Ma journée idéale', icon: '☀️', items: p.idealDay! });
  if ((p.defaults ?? []).length > 0)
    sections.push({ title: 'Mes défauts (assumés)', icon: '🙈', items: p.defaults! });

  return {
    id: p.id,
    name: p.pseudo ?? 'Inconnu',
    age: calcAge(p.birthDate),
    city: p.city ?? 'Inconnue',
    mainVibe: p.vibe ?? '',
    descriptors: (p.qualities ?? []).slice(0, 3),
    avatarEmoji: '✨',
    avatarBg: '#F3E5F5',
    tags: (p.identityTags ?? []).map((label, i) => ({
      emoji: TAG_EMOJIS[i % TAG_EMOJIS.length],
      label,
    })),
    quote: p.quote ?? '',
    sections,
    game: {
      level: Math.max(1, Math.floor((p.points ?? 0) / 200) + 1),
      badges: (p.badges ?? []).slice(0, 2),
      pet: '—',
      petEmoji: '🐾',
    },
    letters: {
      exchanged: totalExchanged,
      total: 10,
      lastLetterDaysAgo,
      nextReveal,
    },
  };
}

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

// ─── HEADER ────────────────────────────────────────────────────────────────────

function ProfileHeader({ profile }: { profile: ProfileData }) {
  return (
    <View style={styles.headerCard}>
      <View style={styles.headerRow}>
        {/* LEFT: avatar */}
        <Avatar size={88} {...DEFAULT_AVATAR} />

        {/* RIGHT: identity block */}
        <View style={styles.headerInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.nameText}>{profile.name}</Text>
            <View style={styles.agePill}>
              <Text style={styles.ageText}>{profile.age}</Text>
            </View>
          </View>
          <View style={styles.cityRow}>
            <Text style={styles.cityDot}>📍</Text>
            <Text style={styles.cityText}>{profile.city}</Text>
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
    </View>
  );
}

// ─── TAGS ──────────────────────────────────────────────────────────────────────

function ProfileTags({ tags }: { tags: ProfileData['tags'] }) {
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

// ─── QUOTE ─────────────────────────────────────────────────────────────────────

function ProfileQuote({ quote }: { quote: string }) {
  return (
    <View style={styles.quoteCard}>
      <View style={styles.quoteAccent} />
      <Text style={styles.quoteText}>« {quote} »</Text>
    </View>
  );
}

// ─── SECTION ───────────────────────────────────────────────────────────────────

function ProfileSection({ section }: { section: JournalSection }) {
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

// ─── GAME SECTION ──────────────────────────────────────────────────────────────

function ProfileGameSection({ game }: { game: ProfileData['game'] }) {
  return (
    <View style={styles.gameCard}>
      <Text style={styles.gameCardTitle}>Progression</Text>
      <View style={styles.gameRow}>
        {/* Level */}
        <View style={styles.gameStat}>
          <Text style={styles.gameStatIcon}>⭐</Text>
          <Text style={styles.gameStatValue}>Niv. {game.level}</Text>
          <Text style={styles.gameStatLabel}>Niveau</Text>
        </View>
        {/* Badges */}
        <View style={styles.gameStatDivider} />
        <View style={[styles.gameStat, { flex: 2 }]}>
          <Text style={styles.gameStatIcon}>🏅</Text>
          <Text style={styles.gameStatValue} numberOfLines={1}>
            {game.badges.join(' · ')}
          </Text>
          <Text style={styles.gameStatLabel}>Badges</Text>
        </View>
        {/* Pet */}
        <View style={styles.gameStatDivider} />
        <View style={styles.gameStat}>
          <Text style={styles.gameStatIcon}>{game.petEmoji}</Text>
          <Text style={styles.gameStatValue}>{game.pet}</Text>
          <Text style={styles.gameStatLabel}>Animal</Text>
        </View>
      </View>
    </View>
  );
}

// ─── REVEAL PROGRESS CARD ─────────────────────────────────────────────────────

function RevealProgressCard({ letters }: { letters: ProfileData['letters'] }) {
  const { current, next } = getRevealState(letters.exchanged);
  const progress = Math.min(letters.exchanged / letters.total, 1);
  const remaining = next ? next.threshold - letters.exchanged : 0;

  return (
    <View style={styles.revealCard}>
      {/* Header */}
      <View style={styles.revealHeader}>
        <View style={[styles.revealStateBadge, { backgroundColor: current.color + '20', borderColor: current.color + '40' }]}>
          <Text style={[styles.revealStateText, { color: current.color }]}>{current.label}</Text>
        </View>
        <Text style={styles.revealTitle}>Photos cachées</Text>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${progress * 100}%`, backgroundColor: current.color }]} />
      </View>
      <View style={styles.progressLabels}>
        <Text style={styles.progressCount}>{letters.exchanged} / {letters.total} lettres</Text>
        {next && (
          <Text style={styles.progressNext}>
            {remaining} {remaining === 1 ? 'lettre' : 'lettres'} → {next.label}
          </Text>
        )}
      </View>

      {/* Milestones row */}
      <View style={styles.milestonesRow}>
        {REVEAL_MILESTONES.map((m) => {
          const reached = letters.exchanged >= m.threshold;
          return (
            <View key={m.label} style={styles.milestone}>
              <View style={[
                styles.milestoneDot,
                reached ? { backgroundColor: m.color } : styles.milestoneDotEmpty,
              ]} />
              <Text style={[styles.milestoneLabel, reached && { color: m.color, fontWeight: '600' }]}>
                {m.label}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── LETTERS SECTION ───────────────────────────────────────────────────────────

function LettersSection({ letters }: { letters: ProfileData['letters'] }) {
  const { current } = getRevealState(letters.exchanged);
  return (
    <View style={styles.lettersCard}>
      <Text style={styles.lettersTitle}>💌 Correspondance</Text>
      <View style={styles.lettersStats}>
        <View style={styles.lettersStat}>
          <Text style={styles.lettersStatValue}>{letters.exchanged}</Text>
          <Text style={styles.lettersStatLabel}>Lettres échangées</Text>
        </View>
        <View style={styles.lettersStatDivider} />
        <View style={styles.lettersStat}>
          <Text style={styles.lettersStatValue}>{letters.nextReveal}</Text>
          <Text style={styles.lettersStatLabel}>Prochain réveil</Text>
        </View>
        <View style={styles.lettersStatDivider} />
        <View style={styles.lettersStat}>
          <Text style={styles.lettersStatValue}>
            {letters.lastLetterDaysAgo === 0 ? 'Auj.' : `J-${letters.lastLetterDaysAgo}`}
          </Text>
          <Text style={styles.lettersStatLabel}>Dernière lettre</Text>
        </View>
      </View>
      <View style={[styles.relationState, { borderColor: current.color + '50', backgroundColor: current.color + '0D' }]}>
        <Text style={[styles.relationStateText, { color: current.color }]}>
          Relation : {current.label}
        </Text>
      </View>
    </View>
  );
}

// ─── WRITE LETTER BUTTON ────────────────────────────────────────────────────────

function WriteLetterButton({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.writeLetterBtn} onPress={onPress} activeOpacity={0.85}>
      <Text style={styles.writeLetterIcon}>✉️</Text>
      <Text style={styles.writeLetterText}>Écrire une lettre</Text>
    </TouchableOpacity>
  );
}

// ─── LETTER MODAL ─────────────────────────────────────────────────────────────

function LetterModal({
  visible,
  recipientName,
  onClose,
  onSend,
}: {
  visible: boolean;
  recipientName: string;
  onClose: () => void;
  onSend: (text: string) => void;
}) {
  const [text, setText] = useState('');
  const MIN = 30;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalBg}>
        <View style={styles.modalBox}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>✉️ À {recipientName}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.modalHint}>
            Vos lettres construisent votre relation — {text.length}/{MIN} min.
          </Text>
          <TextInput
            style={styles.letterInput}
            placeholder="Chère Zoé, je voulais te dire…"
            placeholderTextColor="#B8A082"
            multiline
            numberOfLines={6}
            value={text}
            onChangeText={setText}
            textAlignVertical="top"
          />
          <TouchableOpacity
            style={[styles.sendBtn, text.length < MIN && styles.sendBtnDisabled]}
            onPress={() => {
              if (text.length >= MIN) { onSend(text); setText(''); onClose(); }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.sendBtnText}>Envoyer la lettre</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────────

export default function ProfileDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [showLetterModal, setShowLetterModal] = useState(false);
  const [apiData, setApiData] = useState<PublicProfileResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const screenBg = useStore((s) => s.screenBackgrounds?.['profile_detail'] ?? '#FFF8E7');
  const apiMatches = useStore((s) => s.apiMatches);
  const sendApiLetter = useStore((s) => s.sendApiLetter);

  useEffect(() => {
    if (!id) {
      setLoadError('Profil introuvable');
      setIsLoading(false);
      return;
    }
    getPublicProfile(id)
      .then((data) => { setApiData(data); setIsLoading(false); })
      .catch((err: unknown) => {
        setLoadError(err instanceof Error ? err.message : 'Profil introuvable');
        setIsLoading(false);
      });
  }, [id]);

  const match = apiData
    ? apiMatches.find((m) => m.otherUserId === apiData.profile.userId)
    : undefined;
  const profile = apiData ? mapApiToProfileData(apiData, match) : null;

  const topBar = (
    <View style={styles.topBar}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Text style={styles.backArrow}>←</Text>
      </TouchableOpacity>
      <Text style={styles.topBarTitle}>Profil</Text>
      <View style={{ width: 36 }} />
    </View>
  );

  if (isLoading) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg, alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  if (loadError || !profile || !apiData) {
    return (
      <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
        {topBar}
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
          <Text style={{ fontSize: 16, color: '#8B6F47', textAlign: 'center' }}>
            {loadError ?? 'Profil introuvable'}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top, backgroundColor: screenBg }]}>
      {topBar}

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Header */}
        <ProfileHeader profile={profile} />

        {/* 2. Identity tags */}
        {profile.tags.length > 0 && (
          <View style={styles.section}>
            <ProfileTags tags={profile.tags} />
          </View>
        )}

        {/* 3. Quote */}
        {profile.quote.length > 0 && (
          <View style={styles.section}>
            <ProfileQuote quote={profile.quote} />
          </View>
        )}

        {/* 4. Journal sections */}
        {profile.sections.length > 0 && (
          <View style={styles.sectionsGrid}>
            {profile.sections.map((s) => (
              <ProfileSection key={s.title} section={s} />
            ))}
          </View>
        )}

        {/* 5. Game progression */}
        <View style={styles.section}>
          <ProfileGameSection game={profile.game} />
        </View>

        {/* 6. Letter system — only shown when a match exists */}
        {match && (
          <>
            <View style={styles.section}>
              <RevealProgressCard letters={profile.letters} />
            </View>
            <View style={styles.section}>
              <LettersSection letters={profile.letters} />
            </View>
            <View style={[styles.section, { paddingBottom: 8 }]}>
              <WriteLetterButton onPress={() => setShowLetterModal(true)} />
            </View>
          </>
        )}
      </ScrollView>

      {match && (
        <LetterModal
          visible={showLetterModal}
          recipientName={profile.name}
          onClose={() => setShowLetterModal(false)}
          onSend={async (text) => {
            try {
              await sendApiLetter(match.id, text);
            } catch {
              // Error surfaced by store
            }
          }}
        />
      )}
    </View>
  );
}

// ─── STYLES ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FFF8E7',
  },

  // ── Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0C8',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E5C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: {
    fontSize: 18,
    color: '#3A2818',
    fontWeight: '600',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3A2818',
    letterSpacing: 0.3,
  },

  // ── Scroll
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16 },
  section: { marginBottom: 12 },

  // ── Avatar
  avatarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },

  // ── Header card
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'flex-start',
    gap: 6,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  nameText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3A2818',
  },
  agePill: {
    backgroundColor: '#F3E5C8',
    borderRadius: 10,
    paddingHorizontal: 9,
    paddingVertical: 2,
  },
  ageText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#5D4037',
  },
  cityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  cityDot: { fontSize: 12 },
  cityText: {
    fontSize: 13,
    color: '#8B6F47',
    fontWeight: '500',
  },
  vibePill: {
    backgroundColor: '#FCE4EC',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  vibeText: {
    fontSize: 13,
    color: '#C2185B',
    fontWeight: '600',
  },
  descriptorsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  descriptorPill: {
    backgroundColor: '#EDE7F6',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  descriptorText: {
    fontSize: 12,
    color: '#6A1B9A',
    fontWeight: '500',
  },

  // ── Tags
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#EDE0C8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  tagEmoji: { fontSize: 14 },
  tagLabel: {
    fontSize: 13,
    color: '#5D4037',
    fontWeight: '500',
  },

  // ── Quote
  quoteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  quoteAccent: {
    width: 3,
    borderRadius: 3,
    backgroundColor: '#E91E63',
    alignSelf: 'stretch',
    minHeight: 40,
  },
  quoteText: {
    flex: 1,
    fontSize: 15,
    color: '#3A2818',
    fontStyle: 'italic',
    lineHeight: 22,
    fontWeight: '400',
  },

  // ── Journal sections grid
  sectionsGrid: {
    gap: 10,
    marginBottom: 12,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionIcon: { fontSize: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A2818',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  sectionItems: { gap: 8 },
  sectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionBullet: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E91E63',
  },
  sectionItemText: {
    fontSize: 14,
    color: '#5D4037',
    fontWeight: '400',
  },

  // ── Game card
  gameCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  gameCardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B8A082',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  gameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gameStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  gameStatIcon: { fontSize: 20 },
  gameStatValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#3A2818',
  },
  gameStatLabel: {
    fontSize: 10,
    color: '#B8A082',
    fontWeight: '500',
  },
  gameStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#EDE0C8',
  },

  // ── Reveal card
  revealCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  revealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  revealTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A2818',
  },
  revealStateBadge: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  revealStateText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#EDE0C8',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  progressCount: {
    fontSize: 12,
    color: '#5D4037',
    fontWeight: '600',
  },
  progressNext: {
    fontSize: 12,
    color: '#8B6F47',
  },
  milestonesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  milestone: {
    alignItems: 'center',
    gap: 4,
  },
  milestoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  milestoneDotEmpty: {
    backgroundColor: '#EDE0C8',
  },
  milestoneLabel: {
    fontSize: 10,
    color: '#B8A082',
    fontWeight: '500',
  },

  // ── Letters card
  lettersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  lettersTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#3A2818',
    marginBottom: 14,
  },
  lettersStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  lettersStat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  lettersStatValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#3A2818',
  },
  lettersStatLabel: {
    fontSize: 11,
    color: '#B8A082',
    textAlign: 'center',
    lineHeight: 14,
  },
  lettersStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#EDE0C8',
  },
  relationState: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  relationStateText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // ── Write button
  writeLetterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#E91E63',
    borderRadius: 16,
    paddingVertical: 16,
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  writeLetterIcon: { fontSize: 20 },
  writeLetterText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // ── Letter Modal
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalBox: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
  },
  modalClose: {
    fontSize: 18,
    color: '#8B6F47',
    fontWeight: '500',
  },
  modalHint: {
    fontSize: 12,
    color: '#8B6F47',
    marginBottom: 14,
  },
  letterInput: {
    borderWidth: 1,
    borderColor: '#EDE0C8',
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    color: '#3A2818',
    height: 140,
    backgroundColor: '#FAFAF8',
    marginBottom: 16,
  },
  sendBtn: {
    backgroundColor: '#E91E63',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#EDE0C8',
  },
  sendBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
