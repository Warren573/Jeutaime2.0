import React, { useEffect, useMemo, useState } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '../src/store/useStore';
import { API_URL } from '../src/api/client';
import { getRelationInfo } from '../src/engine/RelationEngine';
import { Avatar } from '../src/avatar/png/Avatar';
import { DEFAULT_AVATAR } from '../src/avatar/png/defaults';

function makePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return API_URL + url.replace(/^\/api/, '');
}

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "J'ai vu de la lumière, je suis entré·e",
  flirt: 'Rien de trop sérieux',
  amitie: "Des affinités, d'abord",
  discussion: 'Je cherche à discuter',
};

type RevealLevel = 1 | 2 | 3;

export default function MatchProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const [authToken, setAuthToken] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(setAuthToken);
  }, []);

  const { matches, letters, currentUser, matchPartners, apiMatches } = useStore();
  const match = matches.find(m => m.id === matchId);

  if (!match) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}> 
        <TouchableOpacity style={styles.backBtn} onPress={() => router.replace('/(tabs)/letters')}>
          <Text style={styles.backText}>← Lettres</Text>
        </TouchableOpacity>
        <View style={styles.errorState}>
          <Text style={styles.errorText}>Match introuvable</Text>
        </View>
      </View>
    );
  }

  const myId = currentUser?.id ?? 'dev-local';
  const partnerId = match.userAId === myId ? match.userBId : match.userAId;
  const partner = matchPartners?.[partnerId];

  const rawMatch = apiMatches.find(m => m.id === matchId);
  const apiLetterCount = rawMatch
    ? rawMatch.letterCountA + rawMatch.letterCountB
    : letters.filter(l => l.fromUserId === partnerId || l.toUserId === partnerId).length;

  const rel = getRelationInfo(apiLetterCount, currentUser?.isPremium ?? false);
  const revealLevel = Math.max(1, Math.min(3, rel.level)) as RevealLevel;

  const hasUnlockedPhoto = (rel.level >= 3) && !!match.photoUrl;
  const introText = useMemo(() => {
    const bio = partner?.bio?.trim();
    if (!bio) return '';
    if (revealLevel === 1) {
      return bio.length > 110 ? `${bio.slice(0, 110).trim()}…` : bio;
    }
    return bio;
  }, [partner?.bio, revealLevel]);

  const interests = partner?.interests ?? [];
  const visibleInterests = revealLevel === 1 ? interests.slice(0, 2) : interests;

  const headerLine = [partner?.pseudo ?? partnerId, partner?.age ? String(partner.age) : '']
    .filter(Boolean)
    .join(', ');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}> 
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.replace('/(tabs)/letters')}>
          <Text style={styles.backText}>← Lettres</Text>
        </TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{partner?.pseudo ?? partnerId}</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.journalPage}>
          <Text style={styles.pageTitle}>Mon journal de bord</Text>

          <View style={styles.hero}>
            <View style={styles.photoCard}>
              <View style={styles.photoTape} />
              {hasUnlockedPhoto ? (
                <Image
                  key={authToken ?? 'notoken'}
                  source={{
                    uri: makePhotoUrl(match.photoUrl as string),
                    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
                  }}
                  style={styles.photoImg}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Avatar
                    size={106}
                    {...(partner?.avatarConfig && Object.keys(partner.avatarConfig).length > 0
                      ? (partner.avatarConfig as any)
                      : DEFAULT_AVATAR)}
                  />
                </View>
              )}
            </View>

            <View style={styles.heroRight}>
              {!!headerLine && <Text style={styles.heroName}>{headerLine}</Text>}
              {partner?.city && <Text style={styles.heroCity}>📍 {partner.city}</Text>}
              <View style={styles.levelBadge}>
                <Text style={styles.levelStars}>{rel.stars}</Text>
                <View style={styles.levelBadgeText}>
                  <Text style={styles.levelLabel}>Niveau {revealLevel} — {rel.label}</Text>
                  {rel.progressText ? <Text style={styles.levelProgress}>{rel.progressText}</Text> : null}
                </View>
              </View>
              {!hasUnlockedPhoto && rel.progressText && (
                <Text style={styles.photoHint}>🔒 {rel.progressText}</Text>
              )}
            </View>
          </View>

          <View style={styles.freeLineWrap}>
            <Text style={styles.freeLineLabel}>Intéressé·e par :</Text>
            <Text style={styles.freeLineText}>
              {(partner?.lookingFor?.length ? partner.lookingFor.map(id => LOOKING_FOR_LABEL[id] ?? id) : ['Continuer une vraie conversation'])
                .join(' · ')}
            </Text>
          </View>

          <View style={[styles.paperSection, styles.widePaper] }>
            <Text style={styles.kicker}>UN PEU DE MOI</Text>
            <View style={styles.openBlock}>
              <Text style={styles.bodyText}>{introText || 'Encore un peu de mystère pour le moment.'}</Text>
            </View>
          </View>

          <View style={styles.offsetRow}>
            <View style={[styles.paperSection, styles.leftTall]}>
              <Text style={styles.kicker}>CE QUE JE GÈRE (plus ou moins bien)</Text>
              <View style={styles.outlineBlock}>
                <Text style={styles.bodyText}>
                  {visibleInterests.length ? visibleInterests.join(' · ') : 'À découvrir au fil des lettres'}
                </Text>
              </View>
            </View>
            <View style={[styles.paperSection, styles.rightFloat]}>
              <Text style={styles.kicker}>CE QUI DEMANDE UN PEU D’INDULGENCE</Text>
              <View style={styles.bareBlock}>
                {(partner?.defaults?.length
                  ? partner.defaults
                  : ['Je réponds parfois après un long roman intérieur'])
                  .slice(0, 2)
                  .map((d, i) => <Text key={`${d}-${i}`} style={styles.listLine}>— {d}</Text>)}
              </View>
            </View>
          </View>

          {!!partner?.questionTexts?.length && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SES 3 QUESTIONS</Text>
              <View style={styles.textDenseCard}>
                {partner.questionTexts
                  .slice(0, 3)
                  .map((q, i) => <Text key={`${q}-${i}`} style={styles.listLine}>• {q}</Text>)}
              </View>
            </View>
          )}

          {!!partner?.idealDay?.length && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SA JOURNÉE IDÉALE</Text>
              <View style={styles.softCardNoRadius}>
                {partner.idealDay
                  .map((line, i) => <Text key={`${line}-${i}`} style={styles.listLine}>• {line}</Text>)}
              </View>
            </View>
          )}

          {!!(partner?.qualities?.length || partner?.defaults?.length) && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SES PETITS + ET SES PETITS -</Text>
              <View style={styles.stampedCard}>
                <View style={styles.smallTape} />
                <>
                  {(partner?.qualities ?? []).map((q, i) => <Text key={`${q}-${i}`} style={styles.listLine}>✓ {q}</Text>)}
                  {(partner?.defaults ?? []).map((d, i) => <Text key={`${d}-${i}`} style={styles.listLine}>✕ {d}</Text>)}
                </>
              </View>
            </View>
          )}

          {!!partner?.quote?.trim() && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>ANECDOTE</Text>
              <View style={styles.openBlock}>
                <Text style={styles.bodyText}>{partner.quote}</Text>
              </View>
            </View>
          )}

          <View style={styles.paperSection}>
            <Text style={styles.kicker}>PROGRESSION</Text>
            <View style={styles.outlineBlock}>
              <Text style={styles.bodyText}>{apiLetterCount} lettres échangées.</Text>
              {rel.progressText ? <Text style={styles.progressText}>{rel.progressText}</Text> : null}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const BG = '#ECE3D4';
const PAPER = '#F6EEDF';
const INK = '#2B1B12';
const INK_S = '#7C5A43';
const LINE = '#D9C7AA';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  navBar: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
    backgroundColor: '#2C1A0E', borderBottomWidth: 1, borderBottomColor: '#5A3A1A',
  },
  backBtn: { minWidth: 60 },
  backText: { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F0D98C' },
  scroll: { padding: 16, paddingBottom: 60 },
  journalPage: {
    backgroundColor: PAPER, borderRadius: 24, borderWidth: 1, borderColor: '#E3D3BC',
    paddingHorizontal: 18, paddingVertical: 18,
  },
  pageTitle: { fontSize: 32, fontWeight: '900', color: INK, marginBottom: 12 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  photoCard: {
    width: 106, height: 126, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1,
    borderColor: '#E7DAC8', alignItems: 'center', justifyContent: 'center', marginRight: 14, position: 'relative',
  },
  photoTape: {
    position: 'absolute', top: -6, alignSelf: 'center', width: 38, height: 14,
    backgroundColor: '#E7D5BF', borderRadius: 2, transform: [{ rotate: '-8deg' }], zIndex: 3,
  },
  photoImg: { width: 106, height: 126, borderRadius: 6 },
  photoPlaceholder: {
    width: 106, height: 126, borderRadius: 6, backgroundColor: '#F3EDE3', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  heroRight: { flex: 1, paddingTop: 4 },
  heroName: { fontSize: 28, fontWeight: '800', color: INK, lineHeight: 34, marginBottom: 4 },
  heroCity: { fontSize: 14, color: INK_S, marginBottom: 10 },
  levelBadge: { backgroundColor: '#F9EFDB', borderRadius: 12, padding: 10, borderWidth: 1, borderColor: LINE, flexDirection: 'row', gap: 8, marginBottom: 8 },
  levelBadgeText: { flex: 1 },
  levelStars: { fontSize: 14, marginTop: 1 },
  levelLabel: { fontSize: 12, fontWeight: '700', color: '#6B4C30' },
  levelProgress: { fontSize: 11, color: INK_S, marginTop: 3, fontStyle: 'italic' },
  photoHint: { fontSize: 11, color: INK_S, fontStyle: 'italic', lineHeight: 16 },
  paperSection: { marginBottom: 22 },
  widePaper: { marginTop: 10, marginBottom: 30 },
  kicker: { fontSize: 15, color: INK, fontWeight: '800', letterSpacing: 0.4, marginBottom: 10 },
  softCard: { backgroundColor: '#F3E7D7', borderRadius: 14, borderWidth: 1, borderColor: '#E2D1BA', padding: 14 },
  softCardNoRadius: { backgroundColor: '#F3E7D7', borderWidth: 1, borderColor: '#E2D1BA', padding: 14 },
  openBlock: { paddingHorizontal: 2, paddingVertical: 4 },
  outlineBlock: { borderWidth: 1, borderColor: '#D7C1A2', borderRadius: 4, padding: 14, backgroundColor: '#F8F1E5' },
  bareBlock: { paddingHorizontal: 2, paddingVertical: 2 },
  textDenseCard: { borderLeftWidth: 3, borderLeftColor: '#9A7553', paddingLeft: 12, paddingVertical: 4 },
  stampedCard: { backgroundColor: '#F2E2CE', borderWidth: 1, borderColor: '#DDBD97', padding: 14, borderRadius: 10, position: 'relative' },
  smallTape: { position: 'absolute', top: -6, right: 18, width: 26, height: 10, backgroundColor: '#E4CFAF', transform: [{ rotate: '6deg' }] },
  freeLineWrap: { marginTop: 8, marginBottom: 30 },
  freeLineLabel: { fontSize: 12, color: INK_S, textTransform: 'uppercase', letterSpacing: 1.1, marginBottom: 4 },
  freeLineText: { fontSize: 20, lineHeight: 28, color: INK, fontWeight: '600' },
  offsetRow: { flexDirection: 'row', alignItems: 'flex-start', columnGap: 16, marginBottom: 18 },
  leftTall: { flex: 1.2, marginTop: 6 },
  rightFloat: { flex: 0.8, marginTop: 32, marginBottom: 0 },
  bodyText: { fontSize: 16, lineHeight: 24, color: INK },
  listLine: { fontSize: 15, lineHeight: 24, color: INK, marginBottom: 4 },
  progressText: { marginTop: 4, fontSize: 13, color: INK_S, fontStyle: 'italic' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: INK_S },
});
