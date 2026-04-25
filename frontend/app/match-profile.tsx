import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useStore } from '../src/store/useStore';
import { Avatar } from '../src/avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../src/avatar/png/defaults';
import { getRelationInfo } from '../src/engine/RelationEngine';

// ── Mapping pour l'affichage physique ────────────────────────
const PHYSIQUE_LABEL: Record<string, { emoji: string; label: string }> = {
  filiforme:    { emoji: '🍝', label: 'Filiforme' },
  ras_motte:    { emoji: '🐭', label: 'Ras motte' },
  grande_gigue: { emoji: '🦒', label: 'Grande gigue' },
  beaute_int:   { emoji: '✨', label: 'Grande beauté intérieure' },
  athletique:   { emoji: '🏃', label: 'Athlétique' },
  genereuse:    { emoji: '🍑', label: 'En formes généreuses' },
  moyenne:      { emoji: '⚖️', label: 'Moyenne' },
  muscle:       { emoji: '💪', label: 'Musclé·e' },
};

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation:   "J'ai vu de la lumière, je suis entré·e",
  flirt:      'Rien de trop sérieux',
  amitie:     "Des affinités, d'abord",
  discussion: 'Je cherche à discuter',
};

export default function MatchProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const { matches, letters, currentUser, matchPartners } = useStore();

  const match = matches.find(m => m.id === matchId);
  if (!match) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Retour aux lettres</Text>
        </TouchableOpacity>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Match introuvable</Text>
        </View>
      </View>
    );
  }

  const myId      = currentUser?.id ?? 'dev-local';
  const partnerId = match.userAId === myId ? match.userBId : match.userAId;
  const partner   = matchPartners?.[partnerId];

  // Nombre de lettres réelles dans la conversation
  const conv = letters.filter(l =>
    l.fromUserId === partnerId || l.toUserId === partnerId
  );
  const letterCount = conv.length;

  const isPremium = currentUser?.isPremium ?? false;
  const rel       = getRelationInfo(letterCount, isPremium);

  const physique = partner?.physicalDesc
    ? PHYSIQUE_LABEL[partner.physicalDesc] ?? { emoji: '✨', label: partner.physicalDesc }
    : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header navigation ── */}
      <View style={styles.navBar}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Lettres</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {partner?.pseudo ?? partnerId}
        </Text>
        <View style={{ width: 80 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Hero : photo/avatar + niveau ── */}
        <View style={styles.hero}>
          <View style={styles.photoWrap}>
            {rel.photoVisibility === 'avatar' || !partner?.mainPhotoUri ? (
              <Avatar size={110} {...DEFAULT_AVATAR} />
            ) : (
              <Image
                source={{ uri: partner.mainPhotoUri }}
                style={styles.photo}
                contentFit="cover"
                blurRadius={rel.photoVisibility === 'blurred' ? 20 : 0}
              />
            )}
            {/* Scotch décoratif */}
            <View style={styles.tape} />
          </View>

          <View style={styles.heroText}>
            <Text style={styles.heroName}>
              {partner?.pseudo ?? partnerId}
              {partner?.age ? `, ${partner.age}` : ''}
            </Text>
            {partner?.city && (
              <Text style={styles.heroCity}>📍 {partner.city}</Text>
            )}

            {/* ── Badge niveau ── */}
            <View style={styles.levelBadge}>
              <Text style={styles.levelStars}>{rel.stars}</Text>
              <View>
                <Text style={styles.levelLabel}>Niveau {rel.level} — {rel.label}</Text>
                {rel.progressText && (
                  <Text style={styles.levelProgress}>{rel.progressText}</Text>
                )}
              </View>
            </View>

            {/* Texte d'ambiance si photo pas encore révélée */}
            {rel.photoVisibility !== 'revealed' && (
              <Text style={styles.photoHint}>
                {rel.photoVisibility === 'avatar'
                  ? '🎭 La relation se construit avant tout'
                  : '🌫️ La photo se précise à mesure que vous vous découvrez'}
              </Text>
            )}
          </View>
        </View>

        {/* ── Bio ── */}
        {partner?.bio ? (
          <Section title="✨ Bio">
            <Text style={styles.bioText}>{partner.bio}</Text>
          </Section>
        ) : null}

        {/* ── Citation ── */}
        {partner?.quote ? (
          <Section title="💬 Sa citation">
            <Text style={styles.quoteText}>{partner.quote}</Text>
          </Section>
        ) : null}

        {/* ── Ce qu'il/elle cherche ── */}
        {partner?.lookingFor?.length ? (
          <Section title="💕 Ce qu'il·elle cherche ici">
            {partner.lookingFor.map(id => (
              <Text key={id} style={styles.infoLine}>
                → {LOOKING_FOR_LABEL[id] ?? id}
              </Text>
            ))}
          </Section>
        ) : null}

        {/* ── Un peu de lui/elle ── */}
        {(partner?.height || physique) ? (
          <Section title="📍 Un peu de lui·elle">
            {partner?.height ? (
              <Text style={styles.infoLine}>📏 {partner.height} cm</Text>
            ) : null}
            {physique ? (
              <Text style={styles.infoLine}>{physique.emoji} {physique.label}</Text>
            ) : null}
          </Section>
        ) : null}

        {/* ── Compétences ── */}
        {partner?.skills?.length ? (
          <Section title="🎯 Ce qu'il·elle gère (plus ou moins bien)">
            {partner.skills.map((sk, i) => {
              const filled = Math.max(0, Math.min(5, Math.round((sk.score || 0) / 20)));
              return (
                <View key={i} style={styles.skillRow}>
                  <Text style={styles.skillEmoji}>{sk.emoji}</Text>
                  <View style={styles.skillMid}>
                    <Text style={styles.skillLabel}>{sk.label}</Text>
                    <Text style={styles.skillDetail}>{sk.detail}</Text>
                  </View>
                  <View style={styles.skillDots}>
                    {[0,1,2,3,4].map(d => (
                      <View key={d} style={[styles.dot, d < filled && styles.dotFilled]} />
                    ))}
                  </View>
                </View>
              );
            })}
          </Section>
        ) : null}

        {/* ── Qualités / Défauts ── */}
        {(partner?.qualities?.length || partner?.defaults?.length) ? (
          <Section title="⚖️ Ses petits + et ses petits −">
            <View style={styles.qdRow}>
              {partner?.qualities?.length ? (
                <View style={styles.qdCard}>
                  {partner.qualities.map(q => (
                    <Text key={q} style={styles.qdGood}>✓ {q}</Text>
                  ))}
                </View>
              ) : null}
              {partner?.defaults?.length ? (
                <View style={styles.qdCard}>
                  {partner.defaults.map(d => (
                    <Text key={d} style={styles.qdBad}>✕ {d}</Text>
                  ))}
                </View>
              ) : null}
            </View>
          </Section>
        ) : null}

        {/* ── Journée idéale ── */}
        {partner?.idealDay?.length ? (
          <Section title="🌅 Sa journée idéale">
            <View style={styles.idealDayCard}>
              <View style={styles.idealTape} />
              {partner.idealDay.map((line, i) => (
                <Text key={i} style={styles.idealLine}>{line}</Text>
              ))}
            </View>
          </Section>
        ) : null}

        {/* ── Pas de données ── */}
        {!partner && (
          <View style={styles.noDataState}>
            <Text style={styles.noDataEmoji}>✉️</Text>
            <Text style={styles.noDataText}>
              Le profil de {partnerId} n'est pas encore chargé.{'\n'}
              Continuez à vous écrire pour en découvrir plus.
            </Text>
          </View>
        )}

        {/* ── CTA retour lettres ── */}
        <TouchableOpacity style={styles.backToLettersBtn} onPress={() => router.back()}>
          <Text style={styles.backToLettersText}>✉️ Retourner aux lettres</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionKicker}>{title}</Text>
      {children}
    </View>
  );
}

const BG     = '#ECE3D4';
const PAPER  = '#F6EEDF';
const INK    = '#2B1B12';
const INK_S  = '#7C5A43';
const GOLD   = '#D7B26A';
const LINE   = '#D9C7AA';
const PINK   = '#8B2E3C';
const GREEN  = '#6F9B74';
const RED    = '#BE6B63';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: LINE,
    backgroundColor: '#2C1A0E',
  },
  backBtn:  { minWidth: 80 },
  backText: { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F0D98C' },

  scroll: { padding: 16, paddingBottom: 60 },

  // ── Hero ──
  hero: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: PAPER, borderRadius: 22,
    borderWidth: 1, borderColor: LINE,
    padding: 18, marginBottom: 16, gap: 16,
  },
  photoWrap: {
    width: 110, height: 134,
    backgroundColor: '#FFF', borderRadius: 10,
    borderWidth: 1, borderColor: '#E6D8C2',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, shadowRadius: 8, elevation: 3,
  },
  photo: { width: 110, height: 134, borderRadius: 10 },
  tape: {
    position: 'absolute', top: -7, alignSelf: 'center',
    width: 44, height: 14, backgroundColor: '#E8D8C2',
    borderRadius: 2, transform: [{ rotate: '-5deg' }], zIndex: 3,
  },
  heroText:     { flex: 1 },
  heroName:     { fontSize: 26, fontWeight: '800', color: INK, lineHeight: 32, marginBottom: 4 },
  heroCity:     { fontSize: 14, color: INK_S, marginBottom: 12 },

  levelBadge:    { backgroundColor: '#F9EFDB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  levelStars:    { fontSize: 16, marginTop: 1 },
  levelLabel:    { fontSize: 13, fontWeight: '700', color: '#6B4C30' },
  levelProgress: { fontSize: 11, color: INK_S, marginTop: 3, fontStyle: 'italic' },

  photoHint: { fontSize: 12, color: INK_S, fontStyle: 'italic', lineHeight: 17 },

  // ── Sections ──
  section:        { backgroundColor: PAPER, borderRadius: 18, borderWidth: 1, borderColor: LINE, padding: 16, marginBottom: 14 },
  sectionKicker:  { fontSize: 13, fontWeight: '800', color: INK, letterSpacing: 0.5, marginBottom: 12 },

  bioText:   { fontSize: 15, color: INK, lineHeight: 24 },
  quoteText: { fontSize: 15, color: INK_S, fontStyle: 'italic', lineHeight: 24 },
  infoLine:  { fontSize: 15, color: INK, lineHeight: 26 },

  // ── Compétences ──
  skillRow:    { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EDE2CF' },
  skillEmoji:  { fontSize: 22, marginRight: 10 },
  skillMid:    { flex: 1 },
  skillLabel:  { fontSize: 15, fontWeight: '700', color: INK },
  skillDetail: { fontSize: 12, color: INK_S, marginTop: 2 },
  skillDots:   { flexDirection: 'row', gap: 4 },
  dot:         { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E8DACA' },
  dotFilled:   { backgroundColor: GOLD },

  // ── Qualités / Défauts ──
  qdRow:  { flexDirection: 'row', gap: 12 },
  qdCard: { flex: 1, backgroundColor: '#F3EAD8', borderRadius: 14, padding: 12 },
  qdGood: { fontSize: 14, color: GREEN, fontWeight: '700', marginBottom: 8, lineHeight: 20 },
  qdBad:  { fontSize: 14, color: RED,   fontWeight: '700', marginBottom: 8, lineHeight: 20 },

  // ── Journée idéale ──
  idealDayCard: {
    backgroundColor: '#F0DBD9', borderRadius: 16,
    borderWidth: 1, borderColor: '#E2C9C5',
    paddingHorizontal: 16, paddingVertical: 16,
    position: 'relative',
  },
  idealTape: {
    position: 'absolute', right: 20, top: -7,
    width: 40, height: 14, backgroundColor: '#E8D8C2',
    borderRadius: 2, transform: [{ rotate: '6deg' }],
  },
  idealLine: { fontSize: 15, color: INK, lineHeight: 28 },

  // ── États ──
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:  { fontSize: 16, color: INK_S },

  noDataState: { alignItems: 'center', paddingVertical: 40 },
  noDataEmoji: { fontSize: 48, marginBottom: 12 },
  noDataText:  { fontSize: 14, color: INK_S, textAlign: 'center', lineHeight: 22 },

  // ── CTA retour ──
  backToLettersBtn: {
    marginTop: 8, borderRadius: 16, borderWidth: 1.5, borderColor: PINK,
    padding: 16, alignItems: 'center',
  },
  backToLettersText: { fontSize: 15, color: PINK, fontWeight: '700' },
});
