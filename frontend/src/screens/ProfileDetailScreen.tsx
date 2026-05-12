import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { API_URL } from '../api/client';
import {
  getMyPhotos,
  getPublicProfile,
  type MyPhotoDto,
  type PublicProfileResponse,
} from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { DEFAULT_AVATAR, type AvatarConfig } from '../avatar/png/defaults';
import { useStore } from '../store/useStore';

function makePhotoUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http')) return url;
  return API_URL + url.replace(/^\/api/, '');
}

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const date = new Date(birthDate);
  if (Number.isNaN(date.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - date.getFullYear();

  if (
    now.getMonth() < date.getMonth() ||
    (now.getMonth() === date.getMonth() && now.getDate() < date.getDate())
  ) {
    age--;
  }

  return age;
}

function cleanText(value?: string | null): string {
  return typeof value === 'string' ? value.trim() : '';
}

function cleanArray(value?: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: "J'ai vu de la lumière, je suis entré·e",
  RELATION: "J'ai vu de la lumière, je suis entré·e",
  serieux: "Je cherche l'âme sœur",
  SERIEUX: "Je cherche l'âme sœur",
  serious: "Je cherche l'âme sœur",
  SERIOUS: "Je cherche l'âme sœur",
  flirt: 'Rien de trop sérieux',
  FLIRT: 'Rien de trop sérieux',
  fun: 'Rien de trop sérieux',
  FUN: 'Rien de trop sérieux',
  amitie: "Des affinités, d'abord",
  AMITIE: "Des affinités, d'abord",
  friendship: "Des affinités, d'abord",
  FRIENDSHIP: "Des affinités, d'abord",
  discussion: 'Je cherche à discuter',
  DISCUSSION: 'Je cherche à discuter',
};

const INTERESTED_IN_LABEL: Record<string, string> = {
  men: 'Hommes',
  MEN: 'Hommes',
  homme: 'Hommes',
  HOMME: 'Hommes',
  hommes: 'Hommes',
  HOMMES: 'Hommes',
  women: 'Femmes',
  WOMEN: 'Femmes',
  femme: 'Femmes',
  FEMME: 'Femmes',
  femmes: 'Femmes',
  FEMMES: 'Femmes',
  other: 'Non-binaires',
  OTHER: 'Non-binaires',
  autre: 'Non-binaires',
  AUTRE: 'Non-binaires',
};

const PHYSIQUE_LABEL: Record<string, string> = {
  filiforme: 'Filiforme',
  ras_motte: 'Ras motte',
  grande_gigue: 'Grande gigue',
  doux: 'Grande beauté intérieure',
  athletique: 'Athlétique',
  costaud: 'En formes généreuses',
  mignon: 'Moyenne',
  mysterieux: 'Musclé•e',
};

function childrenLabel(hasChildren?: string | null, wantsChildren?: string | null): string {
  const parts: string[] = [];

  if (hasChildren) {
    const value = String(hasChildren).trim();
    if (value) parts.push(value);
  }

  if (wantsChildren) {
    const value = String(wantsChildren).trim();
    if (value) parts.push(value);
  }

  return parts.join(' · ');
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();

  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;

  const currentUser = useStore((s) => s.currentUser);

  const [profileData, setProfileData] = useState<PublicProfileResponse | null>(null);
  const [ownPhotos, setOwnPhotos] = useState<MyPhotoDto[]>([]);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let mounted = true;

    async function load() {
      if (!profileId) {
        setError('Profil introuvable');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const token = await AsyncStorage.getItem('auth_token');
        if (mounted) setAuthToken(token);

        const publicProfile = await getPublicProfile(profileId);
        if (!mounted) return;

        setProfileData(publicProfile);

        if (isOwnProfile) {
          const photos = await getMyPhotos(profileId).catch(() => []);
          if (mounted) setOwnPhotos(photos);
        }
      } catch (e) {
        if (!mounted) return;
        setError(e instanceof Error ? e.message : 'Erreur chargement profil');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [profileId, isOwnProfile]);

  const profile = profileData?.profile;

  const age = useMemo(() => calcAge(profile?.birthDate), [profile?.birthDate]);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#9C7A4D" />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <TopBar title="Profil" onBack={() => router.back()} />
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'Profil introuvable'}</Text>
        </View>
      </View>
    );
  }

  const avatarDef =
    profile.avatarConfig && Object.keys(profile.avatarConfig).length > 0
      ? (profile.avatarConfig as unknown as AvatarConfig)
      : DEFAULT_AVATAR;

  const publicPhotos = profileData?.photos ?? [];
  const photos = isOwnProfile ? ownPhotos : publicPhotos;

  const firstPhoto = photos.find((photo: any) => !photo.isPrivate)?.url ?? photos[0]?.url;
  const photoUnlocked = isOwnProfile || Boolean(profileData?.photoUnlock?.unlocked);
  const shouldShowPhoto = photoUnlocked && Boolean(firstPhoto);

  const imageHeaders = authToken ? { Authorization: `Bearer ${authToken}` } : {};

  const headerLine = [profile.pseudo, age ? `${age} ans` : ''].filter(Boolean).join(', ');

  const lookingFor = cleanArray(profile.lookingFor)
    .map((item) => LOOKING_FOR_LABEL[item] ?? item)
    .join(' · ');

  const interestedIn = cleanArray(profile.interestedIn)
    .map((item) => INTERESTED_IN_LABEL[item] ?? item)
    .join(' · ');

  const city = cleanText(profile.city);
  const height = profile.height ? `${profile.height} cm` : '';
  const physicalDescRaw = cleanText(profile.physicalDesc);
  const physicalDesc = PHYSIQUE_LABEL[physicalDescRaw] ?? physicalDescRaw;
  const children = childrenLabel(profile.hasChildren, profile.wantsChildren);

  const bio = cleanText(profile.bio);
  const interests = cleanArray(profile.interests);
  const qualities = cleanArray(profile.qualities);
  const defaults = cleanArray(profile.defaults);
  const idealDay = cleanArray(profile.idealDay);
  const quote = cleanText(profile.quote);
  const vibe = cleanText(profile.vibe);
  const identityTags = cleanArray(profile.identityTags);

  const skills = Array.isArray(profile.skills)
    ? profile.skills.filter((skill: any) => skill?.label || skill?.detail)
    : [];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TopBar title={profile.pseudo ?? 'Profil'} onBack={() => router.back()} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.page}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.title}>Mon journal de bord</Text>
              <View style={styles.divider} />
              <Text style={styles.mood}>Quelques pages pour se dévoiler doucement.</Text>

              {!!headerLine && <Text style={styles.name}>{headerLine}</Text>}
              {!!city && <Text style={styles.city}>{city}</Text>}
            </View>

            <View style={styles.polaroid}>
              <View style={styles.tapeTop} />

              {shouldShowPhoto ? (
                <Image
                  source={{
                    uri: makePhotoUrl(firstPhoto),
                    headers: imageHeaders,
                  }}
                  style={styles.photo}
                  contentFit="cover"
                  cachePolicy="none"
                />
              ) : (
                <View style={styles.avatarWrap}>
                  <Avatar size={80} {...avatarDef} />
                </View>
              )}
            </View>
          </View>

          <View style={[styles.card, styles.searchCard]}>
            <View style={styles.smallTapeRight} />
            <Text style={styles.sectionTitle}>CE QUE JE CHERCHE ICI</Text>
            <Text style={styles.text}>{lookingFor || "(vide)"}</Text>
            <Text style={styles.heart}>♡</Text>
          </View>

          <View style={styles.freeLine}>
            <Text style={styles.freeLabel}>Intéressé·e par :</Text>
            <Text style={styles.freeText}>{interestedIn || "(vide)"}</Text>
          </View>

          <View style={[styles.card, styles.aboutCard]}>
            <Text style={styles.sectionTitle}>UN PEU DE MOI</Text>
            {!!city && <Text style={styles.listText}>📍 {city}</Text>}
            {!!height && <Text style={styles.listText}>📏 {height}</Text>}
            {!!physicalDesc && <Text style={styles.listText}>⚖️ {physicalDesc}</Text>}
            {!!children && <Text style={styles.listText}>👶 {children}</Text>}
            {!city && !height && !physicalDesc && !children && <Text style={styles.listText}>(vide)</Text>}
          </View>

          <View style={[styles.card, styles.bioCard]}>
            <Text style={styles.sectionTitle}>BIO / DESCRIPTION</Text>
            <Text style={styles.text}>{bio || "(vide)"}</Text>
          </View>

          <View style={styles.interestsBlock}>
            <Text style={styles.sectionTitle}>CENTRES D’INTÉRÊT</Text>
            <View style={styles.badges}>
              {interests.length > 0 ? (
                interests.map((interest, index) => (
                  <View key={`${interest}-${index}`} style={styles.badge}>
                    <Text style={styles.badgeText}>{interest}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.badgeText}>(vide)</Text>
              )}
            </View>
          </View>

          <View style={[styles.card, styles.skillsCard]}>
            <Text style={styles.sectionTitle}>CE QUE JE GÈRE (plus ou moins bien)</Text>
            {skills.length > 0 ? (
              skills.map((skill: any, index: number) => (
                <View key={`${skill.label}-${index}`} style={styles.skillLine}>
                  <Text style={styles.skillName}>
                    {skill.emoji ? `${skill.emoji} ` : ""}
                    {skill.label}
                  </Text>
                  {!!skill.level && <Text style={styles.skillLevel}>{skill.level}%</Text>}
                  {!!skill.detail && <Text style={styles.skillDetail}>{skill.detail}</Text>}
                </View>
              ))
            ) : (
              <Text style={styles.listText}>(vide)</Text>
            )}
          </View>

          <View style={styles.plusMinusSection}>
            <Text style={styles.sectionTitle}>SES PETITS + ET SES PETITS -</Text>
            <View style={styles.plusMinusRow}>
              <View style={[styles.card, styles.plusCard]}>
                {qualities.length > 0 ? (
                  qualities.map((item, index) => (
                    <Text key={`${item}-${index}`} style={styles.listText}>
                      ✅ {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.listText}>(vide)</Text>
                )}
              </View>
              <View style={[styles.card, styles.minusCard]}>
                {defaults.length > 0 ? (
                  defaults.map((item, index) => (
                    <Text key={`${item}-${index}`} style={styles.listText}>
                      ❌ {item}
                    </Text>
                  ))
                ) : (
                  <Text style={styles.listText}>(vide)</Text>
                )}
              </View>
            </View>
          </View>

          <View style={[styles.card, styles.idealCard]}>
            <View style={styles.smallTapeRight} />
            <View style={styles.smallTapeLeftBottom} />
            <Text style={styles.sectionTitle}>SA JOURNÉE IDÉALE</Text>
            <Text style={styles.idealText}>{idealDay.length > 0 ? idealDay.join("\n\n") : "(vide)"}</Text>
          </View>

          <View style={[styles.card, styles.quoteCard]}>
            <Text style={styles.quoteText}>”{quote || "(vide)"}”</Text>
          </View>

          <View style={[styles.card, styles.vibeCard]}>
            <Text style={styles.sectionTitle}>VIBE / AMBIANCE</Text>
            <Text style={styles.text}>{vibe || "(vide)"}</Text>
          </View>

          <View style={styles.interestsBlock}>
            <Text style={styles.sectionTitle}>QUI JE SUIS</Text>
            <View style={styles.badges}>
              {identityTags.length > 0 ? (
                identityTags.map((tag, index) => (
                  <View key={`${tag}-${index}`} style={styles.badge}>
                    <Text style={styles.badgeText}>{tag}</Text>
                  </View>
                ))
              ) : (
                <Text style={styles.badgeText}>(vide)</Text>
              )}
            </View>
        </View>
      </ScrollView>
    </View>
  );
}

function TopBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <View style={styles.navBar}>
      <TouchableOpacity onPress={onBack}>
        <Text style={styles.backText}>← Retour</Text>
      </TouchableOpacity>
      <Text style={styles.navTitle} numberOfLines={1}>
        {title}
      </Text>
      <View style={{ width: 70 }} />
    </View>
  );
}

const BG = '#EFE4D4';
const INK = '#2B1B12';
const MUTED = '#7C5A43';
const BORDER = '#E3D1B9';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 13,
    backgroundColor: '#2C1A0E',
    borderBottomWidth: 1,
    borderBottomColor: '#5A3A1A',
  },

  backText: {
    fontSize: 15,
    color: '#F0D98C',
    fontWeight: '700',
  },

  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '800',
    color: '#F0D98C',
  },

  errorText: {
    color: MUTED,
    fontSize: 16,
  },

  scroll: {
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 70,
  },

  page: {
    paddingHorizontal: 0,
    paddingBottom: 30,
  },

  header: {
    position: 'relative',
    minHeight: 185,
    marginBottom: 18,
  },

  headerLeft: {
    width: '62%',
    paddingTop: 0,
  },

  title: {
    fontSize: 31,
    lineHeight: 36,
    fontWeight: '900',
    color: INK,
    letterSpacing: -0.7,
  },

  divider: {
    height: 1,
    backgroundColor: '#BCA88E',
    marginTop: 12,
    marginBottom: 12,
    width: '100%',
  },

  mood: {
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
    fontStyle: 'italic',
    marginBottom: 18,
  },

  name: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    color: INK,
    marginBottom: 2,
  },

  city: {
    fontSize: 17,
    color: MUTED,
  },

  polaroid: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 96,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 6,
    borderWidth: 1,
    borderColor: '#E5D7C5',
    transform: [{ rotate: '1.5deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.09,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },

  tapeTop: {
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

  photo: {
    width: '100%',
    height: 104,
    borderRadius: 4,
  },

  avatarWrap: {
    width: '100%',
    height: 104,
    borderRadius: 4,
    backgroundColor: '#F3EBDD',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },

  card: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 16,
    backgroundColor: '#F6E8D4',
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: INK,
    letterSpacing: 0.5,
    marginBottom: 9,
  },

  text: {
    fontSize: 16,
    lineHeight: 25,
    color: INK,
  },

  searchCard: {
    backgroundColor: '#F3E6C9',
    borderColor: '#DEC99D',
    paddingRight: 42,
    position: 'relative',
  },

  heart: {
    position: 'absolute',
    right: 17,
    top: 16,
    fontSize: 18,
    color: '#A06A6A',
  },

  freeLine: {
    marginTop: -4,
    marginBottom: 20,
    marginLeft: 10,
    marginRight: 32,
  },

  freeLabel: {
    fontSize: 14,
    fontWeight: '900',
    color: INK,
    marginBottom: 4,
  },

  freeText: {
    fontSize: 16,
    lineHeight: 24,
    color: INK,
  },

  aboutCard: {
    backgroundColor: '#F6EAD8',
    borderLeftWidth: 4,
    borderLeftColor: '#B57A60',
    marginRight: 22,
    paddingVertical: 20,
    transform: [{ rotate: '-0.5deg' }],
  },

  bioCard: {
    backgroundColor: '#F8EDDF',
    paddingVertical: 20,
  },

  interestsBlock: {
    marginBottom: 20,
    paddingHorizontal: 4,
  },

  badges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  badge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: '#EFE0CA',
    borderWidth: 1,
    borderColor: '#E4D0B0',
  },

  badgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: INK,
  },

  skillsCard: {
    backgroundColor: '#FBF3E8',
    borderStyle: 'dashed',
  },

  skillLine: {
    marginBottom: 10,
  },

  skillName: {
    fontSize: 16,
    fontWeight: '800',
    color: INK,
  },

  skillLevel: {
    marginTop: 2,
    fontSize: 14,
    fontWeight: '800',
    color: '#A06A6A',
  },

  skillDetail: {
    marginTop: 2,
    fontSize: 15,
    lineHeight: 22,
    color: MUTED,
  },

  plusMinusSection: {
    marginBottom: 16,
  },

  plusMinusRow: {
    flexDirection: 'row',
    gap: 10,
  },

  plusCard: {
    flex: 1.08,
    backgroundColor: '#F7EBD9',
    paddingVertical: 14,
  },

  minusCard: {
    flex: 0.92,
    backgroundColor: '#F6E3DD',
    paddingVertical: 14,
    marginTop: 8,
  },

  listText: {
    fontSize: 16,
    lineHeight: 25,
    color: INK,
    marginBottom: 2,
  },

  idealCard: {
    backgroundColor: '#F7E1DE',
    borderColor: '#E8C2BA',
    paddingVertical: 22,
    paddingHorizontal: 18,
    marginTop: 4,
    marginBottom: 22,
    position: 'relative',
  },

  idealText: {
    fontSize: 18,
    lineHeight: 31,
    color: INK,
  },

  quoteCard: {
    backgroundColor: '#F7E1DE',
    borderColor: '#E8C2BA',
    paddingVertical: 26,
    paddingHorizontal: 20,
  },

  quoteText: {
    fontSize: 18,
    lineHeight: 30,
    textAlign: 'center',
    fontStyle: 'italic',
    color: INK,
  },

  vibeCard: {
    backgroundColor: '#F2E3CF',
  },

  smallTapeRight: {
    position: 'absolute',
    top: -7,
    right: 32,
    width: 44,
    height: 15,
    backgroundColor: '#E7D2B8',
    borderRadius: 2,
    transform: [{ rotate: '8deg' }],
    zIndex: 10,
    opacity: 0.9,
  },

  smallTapeLeftBottom: {
    position: 'absolute',
    bottom: -7,
    left: 18,
    width: 44,
    height: 15,
    backgroundColor: '#E7D2B8',
    borderRadius: 2,
    transform: [{ rotate: '7deg' }],
    zIndex: 10,
    opacity: 0.9,
  },
});
