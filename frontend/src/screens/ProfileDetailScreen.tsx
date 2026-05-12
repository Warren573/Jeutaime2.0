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
import { getRelationInfo } from '../engine/RelationEngine';

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
  const { id } = useLocalSearchParams<{ id: string }>();

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
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getPublicProfile(id);
        const media = await getMyPhotos(id).catch(() => []);
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
  }, [id]);

  const profile = profileData?.profile;
  const myId = currentUser?.id ?? '';
  const linkedMatch = matches.find((m) => m.userAId === id || m.userBId === id);
  const linkedRawMatch = apiMatches.find((m) => m.otherUserId === id || m.userAId === id || m.userBId === id);
  const letterCount = linkedRawMatch
    ? linkedRawMatch.letterCountA + linkedRawMatch.letterCountB
    : linkedMatch
      ? linkedMatch.letterCount
      : letters.filter((l) => l.fromUserId === id || l.toUserId === id || (myId && (l.fromUserId === myId || l.toUserId === myId))).length;
  const rel = getRelationInfo(letterCount, currentUser?.isPremium ?? false);

  const age = useMemo(() => calcAge(profile?.birthDate ?? null), [profile?.birthDate]);
  const headerLine = [profile?.pseudo ?? 'Profil', age ? String(age) : ''].filter(Boolean).join(', ');
  const lookingFor = (profile?.lookingFor ?? []).map((k) => LOOKING_FOR_LABEL[k] ?? k).join(' · ');
  const interests = (profile?.interests ?? []).join(' · ');
  const effectiveBio = (profile?.bio ?? '').trim();
  const interestedIn = (profile?.interestedIn ?? []).join(' · ');
  const children = childrenLabel(profile?.hasChildren ?? null, profile?.wantsChildren ?? null);
  const idealDayParts = (profile?.idealDay ?? []).filter(Boolean);
  const plus = (profile?.qualities ?? []).join(' · ');
  const minus = (profile?.defaults ?? []).join(' · ');
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
          <Text style={styles.pageTitle}>Mon journal de bord</Text>

          <View style={styles.hero}>
            <View style={styles.photoCard}>
              <View style={styles.photoTape} />
              {firstPhoto ? (
                <Image source={{ uri: makePhotoUrl(firstPhoto), headers: authToken ? { Authorization: `Bearer ${authToken}` } : {} }} style={styles.photoImg} contentFit="cover" cachePolicy="none" />
              ) : (
                <View style={styles.photoPlaceholder}><Avatar size={106} {...avatarDef} /></View>
              )}
            </View>
            <View style={styles.heroRight}>
              <Text style={styles.heroName}>{headerLine}</Text>
              {!!profile.city && <Text style={styles.heroCity}>📍 {profile.city}</Text>}
              <Text style={styles.heroCity}>{rel.stars} Niveau {Math.max(1, Math.min(3, rel.level))} — {rel.label}</Text>
              {rel.progressText ? <Text style={styles.heroProgress}>{rel.progressText}</Text> : null}
            </View>
          </View>

          <View style={[styles.block, styles.blockWide, styles.tapedBlock]}>
            <View style={styles.cardTape} />
            <Text style={styles.kicker}>UN PEU DE MOI</Text>
            <Text style={styles.bodyText}>{effectiveBio || 'Encore un peu de mystère pour le moment.'}</Text>
          </View>

          <View style={[styles.block, styles.blockPink, styles.featureBlock, styles.pullUp]}>
            <Text style={styles.kicker}>CE QUE JE CHERCHE ICI</Text>
            <Text style={styles.bodyText}>{lookingFor || 'Continuer une vraie conversation'}</Text>
          </View>
          <View style={styles.freeLineWrap}>
            <Text style={styles.freeLineLabel}>Intéressé·e par :</Text>
            <Text style={styles.freeLineText}>{interestedIn || 'Le feeling avant les étiquettes'}</Text>
          </View>

          <View style={[styles.block, styles.quoteBlock, styles.tapedBlock]}>
            <View style={[styles.cardTape, styles.tapeRight]} />
            <Text style={styles.quoteMark}>“</Text>
            <Text style={[styles.bodyText, styles.italic, styles.quoteText]}>{profile.quote || 'À écrire bientôt'}</Text>
          </View>

          <View style={styles.interestsEditorial}>
            <Text style={styles.kicker}>CENTRES D’INTÉRÊT</Text>
            <Text style={styles.bodyText}>{interests || 'À découvrir au fil des lettres'}</Text>
          </View>

          <View style={styles.editorialRow}>
            <View style={[styles.block, styles.blockPink, styles.featureBlock, styles.idealDayMain, styles.withSoftTape]}>
              <View style={[styles.cardTape, styles.tapeLeftSoft]} />
              <Text style={styles.kicker}>SA JOURNÉE IDÉALE</Text>
              <Text style={styles.bodyText}>{idealDayParts.length ? idealDayParts.map((s, i) => `${i + 1}. ${s}`).join('\n\n') : 'À improviser à deux'}</Text>
            </View>
            <View style={styles.sideNoteWrap}>
            <View style={[styles.block, styles.outlinedBlock, styles.editorialNote]}>
              <Text style={styles.kicker}>CE QUE JE GÈRE (plus ou moins bien)</Text>
              <Text style={styles.bodyText}>{profile.vibe || 'À ressentir en discutant'}</Text>
            </View>
            </View>
          </View>

          <View style={[styles.block, styles.blockWarm, styles.featureBlock, styles.spaciousBlock, styles.plusMinusBlock]}>
            <Text style={styles.kicker}>SES PETITS + ET SES PETITS -</Text>
            <Text style={styles.bodyText}>{plus || 'Qualités à découvrir'}</Text>
            <Text style={[styles.kicker, styles.subKicker]}>CE QUI DEMANDE UN PEU D’INDULGENCE</Text>
            <Text style={styles.bodyText}>{minus || 'Défauts assumés avec humour'}</Text>
          </View>
          <View style={[styles.block, styles.blockSoft, styles.fullWidthAir]}>
            <Text style={styles.kicker}>INFOS PERSO</Text>
            <Text style={[styles.kicker, styles.subKicker]}>DESCRIPTION PHYSIQUE</Text>
            <Text style={styles.bodyText}>{profile.physicalDesc || 'À découvrir en personne'}</Text>
            <Text style={[styles.kicker, styles.subKicker]}>ENFANTS</Text>
            <Text style={styles.bodyText}>{children || 'Sujet ouvert à la discussion'}</Text>
          </View>
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
  pageTitle: { fontSize: 34, fontWeight: '900', color: INK, marginBottom: 14, marginLeft: 6, transform: [{ rotate: '-1.2deg' }] },
  hero: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 18 },
  photoCard: { width: 106, height: 126, backgroundColor: '#FFF', borderRadius: 6, borderWidth: 1, borderColor: '#E7DAC8', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  photoTape: { position: 'absolute', top: -6, alignSelf: 'center', width: 38, height: 14, backgroundColor: '#E7D5BF', borderRadius: 2, transform: [{ rotate: '-8deg' }], zIndex: 2 },
  photoImg: { width: 106, height: 126, borderRadius: 6 },
  photoPlaceholder: { width: 106, height: 126, borderRadius: 6, backgroundColor: '#F3EDE3', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  heroRight: { flex: 1, paddingTop: 4 },
  heroName: { fontSize: 28, fontWeight: '800', color: INK, lineHeight: 34, marginBottom: 4 },
  heroCity: { fontSize: 14, color: INK_S },
  heroProgress: { marginTop: 4, fontSize: 12, color: INK_S, fontStyle: 'italic' },
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
  pullUp: { marginTop: -2, marginBottom: 20 },
  editorialRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6, marginTop: 6 },
  idealDayMain: { flex: 1.45, marginBottom: 0, borderRadius: 22, transform: [{ rotate: '-0.8deg' }], minHeight: 280 },
  sideNoteWrap: { flex: 0.98, marginTop: 28, marginLeft: -6 },
  editorialNote: { marginBottom: 0, borderRadius: 9, paddingHorizontal: 14, paddingVertical: 13, transform: [{ rotate: '1.5deg' }], backgroundColor: '#F9F0E6' },
  withSoftTape: { position: 'relative', overflow: 'visible' },
  tapeLeftSoft: { left: 44, width: 38, height: 13, top: -6, opacity: 0.62, transform: [{ rotate: '-11deg' }] },
  tapedBlock: { position: 'relative', overflow: 'visible' },
  cardTape: { position: 'absolute', top: -7, left: 28, width: 46, height: 15, backgroundColor: '#E6D2B8', borderRadius: 2, transform: [{ rotate: '-7deg' }], zIndex: 3, opacity: 0.9 },
  tapeRight: { right: 30, transform: [{ rotate: '9deg' }] },
  quoteBlock: { backgroundColor: '#F8E5E0', alignItems: 'center', paddingVertical: 42, minHeight: 260, marginRight: 10, marginLeft: 4, transform: [{ rotate: '-0.7deg' }] },
  quoteMark: { fontSize: 44, color: '#A45056', marginBottom: 8, fontWeight: '700' },
  kicker: { fontSize: 14, color: INK, fontWeight: '800', letterSpacing: 0.3, marginBottom: 8 },
  bodyText: { fontSize: 16, lineHeight: 24, color: INK },
  subKicker: { marginTop: 16 },
  quoteText: { textAlign: 'center', maxWidth: '92%' },
  italic: { fontStyle: 'italic' },
  interestsEditorial: { marginTop: 2, marginBottom: 20, marginLeft: 14, marginRight: 28, paddingHorizontal: 2 },
  plusMinusBlock: { marginLeft: -4, marginRight: 14, borderRadius: 24, transform: [{ rotate: '0.6deg' }] },
  freeLineWrap: { marginTop: -6, marginBottom: 18, marginLeft: 10, marginRight: 34 },
  freeLineLabel: { fontSize: 14, color: INK, fontWeight: '800', marginBottom: 4 },
  freeLineText: { fontSize: 16, lineHeight: 24, color: INK },
});
