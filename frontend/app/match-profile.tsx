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

  const hasUnlockedPhoto = !!match.photoUnlocked && revealLevel >= 3 && !!match.photoUrl;
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
              {!hasUnlockedPhoto && (
                <Text style={styles.photoHint}>🔒 Révélé après 10 lettres chacun</Text>
              )}
            </View>
          </View>

          <View style={styles.paperSection}>
            <Text style={styles.kicker}>CE QUE JE CHERCHE ICI</Text>
            <View style={styles.softCard}>
              <Text style={styles.bodyText}>
                {(partner?.lookingFor?.length ? partner.lookingFor.map(id => LOOKING_FOR_LABEL[id] ?? id) : ['Continuer une vraie conversation'])
                  .join(' · ')}
              </Text>
            </View>
          </View>

          <View style={styles.paperSection}>
            <Text style={styles.kicker}>UN PEU DE MOI</Text>
            <View style={styles.softCard}>
              <Text style={styles.bodyText}>{introText || 'Encore un peu de mystère pour le moment.'}</Text>
            </View>
          </View>

          <View style={styles.paperSection}>
            <Text style={styles.kicker}>CENTRES D’INTÉRÊT</Text>
            <View style={styles.softCard}>
              <Text style={styles.bodyText}>
                {visibleInterests.length ? visibleInterests.join(' · ') : 'À découvrir au fil des lettres'}
              </Text>
            </View>
          </View>

          {!!partner?.questionTexts?.length && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SES 3 QUESTIONS</Text>
              <View style={styles.softCard}>
                {partner.questionTexts
                  .slice(0, 3)
                  .map((q, i) => <Text key={`${q}-${i}`} style={styles.listLine}>• {q}</Text>)}
              </View>
            </View>
          )}

          {!!partner?.idealDay?.length && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SA JOURNÉE IDÉALE</Text>
              <View style={styles.softCard}>
                {partner.idealDay
                  .map((line, i) => <Text key={`${line}-${i}`} style={styles.listLine}>• {line}</Text>)}
              </View>
            </View>
          )}

          {!!(partner?.qualities?.length || partner?.defaults?.length) && (
            <View style={styles.paperSection}>
              <Text style={styles.kicker}>SES PETITS + ET SES PETITS -</Text>
              <View style={styles.softCard}>
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
              <View style={styles.softCard}>
                <Text style={styles.bodyText}>{partner.quote}</Text>
              </View>
            </View>
          )}

          <View style={styles.paperSection}>
            <Text style={styles.kicker}>PROGRESSION</Text>
            <View style={styles.softCard}>
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
  paperSection: { marginBottom: 16 },
  kicker: { fontSize: 15, color: INK, fontWeight: '800', letterSpacing: 0.4, marginBottom: 10 },
  softCard: { backgroundColor: '#F3E7D7', borderRadius: 14, borderWidth: 1, borderColor: '#E2D1BA', padding: 14 },
  bodyText: { fontSize: 16, lineHeight: 24, color: INK },
  listLine: { fontSize: 15, lineHeight: 24, color: INK, marginBottom: 4 },
  progressText: { marginTop: 4, fontSize: 13, color: INK_S, fontStyle: 'italic' },
  errorState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: INK_S },
});
