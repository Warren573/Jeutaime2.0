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
  const router  = useRouter();
  const insets  = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();

  const { matches, letters, currentUser, matchPartners } = useStore();

  const match = matches.find(m => m.id === matchId);
  if (!match) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Lettres</Text>
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

  const conv        = letters.filter(l => l.fromUserId === partnerId || l.toUserId === partnerId);
  const letterCount = conv.length;
  const isPremium   = currentUser?.isPremium ?? false;
  const rel         = getRelationInfo(letterCount, isPremium);

  const physique = partner?.physicalDesc
    ? PHYSIQUE_LABEL[partner.physicalDesc] ?? { emoji: '✨', label: partner.physicalDesc }
    : null;

  const headerLine = [partner?.pseudo ?? partnerId, partner?.age ? String(partner.age) : '']
    .filter(Boolean).join(', ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Barre nav sombre (cohérente avec les lettres) ── */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>← Lettres</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>
          {partner?.pseudo ?? partnerId}
        </Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Héro : avatar/photo + nom + niveau ── */}
        <View style={styles.journalPage}>

          <View style={styles.hero}>
            {/* Photo / avatar selon niveau */}
            <View style={styles.photoCard}>
              <View style={styles.photoTape} />
              {rel.photoVisibility === 'avatar' || !partner?.mainPhotoUri ? (
                <Avatar size={86} {...DEFAULT_AVATAR} />
              ) : (
                <Image
                  source={{ uri: partner.mainPhotoUri }}
                  style={styles.photoImg}
                  contentFit="cover"
                  blurRadius={rel.photoVisibility === 'blurred' ? 20 : 0}
                />
              )}
            </View>

            <View style={styles.heroRight}>
              {!!headerLine && (
                <Text style={styles.heroName}>{headerLine}</Text>
              )}
              {partner?.city && (
                <Text style={styles.heroCity}>📍 {partner.city}</Text>
              )}
              {/* Badge niveau */}
              <View style={styles.levelBadge}>
                <Text style={styles.levelStars}>{rel.stars}</Text>
                <View style={styles.levelBadgeText}>
                  <Text style={styles.levelLabel}>Niveau {rel.level} — {rel.label}</Text>
                  {rel.progressText && (
                    <Text style={styles.levelProgress}>{rel.progressText}</Text>
                  )}
                </View>
              </View>
              {rel.photoVisibility !== 'revealed' && (
                <Text style={styles.photoHint}>
                  {rel.photoVisibility === 'avatar'
                    ? '🎭 La relation se construit avant tout'
                    : '🌫️ La photo se précise à mesure que vous vous découvrez'}
                </Text>
              )}
            </View>
          </View>

          {/* ── Citation ── */}
          {partner?.quote ? (
            <>
              <Text style={styles.quoteText}>{partner.quote}</Text>
              <Text style={styles.underline}>________________</Text>
            </>
          ) : null}

          {/* ── Ce qu'il·elle cherche ── */}
          {partner?.lookingFor?.length ? (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>CE QU'IL·ELLE CHERCHE ICI</Text>
              <View style={styles.intentNote}>
                <View style={styles.intentTape} />
                <View style={styles.intentTapeBottom} />
                <Text style={styles.intentText}>
                  {partner.lookingFor.map(id => LOOKING_FOR_LABEL[id] ?? id).join(' · ')}
                </Text>
                <View style={styles.heartFloat}>
                  <Text style={styles.heartFloatText}>♡</Text>
                </View>
              </View>
            </View>
          ) : null}

          {/* ── Un peu de lui·elle ── */}
          {(partner?.height || physique) ? (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>UN PEU DE LUI·ELLE</Text>
              <View style={styles.practicalCard}>
                {partner?.city    ? <Text style={styles.practicalLine}>📍 {partner.city}</Text> : null}
                {partner?.height  ? <Text style={styles.practicalLine}>📏 {partner.height} cm</Text> : null}
                {physique         ? <Text style={styles.practicalLine}>{physique.emoji} {physique.label}</Text> : null}
              </View>
            </View>
          ) : null}

          {/* ── Compétences ── */}
          {partner?.skills?.length ? (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>CE QU'IL·ELLE GÈRE (plus ou moins bien)</Text>
              <View style={styles.skillsCard}>
                {partner.skills.map((sk, i) => {
                  const filled = Math.max(0, Math.min(5, Math.round((sk.score || 0) / 20)));
                  return (
                    <View key={i}>
                      <View style={styles.skillRow}>
                        <View style={styles.skillLeft}>
                          <Text style={styles.skillEmoji}>{sk.emoji}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.skillLabel}>{sk.label}</Text>
                            <Text style={styles.skillDetail}>{sk.detail}</Text>
                          </View>
                        </View>
                        <View style={styles.skillRight}>
                          <View style={styles.skillDots}>
                            {[0,1,2,3,4].map(d => (
                              <View key={d} style={[styles.skillDot, d < filled && styles.skillDotFilled]} />
                            ))}
                          </View>
                          <Text style={styles.skillScore}>{sk.score}%</Text>
                        </View>
                      </View>
                      {i < (partner.skills?.length ?? 0) - 1 && <View style={styles.skillDivider} />}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}

          {/* ── Qualités / Défauts ── */}
          {(partner?.qualities?.length || partner?.defaults?.length) ? (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SES PETITS + ET SES PETITS −</Text>
              <View style={styles.qualitiesRow}>
                {partner?.qualities?.length ? (
                  <View style={styles.miniCard}>
                    {partner.qualities.map(q => (
                      <View key={q} style={styles.bulletRow}>
                        <Text style={styles.goodBullet}>✓</Text>
                        <Text style={styles.bulletText}>{q}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
                {partner?.defaults?.length ? (
                  <View style={styles.miniCard}>
                    {partner.defaults.map(d => (
                      <View key={d} style={styles.bulletRow}>
                        <Text style={styles.badBullet}>✕</Text>
                        <Text style={styles.bulletText}>{d}</Text>
                      </View>
                    ))}
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {/* ── Journée idéale ── */}
          {partner?.idealDay?.length ? (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SA JOURNÉE IDÉALE</Text>
              <View style={styles.idealDayCard}>
                <View style={styles.tapeTape} />
                <View style={styles.tapeTapeAlt} />
                {partner.idealDay.map((line, i) => (
                  <Text key={i} style={styles.idealDayLine}>{line}</Text>
                ))}
              </View>
            </View>
          ) : null}

          {!partner && (
            <View style={styles.noDataState}>
              <Text style={styles.noDataText}>
                Continuez à vous écrire pour en découvrir plus.
              </Text>
            </View>
          )}

        </View>

        {/* ── CTA retour ── */}
        <TouchableOpacity style={styles.backToLettersBtn} onPress={() => router.back()}>
          <Text style={styles.backToLettersText}>✉️ Retourner aux lettres</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

const BG      = '#ECE3D4';
const PAPER   = '#F6EEDF';
const PAPER2  = '#F3E7D7';
const PAPER3  = '#F7EFE2';
const INK     = '#2B1B12';
const INK_S   = '#7C5A43';
const LINE    = '#D9C7AA';
const GOLD    = '#D7B26A';
const GREEN   = '#6F9B74';
const RED     = '#BE6B63';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  navBar: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#2C1A0E',
    borderBottomWidth: 1, borderBottomColor: '#5A3A1A',
  },
  backBtn:  { minWidth: 60 },
  backText: { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F0D98C' },

  scroll: { padding: 16, paddingBottom: 60 },

  // ── Journal page (même conteneur que ProfileTwoStepDemo) ──
  journalPage: {
    backgroundColor: PAPER,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E3D3BC',
    paddingHorizontal: 18,
    paddingVertical: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
    marginBottom: 16,
  },

  // ── Héro ──
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 18,
  },
  photoCard: {
    width: 106, height: 126,
    backgroundColor: '#FFF',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E7DAC8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 2,
    position: 'relative',
  },
  photoTape: {
    position: 'absolute', top: -6, alignSelf: 'center',
    width: 38, height: 14, backgroundColor: '#E7D5BF',
    borderRadius: 2, transform: [{ rotate: '-8deg' }], zIndex: 3,
  },
  photoImg: { width: 106, height: 126, borderRadius: 6 },

  heroRight:  { flex: 1, paddingTop: 4 },
  heroName:   { fontSize: 28, fontWeight: '800', color: INK, lineHeight: 34, marginBottom: 4 },
  heroCity:   { fontSize: 14, color: INK_S, marginBottom: 10 },

  levelBadge:     { backgroundColor: '#F9EFDB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: LINE, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 8 },
  levelBadgeText: { flex: 1 },
  levelStars:     { fontSize: 14, marginTop: 1 },
  levelLabel:     { fontSize: 12, fontWeight: '700', color: '#6B4C30' },
  levelProgress:  { fontSize: 11, color: INK_S, marginTop: 3, fontStyle: 'italic' },
  photoHint:      { fontSize: 11, color: INK_S, fontStyle: 'italic', lineHeight: 16 },

  // ── Citation + séparateur ──
  quoteText:  { fontSize: 17, lineHeight: 28, color: INK_S, fontStyle: 'italic', marginBottom: 4 },
  underline:  { fontSize: 16, color: '#A98668', marginBottom: 18 },

  // ── Sections (même style que ProfileTwoStepDemo) ──
  paperSection: { marginBottom: 22 },
  kicker: {
    fontSize: 15, color: INK, fontWeight: '800',
    letterSpacing: 0.6, marginBottom: 12,
  },

  // intention note
  intentNote: {
    backgroundColor: '#F3E2C7', borderRadius: 18,
    paddingHorizontal: 18, paddingVertical: 18,
    borderWidth: 1, borderColor: '#E1CBA8',
    position: 'relative',
  },
  intentText:       { fontSize: 18, lineHeight: 32, color: INK, maxWidth: '88%' },
  heartFloat:       { position: 'absolute', right: 14, bottom: 10 },
  heartFloatText:   { fontSize: 28, color: '#A97169' },
  intentTape: {
    position: 'absolute', right: 18, top: -7,
    width: 40, height: 14, backgroundColor: '#E7D5BF',
    borderRadius: 2, transform: [{ rotate: '3deg' }], zIndex: 1,
  },
  intentTapeBottom: {
    position: 'absolute', left: 14, bottom: -7,
    width: 36, height: 14, backgroundColor: '#E7D5BF',
    borderRadius: 2, transform: [{ rotate: '-4deg' }], zIndex: 1,
  },

  // practical card
  practicalCard: {
    backgroundColor: PAPER2, borderRadius: 18,
    borderWidth: 1, borderColor: '#E2D1BA',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  practicalLine: { fontSize: 16, color: INK, marginBottom: 8 },

  // skills
  skillsCard: {
    backgroundColor: PAPER3, borderRadius: 18,
    borderWidth: 1, borderColor: '#E2D3BE',
    paddingHorizontal: 14, paddingVertical: 6,
  },
  skillRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12 },
  skillLeft:     { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 10 },
  skillEmoji:    { fontSize: 22, marginRight: 10 },
  skillLabel:    { fontSize: 17, fontWeight: '700', color: INK, marginBottom: 2 },
  skillDetail:   { fontSize: 14, color: INK_S },
  skillRight:    { alignItems: 'flex-end' },
  skillDots:     { flexDirection: 'row', marginBottom: 4 },
  skillDot:      { width: 10, height: 10, borderRadius: 5, marginLeft: 4, backgroundColor: '#E8DACA' },
  skillDotFilled:{ backgroundColor: GOLD },
  skillScore:    { fontSize: 14, fontWeight: '700', color: INK_S },
  skillDivider:  { height: 1, backgroundColor: '#E8D9C6' },

  // qualités / défauts
  qualitiesRow: { flexDirection: 'row', gap: 12 },
  miniCard: {
    flex: 1, backgroundColor: PAPER3,
    borderRadius: 18, borderWidth: 1, borderColor: '#E0D1BC', padding: 14,
  },
  bulletRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  goodBullet: { fontSize: 17, color: GREEN, marginRight: 8, fontWeight: '800' },
  badBullet:  { fontSize: 17, color: RED,   marginRight: 8, fontWeight: '800' },
  bulletText: { fontSize: 16, color: INK, flex: 1 },

  // journée idéale
  idealDayCard: {
    backgroundColor: '#F0DBD9', borderRadius: 18,
    borderWidth: 1, borderColor: '#E2C9C5',
    paddingHorizontal: 18, paddingVertical: 18, position: 'relative',
  },
  tapeTape: {
    position: 'absolute', right: 20, top: -8,
    width: 42, height: 16, backgroundColor: '#E8D8C2',
    borderRadius: 2, transform: [{ rotate: '8deg' }],
  },
  tapeTapeAlt: {
    position: 'absolute', left: 24, bottom: -8,
    width: 36, height: 14, backgroundColor: '#E8D8C2',
    borderRadius: 2, transform: [{ rotate: '-5deg' }],
  },
  idealDayLine: { fontSize: 17, lineHeight: 30, color: INK, marginBottom: 6 },

  // états
  errorState:  { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText:   { fontSize: 16, color: INK_S },
  noDataState: { alignItems: 'center', paddingVertical: 20 },
  noDataText:  { fontSize: 14, color: INK_S, textAlign: 'center', lineHeight: 22, fontStyle: 'italic' },

  // CTA retour
  backToLettersBtn: {
    borderRadius: 16, borderWidth: 1.5, borderColor: '#8B2E3C',
    padding: 16, alignItems: 'center',
  },
  backToLettersText: { fontSize: 15, color: '#8B2E3C', fontWeight: '700' },
});
