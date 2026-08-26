import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicProfile, reportUser, type PublicProfileResponse } from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';

const LOOKING_FOR_LABEL: Record<string, { label: string; sub: string }> = {
  relation: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  RELATION: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  serieux: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  SERIEUX: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  flirt: { label: 'Rien de trop sérieux', sub: 'On verra bien où ça mène.' },
  FLIRT: { label: 'Rien de trop sérieux', sub: 'On verra bien où ça mène.' },
  amitie: { label: "Des affinités d'abord", sub: 'Les belles histoires commencent parfois comme ça.' },
  AMITIE: { label: "Des affinités d'abord", sub: 'Les belles histoires commencent parfois comme ça.' },
  discussion: { label: "J'ai vu de la lumière", sub: 'Je suis entré·e, on discute.' },
  DISCUSSION: { label: "J'ai vu de la lumière", sub: 'Je suis entré·e, on discute.' },
};

const INTERESTED_IN_LABEL: Record<string, string> = {
  F: 'Femmes', FEMME: 'Femmes', women: 'Femmes', WOMEN: 'Femmes',
  M: 'Hommes', HOMME: 'Hommes', men: 'Hommes', MEN: 'Hommes',
  NB: 'Non-binaires', AUTRE: 'Non-binaires', other: 'Non-binaires', OTHER: 'Non-binaires',
};

const PHYSICAL_DESC_LABEL: Record<string, { label: string; sub: string }> = {
  filiforme: { label: 'Filiforme', sub: 'Le vent me connaît bien.' },
  ras_motte: { label: 'Ras des mottes', sub: 'Petit format, grande présence.' },
  grande_gigue: { label: 'Grande gigue', sub: 'Les étagères du haut sont pour moi.' },
  doux: { label: 'Grande beauté intérieure', sub: "Et c'est déjà beaucoup." },
  beaute_int: { label: 'Grande beauté intérieure', sub: "Et c'est déjà beaucoup." },
  athletique: { label: 'Athlétique', sub: 'Toujours plus ou moins en mouvement.' },
  costaud: { label: 'En formes généreuses', sub: 'Les courbes ont aussi leur mot à dire.' },
  genereuse: { label: 'En formes généreuses', sub: 'Les courbes ont aussi leur mot à dire.' },
  mignon: { label: 'Dans la moyenne', sub: 'Ni trop, ni pas assez.' },
  moyenne: { label: 'Dans la moyenne', sub: 'Ni trop, ni pas assez.' },
  mysterieux: { label: 'Musclé·e', sub: 'Ça se remarque parfois sous le t-shirt.' },
  muscle: { label: 'Musclé·e', sub: 'Ça se remarque parfois sous le t-shirt.' },
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

type SectionProps = { title: string; note?: string; index: number; children: React.ReactNode };

function PaperSection({ title, note, index, children }: SectionProps) {
  const postIt = index === 1 || index === 4 || index === 6;
  return (
    <View style={[styles.paperSection, index > 0 && styles.paperSectionSeparated]}>
      {index !== 2 && <View style={[styles.tape, index % 3 === 0 ? styles.tapeLeft : styles.tapeRight]} />}
      {postIt && (
        <View style={[styles.postIt, index % 2 === 0 ? styles.postItRight : styles.postItLeft]}>
          <View style={styles.postItLine} />
          <View style={styles.postItLineShort} />
        </View>
      )}
      <Text style={styles.sectionTitle}>{title}</Text>
      {!!note && <Text style={styles.sectionNote}>{note}</Text>}
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
      if (!profileId) { setError('Profil introuvable'); setLoading(false); return; }
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

  const profile = data?.profile;
  const age = useMemo(() => calcAge(profile?.birthDate), [profile?.birthDate]);

  const report = async () => {
    if (!profileId || isOwnProfile || reporting) return;
    try {
      setReporting(true);
      await reportUser(profileId, 'OTHER');
      Alert.alert('Signalement envoyé', 'Merci, le profil sera examiné.');
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de signaler ce profil');
    } finally { setReporting(false); }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#A7324B" /></View>;

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
  const lookingFor = cleanArray(profile.lookingFor).map(v => LOOKING_FOR_LABEL[v] ?? { label: v, sub: '' });
  const interestedIn = cleanArray(profile.interestedIn).map(v => INTERESTED_IN_LABEL[v] ?? v);
  const identityTags = cleanArray(profile.identityTags);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(skill => skill?.label || skill?.detail).slice(0, 3) : [];
  const physical = PHYSICAL_DESC_LABEL[String(profile.physicalDesc ?? '')];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.headerTitle}>PROFIL</Text>
        {isOwnProfile ? (
          <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/edit-profile' as any)}><Text style={styles.headerActionText}>Modifier</Text></TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerAction} onPress={report} disabled={reporting}><Text style={styles.headerActionText}>{reporting ? '...' : 'Signaler'}</Text></TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSheet}>
          <View style={styles.sheetCornerTape} />
          <View style={styles.profileHeader}>
            <View style={styles.avatarBox}><Avatar size={106} {...avatar} /></View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.profilePseudo}>{profile.pseudo || '—'}</Text>
              <Text style={styles.profileAge}>{age != null ? `${age} ans` : 'Âge non précisé'}</Text>
              <Text style={styles.profileCity}>{profile.city || 'Ville non précisée'}</Text>
            </View>
          </View>

          <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses." index={0}>
            <Text style={styles.bodyText}>{profile.bio?.trim() || 'Rien d’écrit pour le moment.'}</Text>
          </PaperSection>

          <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Voilà ce qui lui ressemble aujourd'hui." index={1}>
            {lookingFor.length > 0 ? lookingFor.map((option, i) => (
              <View key={`${option.label}-${i}`} style={styles.bigChoice}>
                <Text style={styles.bigChoiceTitle}>{option.label}</Text>
                {!!option.sub && <Text style={styles.bigChoiceSub}>{option.sub}</Text>}
              </View>
            )) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
            <Text style={styles.labelStandalone}>Qui aimerait-il·elle rencontrer ?</Text>
            <View style={styles.chipWrap}>{interestedIn.length > 0 ? interestedIn.map((item, i) => <View style={styles.chip} key={`${item}-${i}`}><Text style={styles.chipText}>{item}</Text></View>) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}</View>
          </PaperSection>

          <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier." index={2}>
            <View style={styles.infoRow}><Text style={styles.label}>Taille</Text><Text style={styles.value}>{profile.height ? `${profile.height} cm` : '—'}</Text></View>
            <Text style={styles.labelStandalone}>Description physique</Text>
            {physical ? <View style={styles.physicalCard}><Text style={styles.physicalTitle}>{physical.label}</Text><Text style={styles.physicalSub}>{physical.sub}</Text></View> : <Text style={styles.emptyText}>Pas encore précisée.</Text>}
          </PaperSection>

          <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial." index={3}>
            <View style={styles.infoRow}><Text style={styles.label}>As-tu des enfants ?</Text><Text style={styles.value}>{profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Je préfère ne pas préciser'}</Text></View>
            <View style={styles.infoRow}><Text style={styles.label}>Souhaites-tu avoir des enfants ?</Text><Text style={styles.value}>{profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Je ne sais pas encore'}</Text></View>
          </PaperSection>

          <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite." index={4}>
            <View style={styles.chipWrap}>{identityTags.length > 0 ? identityTags.map((tag, i) => <View style={styles.chip} key={`${tag}-${i}`}><Text style={styles.chipText}>{tag}</Text></View>) : <Text style={styles.emptyText}>Aucun trait renseigné pour le moment.</Text>}</View>
          </PaperSection>

          <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte." index={6}>
            {skills.length > 0 ? skills.map((skill, i) => <View style={styles.skillCard} key={`${skill.label || 'skill'}-${i}`}>{!!skill.label && <Text style={styles.skillTitle}>{skill.label}</Text>}{!!skill.detail && <Text style={styles.bodyText}>{skill.detail}</Text>}</View>) : <Text style={styles.emptyText}>Aucun talent déclaré. Ça ne veut pas dire qu’il n’y en a pas.</Text>}
          </PaperSection>
        </View>
      </ScrollView>
    </View>
  );
}

const C = {
  bg: '#F3EBDD', paper: '#FFFDF8', paper2: '#F7EEE4', line: '#DCC9B2', ink: '#34271F',
  muted: '#8D7A67', burgundy: '#A7324B', burgundySoft: '#F5E5E5', tape: '#E6D2B8',
  postIt: '#F4E3A9', postItLine: '#D7C58F', shadow: '#BCA994',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.muted, fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: C.paper },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: C.ink, letterSpacing: 1.6 },
  headerSpacer: { width: 64 },
  headerAction: { minWidth: 64, alignItems: 'flex-end' },
  headerActionText: { fontSize: 13, fontWeight: '800', color: C.burgundy },
  scroll: { padding: 16, paddingBottom: 70 },
  profileSheet: { position: 'relative', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 8, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 24, shadowColor: C.shadow, shadowOpacity: 0.13, shadowRadius: 7, shadowOffset: { width: 1, height: 4 }, elevation: 2 },
  sheetCornerTape: { position: 'absolute', top: -8, left: '43%', width: 92, height: 21, backgroundColor: C.tape, opacity: 0.82, transform: [{ rotate: '-2deg' }] },
  profileHeader: { flexDirection: 'row', alignItems: 'center', paddingBottom: 22, borderBottomWidth: 1, borderBottomColor: '#E8D9C7' },
  avatarBox: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, borderRadius: 8 },
  profileHeaderInfo: { flex: 1, paddingLeft: 18 },
  profilePseudo: { fontSize: 25, fontWeight: '900', color: C.ink },
  profileAge: { marginTop: 7, fontSize: 17, fontWeight: '800', color: C.muted },
  profileCity: { marginTop: 5, fontSize: 15, color: C.muted },
  paperSection: { position: 'relative', paddingVertical: 24, paddingHorizontal: 2 },
  paperSectionSeparated: { borderTopWidth: 1, borderTopColor: '#E8D9C7' },
  tape: { position: 'absolute', top: -7, width: 76, height: 19, backgroundColor: C.tape, opacity: 0.72 },
  tapeLeft: { left: 10, transform: [{ rotate: '-3deg' }] },
  tapeRight: { right: 18, transform: [{ rotate: '2deg' }] },
  postIt: { position: 'absolute', zIndex: 3, width: 70, height: 60, backgroundColor: C.postIt, paddingTop: 15, paddingHorizontal: 10, shadowColor: C.shadow, shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 1, height: 2 }, elevation: 3 },
  postItLeft: { top: -10, left: 118, transform: [{ rotate: '2deg' }] },
  postItRight: { top: -10, right: 18, transform: [{ rotate: '-3deg' }] },
  postItLine: { height: 1, backgroundColor: C.postItLine, opacity: 0.72, marginBottom: 8 },
  postItLineShort: { width: '62%', height: 1, backgroundColor: C.postItLine, opacity: 0.55 },
  sectionTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1.05, color: C.ink, paddingRight: 8 },
  sectionNote: { fontSize: 13, color: C.muted, fontStyle: 'italic', lineHeight: 19, marginTop: 5, marginBottom: 13 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: '#EFE4D8', gap: 16 },
  label: { flex: 1, fontSize: 14, fontWeight: '800', color: C.muted },
  value: { flex: 1, fontSize: 14, fontWeight: '900', color: C.ink, textAlign: 'right' },
  labelStandalone: { fontSize: 14, fontWeight: '900', color: C.ink, marginTop: 17, marginBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 23, color: C.ink },
  emptyText: { fontSize: 13, lineHeight: 20, color: C.muted, fontStyle: 'italic' },
  bigChoice: { backgroundColor: C.burgundySoft, borderRadius: 8, padding: 13, marginTop: 9, borderWidth: 1, borderColor: '#E9CECE' },
  bigChoiceTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
  bigChoiceSub: { fontSize: 13, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, borderRadius: 10, paddingHorizontal: 11, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '800', color: C.ink },
  physicalCard: { marginTop: 2, backgroundColor: C.paper2, borderRadius: 8, padding: 13, borderWidth: 1, borderColor: C.line },
  physicalTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  physicalSub: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  skillCard: { backgroundColor: C.paper2, borderRadius: 8, padding: 12, marginTop: 10, borderWidth: 1, borderColor: '#E9DED1' },
  skillTitle: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 3 },
});