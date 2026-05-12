import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { API_URL } from '../api/client';
import { getPublicProfile, getMyPhotos, type PublicProfileResponse, type MyPhotoDto } from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR, type AvatarConfig } from '../avatar/png/defaults';
import { useStore } from '../store/useStore';

function makePhotoUrl(url: string): string {
  if (url.startsWith('http')) return url;
  return API_URL + url.replace(/^\/api/, '');
}

function calcAge(birthDate: string | null): number {
  if (!birthDate) return 0;
  const bd = new Date(birthDate);
  if (Number.isNaN(bd.getTime())) return 0;
  const now = new Date();
  let age = now.getFullYear() - bd.getFullYear();
  if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) age--;
  return age;
}

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "J'ai vu de la lumière, je suis entré·e",
  flirt: 'Rien de trop sérieux',
  amitie: "Des affinités, d'abord",
  discussion: 'Je cherche à discuter',
  serieux: "Je cherche l'âme sœur",
  RELATION: "J'ai vu de la lumière, je suis entré·e",
  FLIRT: 'Rien de trop sérieux',
  AMITIE: "Des affinités, d'abord",
  DISCUSSION: 'Je cherche à discuter',
  SERIEUX: "Je cherche l'âme sœur",
};

const INTERESTED_IN_LABEL: Record<string, string> = {
  FEMME: 'Femmes',
  HOMME: 'Hommes',
  AUTRE: 'Non-binaires',
  F: 'Femmes',
  M: 'Hommes',
  NB: 'Non-binaires',
};

function childrenLabel(hasChildren?: boolean | null, wantsChildren?: boolean | null): string | null {
  if (hasChildren === true && wantsChildren === true) return 'A des enfants — et prêt·e à agrandir la troupe';
  if (hasChildren === true && wantsChildren === false) return "A des enfants, c'est largement suffisant";
  if (hasChildren === true && wantsChildren == null) return 'A des enfants';
  if (hasChildren === false && wantsChildren === true) return "Pas d'enfants — compte se lancer dans l'élevage de pingouins";
  if (hasChildren === false && wantsChildren === false) return "Pas d'enfants, et ça ne changera pas";
  if (hasChildren === false && wantsChildren == null) return "Pas d'enfants";
  if (hasChildren == null && wantsChildren === true) return 'En réflexion — probablement oui';
  if (hasChildren == null && wantsChildren === false) return "Pas vraiment prévu d'enfants";
  return null;
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const profileId = useMemo(() => (Array.isArray(id) ? id[0] : id) ?? '', [id]);

  const [profileData, setProfileData] = useState<PublicProfileResponse | null>(null);
  const [photos, setPhotos] = useState<MyPhotoDto[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { currentUser, matches, apiMatches, letters } = useStore();

  useEffect(() => {
    AsyncStorage.getItem('auth_token').then(setAuthToken);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!profileId) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicProfile(profileId);
        const media = await getMyPhotos(profileId).catch(() => []);
        if (!mounted) return;
        setProfileData(data);
        setPhotos(media);
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement profil');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [profileId]);

  const profile = profileData?.profile;
  const myId = currentUser?.id ?? '';
  const linkedMatch = matches.find((m) => m.userAId === profileId || m.userBId === profileId);
  const linkedRawMatch = apiMatches.find((m) => m.otherUserId === profileId || m.userAId === profileId || m.userBId === profileId);
  const letterCount = linkedRawMatch
    ? linkedRawMatch.letterCountA + linkedRawMatch.letterCountB
    : linkedMatch
      ? linkedMatch.letterCount
      : letters.filter((l) => l.fromUserId === profileId || l.toUserId === profileId || (myId && (l.fromUserId === myId || l.toUserId === myId))).length;
  void letterCount;

  const age = useMemo(() => calcAge(profile?.birthDate ?? null), [profile?.birthDate]);
  const headerLine = [profile?.pseudo ?? 'Profil', age ? String(age) : ''].filter(Boolean).join(', ');
  const lookingFor = (profile?.lookingFor ?? []).map((k) => LOOKING_FOR_LABEL[k] ?? k).join(' · ');
  const effectiveBio = (profile?.bio ?? '').trim();
  const hasValidBio = effectiveBio.length > 1;
  const interestedIn = (profile?.interestedIn ?? []).map((k) => INTERESTED_IN_LABEL[k] ?? k).filter(Boolean);
  const interestLine = interestedIn.join(' · ');
  const children = childrenLabel(profile?.hasChildren ?? null, profile?.wantsChildren ?? null);
  const heightLine = typeof profile?.height === 'number' ? `${profile.height} cm` : null;
  const aboutLines = [
    !!profile?.city,
    !!heightLine,
    !!profile?.physicalDesc,
    !!children,
  ].some(Boolean);
  const idealDayParts = (profile?.idealDay ?? []).filter(Boolean);
  const plus = (profile?.qualities ?? []).filter(Boolean);
  const minus = (profile?.defaults ?? []).filter(Boolean);
  const skillLines = (profile?.skills ?? []).filter((s) => s?.label && s?.detail);
  const firstPhoto = photos.find((p) => !p.isPrivate)?.url;
  const avatarDef = profile?.avatarConfig && Object.keys(profile.avatarConfig).length > 0
    ? (profile.avatarConfig as unknown as AvatarConfig)
    : DEFAULT_AVATAR;

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#9C7A4D" /></View>;

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.navBar}>
          <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Découvrir</Text></TouchableOpacity>
          <Text style={styles.navTitle}>Profil</Text>
          <View style={{ width: 72 }} />
        </View>
        <View style={styles.center}><Text style={styles.errorText}>{error ?? 'Profil introuvable'}</Text></View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.backText}>← Découvrir</Text></TouchableOpacity>
        <Text style={styles.navTitle} numberOfLines={1}>{profile.pseudo ?? 'Profil'}</Text>
        <View style={{ width: 72 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.journalPage}>
          <View style={styles.sophieHeader}>
            <View style={styles.sophieLeft}>
              <Text style={styles.sophieTitle}>Mon journal de bord</Text>

              <View style={styles.sophieDivider} />

              <Text style={styles.sophieMood}>
                Quelques pages pour se dévoiler doucement.
              </Text>

              <Text style={styles.sophieName}>
                {headerLine}
              </Text>

              {!!profile.city && (
                <Text style={styles.sophieCity}>
                  {profile.city}
                </Text>
              )}
            </View>

            <View style={styles.sophiePolaroid}>
              <View style={styles.sophieTape} />

              {firstPhoto ? (
                <Image
                  source={{
                    uri: makePhotoUrl(firstPhoto),
                    headers: authToken
                      ? { Authorization: `Bearer ${authToken}` }
                      : {},
                  }}
                  style={styles.sophiePhoto}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.sophieAvatarWrap}>
                  <Avatar size={110} {...avatarDef} />
                </View>
              )}
            </View>
          </View>

          {!!lookingFor && (
          <View style={[styles.block, styles.searchBlock, styles.tapedBlock]}>
            <View style={[styles.cardTape, styles.tapeRight]} />
            <Text style={styles.kicker}>CE QUE JE CHERCHE ICI</Text>
            <Text style={styles.bodyText}>{lookingFor}</Text>
            <Text style={styles.heart}>♡</Text>
          </View>
          )}
          {!!interestLine && (
            <View style={styles.freeLineWrap}>
              <Text style={styles.freeLineLabel}>Intéressé·e par :</Text>
              <Text style={styles.freeLineText}>{interestLine}</Text>
            </View>
          )}

          {!!aboutLines && (
          <View style={[styles.block, styles.blockWide]}>
            <Text style={styles.kicker}>UN PEU DE MOI</Text>
            {!!profile.city && <Text style={styles.listLine}>📍 {profile.city}</Text>}
            {!!heightLine && <Text style={styles.listLine}>📏 {heightLine}</Text>}
            {!!profile.physicalDesc && <Text style={styles.listLine}>⚖️ {profile.physicalDesc}</Text>}
            {!!children && <Text style={styles.listLine}>👶 {children}</Text>}
          </View>
          )}

          {!!hasValidBio && (
          <View style={[styles.block, styles.blockSoft]}>
            <Text style={styles.kicker}>BIO / DESCRIPTION</Text>
            <Text style={[styles.bodyText, styles.bioText]}>{effectiveBio}</Text>
          </View>
          )}

          {!!skillLines.length && (
          <View style={[styles.block, styles.blockSoft]}>
            <Text style={styles.kicker}>CE QUE JE GÈRE (plus ou moins bien)</Text>
            {skillLines.map((s, idx) => (
              <Text key={`${s.label}-${idx}`} style={styles.listLine}>
                {s.emoji ? `${s.emoji} ` : ''}{s.label} — {s.detail}
              </Text>
            ))}
          </View>
          )}

          {!!(plus.length || minus.length) && (
          <View style={styles.plusMinusSection}>
            <Text style={styles.kicker}>SES PETITS + ET SES PETITS -</Text>
            <View style={styles.plusMinusRow}>
              {!!plus.length && (
                <View style={[styles.block, styles.halfCard]}>
                  {plus.map((p, idx) => <Text key={`${p}-${idx}`} style={styles.listLine}>✅ {p}</Text>)}
                </View>
              )}
              {!!minus.length && (
                <View style={[styles.block, styles.halfCard]}>
                  {minus.map((m, idx) => <Text key={`${m}-${idx}`} style={styles.listLine}>❌ {m}</Text>)}
                </View>
              )}
            </View>
          </View>
          )}

          {!!idealDayParts.length && (
          <View style={[styles.block, styles.blockPink, styles.tapedBlock]}>
            <View style={[styles.cardTape, styles.tapeRight]} />
            <View style={[styles.cardTape, styles.tapeBottomLeft]} />
            <Text style={styles.kicker}>SA JOURNÉE IDÉALE</Text>
            <Text style={styles.idealDayText}>{idealDayParts.join('\n\n')}</Text>
          </View>
          )}

          {!!profile.quote?.trim() && (
          <View style={[styles.block, styles.blockPink]}>
            <Text style={styles.kicker}>CITATION</Text>
            <Text style={[styles.bodyText, styles.italic, styles.quoteText]}>{profile.quote}</Text>
          </View>
          )}

          {!!profile.vibe?.trim() && (
          <View style={[styles.block, styles.blockWarm]}>
            <Text style={styles.kicker}>VIBE / AMBIANCE</Text>
            <Text style={styles.bodyText}>{profile.vibe.trim()}</Text>
          </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const BG = '#EFE5D8';
const INK = '#2B1B12';
const INK_S = '#7C5A43';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  navBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13, backgroundColor: '#2C1A0E', borderBottomWidth: 1, borderBottomColor: '#5A3A1A' },
  backText: { fontSize: 15, color: '#F0D98C', fontWeight: '600' },
  navTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: '#F0D98C' },
  errorText: { color: INK_S, fontSize: 16 },
  scroll: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 60 },
  journalPage: { paddingHorizontal: 4, paddingBottom: 22 },
  sophieHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 28,
    paddingHorizontal: 4,
  },
  sophieLeft: {
    flex: 1,
    paddingRight: 14,
    paddingTop: 6,
  },
  sophieTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#2B1B12',
    letterSpacing: -0.6,
  },
  sophieDivider: {
    height: 1,
    backgroundColor: '#BCA88E',
    marginTop: 10,
    marginBottom: 10,
    width: '92%',
  },
  sophieMood: {
    fontSize: 14,
    lineHeight: 22,
    color: '#7C5A43',
    fontStyle: 'italic',
    marginBottom: 22,
  },
  sophieName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2B1B12',
    marginBottom: 4,
  },
  sophieCity: {
    fontSize: 15,
    color: '#7C5A43',
  },
  sophiePolaroid: {
    width: 118,
    backgroundColor: '#FFF',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5D7C5',
    transform: [{ rotate: '1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  sophieTape: {
    position: 'absolute',
    top: -7,
    alignSelf: 'center',
    width: 42,
    height: 15,
    backgroundColor: '#E8D5BC',
    borderRadius: 2,
    transform: [{ rotate: '-6deg' }],
    zIndex: 10,
    opacity: 0.92,
  },
  sophiePhoto: {
    width: '100%',
    height: 138,
    borderRadius: 4,
  },
  sophieAvatarWrap: {
    width: '100%',
    height: 138,
    borderRadius: 4,
    backgroundColor: '#F3EBDD',
    alignItems: 'center',
    justifyContent: 'center',
  },
  block: { marginBottom: 14, borderRadius: 18, borderWidth: 1, borderColor: '#E4D4BE', backgroundColor: '#F4E8D8', padding: 16 },
  blockWide: { backgroundColor: '#F6EAD8', borderLeftWidth: 4, borderLeftColor: '#B57A60', marginRight: 24, paddingVertical: 22, paddingHorizontal: 17, transform: [{ rotate: '-0.7deg' }] },
  blockPink: { backgroundColor: '#F7E3DF', borderColor: '#E8C2BA' },
  blockWarm: { backgroundColor: '#F2E3CF' },
  blockSoft: { backgroundColor: '#F8EDDF' },
  blockNote: { backgroundColor: '#FBF3E8', borderStyle: 'dashed' },
  outlinedBlock: { backgroundColor: 'transparent', borderColor: '#DABFA3', borderWidth: 2, borderStyle: 'dashed' },
  featureBlock: { paddingVertical: 18 },
  spaciousBlock: { marginTop: 12, marginBottom: 24, paddingVertical: 22 },
  fullWidthAir: { marginTop: 18, marginBottom: 40, marginRight: 36, paddingVertical: 24, paddingHorizontal: 20 },
  searchBlock: { backgroundColor: '#F3E7C9', borderColor: '#E1CF9F' },
  tapedBlock: { position: 'relative', overflow: 'visible' },
  cardTape: { position: 'absolute', top: -7, left: 28, width: 46, height: 15, backgroundColor: '#E6D2B8', borderRadius: 2, transform: [{ rotate: '-7deg' }], zIndex: 3, opacity: 0.9 },
  tapeRight: { right: 30, transform: [{ rotate: '9deg' }] },
  kicker: { fontSize: 14, color: INK, fontWeight: '900', letterSpacing: 1.2, marginBottom: 10 },
  bodyText: { fontSize: 16, lineHeight: 24, color: INK },
  quoteText: { textAlign: 'center', maxWidth: '92%' },
  italic: { fontStyle: 'italic' },
  plusMinusSection: { marginBottom: 16 },
  plusMinusRow: { flexDirection: 'row', gap: 10 },
  halfCard: { flex: 1 },
  freeLineWrap: { marginTop: -6, marginBottom: 18, marginLeft: 10, marginRight: 34 },
  freeLineLabel: { fontSize: 14, color: INK, fontWeight: '800', marginBottom: 4 },
  freeLineText: { fontSize: 16, lineHeight: 24, color: INK },
  listLine: { fontSize: 16, color: INK, lineHeight: 25, marginBottom: 2 },
  bioText: { marginTop: 8 },
  heart: { position: 'absolute', right: 14, top: 12, color: '#9F6A6A', fontSize: 16 },
  idealDayText: { fontSize: 18, lineHeight: 31, color: INK },
  tapeBottomLeft: { top: undefined, bottom: -7, left: 16, transform: [{ rotate: '7deg' }] },
});
