import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getPublicProfile, reportUser, type PublicProfileResponse } from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';

const LOOKING_FOR_LABEL: Record<string, string> = {
  relation: 'Relation sérieuse', RELATION: 'Relation sérieuse',
  serieux: 'Relation sérieuse', SERIEUX: 'Relation sérieuse',
  flirt: 'Flirt', FLIRT: 'Flirt',
  amitie: 'Amitié', AMITIE: 'Amitié',
  discussion: 'Discussion', DISCUSSION: 'Discussion',
};

const INTERESTED_IN_LABEL: Record<string, string> = {
  F: 'Femmes', FEMME: 'Femmes', women: 'Femmes', WOMEN: 'Femmes',
  M: 'Hommes', HOMME: 'Hommes', men: 'Hommes', MEN: 'Hommes',
  NB: 'Non-binaires', AUTRE: 'Non-binaires', other: 'Non-binaires', OTHER: 'Non-binaires',
};

const PHYSICAL_DESC_LABEL: Record<string, string> = {
  filiforme: 'Filiforme',
  ras_motte: 'Ras des mottes',
  grande_gigue: 'Grande gigue',
  doux: 'Grande beauté intérieure',
  beaute_int: 'Grande beauté intérieure',
  athletique: 'Athlétique',
  costaud: 'En formes généreuses',
  genereuse: 'En formes généreuses',
  mignon: 'Moyenne',
  moyenne: 'Moyenne',
  mysterieux: 'Musclé·e',
  muscle: 'Musclé·e',
};

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function cleanArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : [];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function ProfileDetailScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const currentUser = useStore(s => s.currentUser);

  const [data, setData] = useState<PublicProfileResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);

  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!profileId) {
        setError('Profil introuvable');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const result = await getPublicProfile(profileId);
        if (mounted) setData(result);
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Impossible de charger le profil');
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; };
  }, [profileId]);

  const profile = data?.profile as any;
  const age = useMemo(() => calcAge(profile?.birthDate), [profile?.birthDate]);

  const report = async () => {
    if (!profileId || isOwnProfile || reporting) return;
    try {
      setReporting(true);
      await reportUser(profileId, 'OTHER');
      Alert.alert('Signalement envoyé', 'Merci, le profil sera examiné.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de signaler ce profil');
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#9C2F45" /></View>;
  }

  if (error || !profile) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <AppBackButton onPress={() => router.back()} />
          <Text style={styles.headerTitle}>PROFIL</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}><Text style={styles.errorText}>{error ?? 'Profil introuvable'}</Text></View>
      </View>
    );
  }

  const avatar = resolveAvatarConfig(profile.userId ?? profile.id, profile.avatarConfig, profile.gender, 'ProfileDetailScreen').config;
  const lookingFor = cleanArray(profile.lookingFor).map(v => LOOKING_FOR_LABEL[v] ?? v);
  const interestedIn = cleanArray(profile.interestedIn).map(v => INTERESTED_IN_LABEL[v] ?? v);
  const identityTags = cleanArray(profile.identityTags);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter((s: any) => s?.label || s?.detail).slice(0, 3) : [];
  const physicalDesc = PHYSICAL_DESC_LABEL[String(profile.physicalDesc ?? '')] ?? String(profile.physicalDesc ?? '');

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>PROFIL</Text>
        {isOwnProfile ? (
          <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={styles.headerActionText}>Modifier</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerAction} onPress={report} disabled={reporting}>
            <Text style={styles.headerActionText}>{reporting ? '...' : 'Signaler'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <Avatar size={112} {...avatar} />
          <Text style={styles.name}>{profile.pseudo || profile.name || 'Profil'}</Text>
          <Text style={styles.meta}>{[age ? `${age} ans` : '', profile.city || ''].filter(Boolean).join(' · ')}</Text>
        </View>

        {!!profile.bio && (
          <Section title="BIO / DESCRIPTION">
            <Text style={styles.bodyText}>{String(profile.bio).trim()}</Text>
          </Section>
        )}

        {(lookingFor.length > 0 || interestedIn.length > 0) && (
          <Section title="CE QUE JE RECHERCHE">
            {lookingFor.length > 0 && <Text style={styles.bodyText}>{lookingFor.join(' · ')}</Text>}
            {interestedIn.length > 0 && (
              <View style={styles.lineBlock}>
                <Text style={styles.label}>Intéressé·e par</Text>
                <Text style={styles.bodyText}>{interestedIn.join(' · ')}</Text>
              </View>
            )}
          </Section>
        )}

        {(profile.height || physicalDesc) && (
          <Section title="DESCRIPTION PHYSIQUE">
            {!!profile.height && <Text style={styles.bodyText}>{profile.height} cm</Text>}
            {!!physicalDesc && <Text style={styles.bodyText}>{physicalDesc}</Text>}
          </Section>
        )}

        {(profile.hasChildren !== null && profile.hasChildren !== undefined) || (profile.wantsChildren !== null && profile.wantsChildren !== undefined) ? (
          <Section title="ENFANTS">
            {profile.hasChildren !== null && profile.hasChildren !== undefined && (
              <View style={styles.lineBlock}>
                <Text style={styles.label}>A des enfants</Text>
                <Text style={styles.bodyText}>{profile.hasChildren ? 'Oui' : 'Non'}</Text>
              </View>
            )}
            {profile.wantsChildren !== null && profile.wantsChildren !== undefined && (
              <View style={styles.lineBlock}>
                <Text style={styles.label}>Souhaite avoir des enfants</Text>
                <Text style={styles.bodyText}>{profile.wantsChildren ? 'Oui' : 'Non'}</Text>
              </View>
            )}
          </Section>
        ) : null}

        {identityTags.length > 0 && (
          <Section title="TRAITS D’IDENTITÉ">
            <View style={styles.chipWrap}>
              {identityTags.map((tag, index) => (
                <View style={styles.chip} key={`${tag}-${index}`}>
                  <Text style={styles.chipText}>{tag}</Text>
                </View>
              ))}
            </View>
          </Section>
        )}

        {skills.length > 0 && (
          <Section title="COMPÉTENCES / TALENTS">
            {skills.map((skill: any, index: number) => (
              <View style={styles.skillCard} key={`${skill.label ?? 'skill'}-${index}`}>
                {!!skill.label && <Text style={styles.skillTitle}>{skill.label}</Text>}
                {!!skill.detail && <Text style={styles.bodyText}>{skill.detail}</Text>}
              </View>
            ))}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

const COLORS = {
  background: '#F7F0E5',
  paper: '#FFFDF8',
  border: '#DFD0BC',
  ink: '#34271F',
  muted: '#7D6D5D',
  accent: '#9C2F45',
  soft: '#F4E7DD',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: COLORS.muted, fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.paper },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '900', color: COLORS.ink, letterSpacing: 1.2 },
  headerSpacer: { width: 64 },
  headerAction: { minWidth: 64, alignItems: 'flex-end' },
  headerActionText: { fontSize: 12, fontWeight: '800', color: COLORS.accent },
  scroll: { padding: 16, paddingBottom: 60 },
  hero: { alignItems: 'center', backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 16 },
  name: { marginTop: 10, fontSize: 23, fontWeight: '900', color: COLORS.ink },
  meta: { marginTop: 4, fontSize: 13, color: COLORS.muted },
  section: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginTop: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '900', color: COLORS.ink, letterSpacing: 0.7, marginBottom: 10 },
  bodyText: { fontSize: 14, lineHeight: 21, color: COLORS.ink },
  label: { fontSize: 11, fontWeight: '800', color: COLORS.muted, marginBottom: 3 },
  lineBlock: { marginTop: 10 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: COLORS.soft, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700', color: COLORS.ink },
  skillCard: { backgroundColor: COLORS.soft, borderRadius: 13, padding: 12, marginTop: 8 },
  skillTitle: { fontSize: 14, fontWeight: '800', color: COLORS.ink, marginBottom: 4 },
});
