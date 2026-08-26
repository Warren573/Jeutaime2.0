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

type PaperSectionProps = {
  title: string;
  note?: string;
  tone: 'paper' | 'grid' | 'pink' | 'lavender' | 'yellow';
  children: React.ReactNode;
};

function PaperSection({ title, note, tone, children }: PaperSectionProps) {
  return (
    <View style={[styles.noteCard, styles[`tone_${tone}`]]}>
      <View style={styles.cardTape} />
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
    } finally {
      setReporting(false);
    }
  };

  if (loading) {
    return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#A7324B" /></View>;
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
          <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/edit-profile' as any)}>
            <Text style={styles.headerActionText}>Modifier</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.headerAction} onPress={report} disabled={reporting}>
            <Text style={styles.headerActionText}>{reporting ? '...' : 'Signaler'}</Text>
          </TouchableOpacity>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSheet}>
          <View style={styles.sheetTape} />
          <View style={styles.paperClip} />

          <View style={styles.profileHeader}>
            <View style={styles.avatarBox}>
              <Avatar size={106} {...avatar} />
            </View>
            <View style={styles.profileHeaderInfo}>
              <Text style={styles.profilePseudo}>{profile.pseudo || '—'}</Text>
              <View style={styles.underNameLine} />
              <Text style={styles.profileAge}>{age != null ? `${age} ans` : 'Âge non précisé'}</Text>
              <Text style={styles.profileCity}>{profile.city || 'Ville non précisée'}</Text>
            </View>
            <View style={styles.headerNote}>
              <View style={styles.headerNoteLine} />
              <View style={styles.headerNoteLineShort} />
            </View>
          </View>

          <View style={styles.grid}>
            <View style={styles.column}>
              <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses." tone="paper">
                <Text style={styles.bodyText}>{profile.bio?.trim() || 'Rien d’écrit pour le moment.'}</Text>
              </PaperSection>

              <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier." tone="paper">
                <View style={styles.infoRow}><Text style={styles.label}>Taille</Text><Text style={styles.value}>{profile.height ? `${profile.height} cm` : '—'}</Text></View>
                <Text style={styles.labelStandalone}>Description physique</Text>
                {physical ? (
                  <View style={styles.physicalCard}>
                    <Text style={styles.physicalTitle}>{physical.label}</Text>
                    <Text style={styles.physicalSub}>{physical.sub}</Text>
                  </View>
                ) : <Text style={styles.emptyText}>Pas encore précisée.</Text>}
              </PaperSection>

              <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite." tone="lavender">
                <View style={styles.chipWrap}>
                  {identityTags.length > 0 ? identityTags.map((tag, i) => (
                    <View style={styles.chip} key={`${tag}-${i}`}><Text style={styles.chipText}>{tag}</Text></View>
                  )) : <Text style={styles.emptyText}>Aucun trait renseigné pour le moment.</Text>}
                </View>
              </PaperSection>
            </View>

            <View style={styles.column}>
              <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Voilà ce qui lui ressemble aujourd'hui." tone="paper">
                {lookingFor.length > 0 ? lookingFor.map((option, i) => (
                  <View key={`${option.label}-${i}`} style={styles.bigChoice}>
                    <Text style={styles.bigChoiceTitle}>{option.label}</Text>
                    {!!option.sub && <Text style={styles.bigChoiceSub}>{option.sub}</Text>}
                  </View>
                )) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
                <Text style={styles.labelStandalone}>Qui aimerait-il·elle rencontrer ?</Text>
                <View style={styles.chipWrap}>
                  {interestedIn.length > 0 ? interestedIn.map((item, i) => (
                    <View style={styles.chip} key={`${item}-${i}`}><Text style={styles.chipText}>{item}</Text></View>
                  )) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
                </View>
              </PaperSection>

              <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial." tone="grid">
                <View style={styles.questionBlock}>
                  <Text style={styles.question}>As-tu des enfants ?</Text>
                  <Text style={styles.answer}>{profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Je préfère ne pas préciser'}</Text>
                </View>
                <View style={styles.questionBlock}>
                  <Text style={styles.question}>Souhaites-tu avoir des enfants ?</Text>
                  <Text style={styles.answer}>{profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Je ne sais pas encore'}</Text>
                </View>
              </PaperSection>

              <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte." tone="yellow">
                {skills.length > 0 ? skills.map((skill, i) => (
                  <View style={styles.skillCard} key={`${skill.label || 'skill'}-${i}`}>
                    {!!skill.label && <Text style={styles.skillTitle}>{skill.label}</Text>}
                    {!!skill.detail && <Text style={styles.bodyText}>{skill.detail}</Text>}
                  </View>
                )) : <Text style={styles.emptyText}>Aucun talent déclaré. Ça ne veut pas dire qu’il n’y en a pas.</Text>}
              </PaperSection>
            </View>
          </View>

          <View style={styles.reportStrip}>
            <View style={styles.reportPaperClip} />
            <Text style={styles.reportText}>Tu peux toujours signaler ou bloquer ce profil si quelque chose cloche.</Text>
            {!isOwnProfile && (
              <TouchableOpacity onPress={report} disabled={reporting}>
                <Text style={styles.reportAction}>{reporting ? '...' : 'Signaler / Bloquer →'}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const C = {
  bg: '#F3EBDD', paper: '#FFFDF8', gridPaper: '#F9F7F0', pinkPaper: '#F6E6E6',
  lavender: '#EDE5F2', yellow: '#F3E4A8', paper2: '#F7EEE4', line: '#D9C5AC',
  ink: '#34271F', muted: '#8D7A67', burgundy: '#A7324B', tape: '#DCC7A9',
  shadow: '#B8A58E', gridLine: '#D8D4C8',
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
  scroll: { padding: 14, paddingBottom: 70 },
  profileSheet: { position: 'relative', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 2, padding: 12, shadowColor: C.shadow, shadowOpacity: 0.2, shadowRadius: 7, shadowOffset: { width: 1, height: 4 }, elevation: 2 },
  sheetTape: { position: 'absolute', zIndex: 5, top: -9, left: '44%', width: 92, height: 21, backgroundColor: C.tape, opacity: 0.8, transform: [{ rotate: '-4deg' }] },
  paperClip: { position: 'absolute', zIndex: 6, top: 15, left: 10, width: 26, height: 55, borderLeftWidth: 2, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#9D9386', borderRadius: 13, transform: [{ rotate: '-12deg' }] },
  profileHeader: { position: 'relative', flexDirection: 'row', alignItems: 'center', minHeight: 165, padding: 10, paddingLeft: 34, borderBottomWidth: 1, borderBottomColor: '#E4D9C9' },
  avatarBox: { width: 128, height: 128, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, borderRadius: 10 },
  profileHeaderInfo: { flex: 1, paddingLeft: 18 },
  profilePseudo: { fontSize: 26, fontWeight: '900', color: C.ink },
  underNameLine: { width: 150, height: 2, backgroundColor: C.burgundy, marginTop: 3, marginBottom: 10, transform: [{ rotate: '-2deg' }] },
  profileAge: { fontSize: 16, fontWeight: '900', color: C.ink, marginTop: 2 },
  profileCity: { fontSize: 15, color: C.muted, marginTop: 7 },
  headerNote: { position: 'absolute', right: 8, bottom: 22, width: 94, height: 70, backgroundColor: '#F0C9C6', padding: 12, transform: [{ rotate: '4deg' }], shadowColor: C.shadow, shadowOpacity: 0.15, shadowRadius: 3, shadowOffset: { width: 1, height: 2 } },
  headerNoteLine: { height: 1, backgroundColor: '#C99591', marginBottom: 8, opacity: 0.7 },
  headerNoteLineShort: { width: '65%', height: 1, backgroundColor: '#C99591', opacity: 0.55 },
  grid: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingTop: 16 },
  column: { flex: 1, gap: 10 },
  noteCard: { position: 'relative', padding: 14, borderWidth: 1, borderColor: C.line, borderRadius: 2, shadowColor: C.shadow, shadowOpacity: 0.14, shadowRadius: 4, shadowOffset: { width: 1, height: 2 }, elevation: 1, overflow: 'visible' },
  tone_paper: { backgroundColor: C.paper },
  tone_grid: { backgroundColor: C.gridPaper },
  tone_pink: { backgroundColor: C.pinkPaper },
  tone_lavender: { backgroundColor: C.lavender },
  tone_yellow: { backgroundColor: C.yellow },
  cardTape: { position: 'absolute', top: -6, left: 18, width: 66, height: 18, backgroundColor: C.tape, opacity: 0.8, transform: [{ rotate: '-3deg' }] },
  sectionTitle: { fontSize: 16, lineHeight: 20, fontWeight: '900', letterSpacing: 0.65, color: C.ink, paddingRight: 4 },
  sectionNote: { fontSize: 11.5, lineHeight: 17, color: C.muted, fontStyle: 'italic', marginTop: 5, marginBottom: 10 },
  bodyText: { fontSize: 13, lineHeight: 19, color: C.ink },
  emptyText: { fontSize: 12, lineHeight: 18, color: C.muted, fontStyle: 'italic' },
  bigChoice: { backgroundColor: C.pinkPaper, borderWidth: 1, borderColor: '#E5CACA', padding: 10, marginTop: 7, transform: [{ rotate: '-1deg' }] },
  bigChoiceTitle: { fontSize: 14, lineHeight: 18, fontWeight: '900', color: C.ink },
  bigChoiceSub: { fontSize: 11.5, lineHeight: 16, color: C.muted, fontStyle: 'italic', marginTop: 2 },
  labelStandalone: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: C.ink, marginTop: 13, marginBottom: 7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#F7EEE4', borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  chipText: { fontSize: 11.5, fontWeight: '800', color: C.ink },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#E5DACD', gap: 10 },
  label: { flex: 1, fontSize: 12.5, fontWeight: '800', color: C.ink },
  value: { flex: 1, fontSize: 12.5, fontWeight: '900', color: C.ink, textAlign: 'right' },
  physicalCard: { marginTop: 4, backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, padding: 10, borderRadius: 7 },
  physicalTitle: { fontSize: 13.5, fontWeight: '900', color: C.ink },
  physicalSub: { fontSize: 11.5, lineHeight: 16, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  questionBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gridLine },
  question: { fontSize: 12.5, lineHeight: 17, fontWeight: '800', color: C.ink },
  answer: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 5, fontSize: 11.5, fontWeight: '800', color: C.ink },
  skillCard: { backgroundColor: 'rgba(255,253,248,0.55)', borderWidth: 1, borderStyle: 'dashed', borderColor: '#B8A36B', padding: 9, marginTop: 8, borderRadius: 5 },
  skillTitle: { fontSize: 13.5, fontWeight: '900', color: C.ink, marginBottom: 3 },
  reportStrip: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14, padding: 11, backgroundColor: '#F7F0E6', borderWidth: 1, borderColor: C.line, minHeight: 52 },
  reportPaperClip: { position: 'absolute', left: 9, top: -10, width: 18, height: 30, borderLeftWidth: 2, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#9D9386', borderRadius: 9, transform: [{ rotate: '-10deg' }] },
  reportText: { flex: 1, paddingLeft: 10, fontSize: 10.5, lineHeight: 15, color: C.muted },
  reportAction: { fontSize: 11, fontWeight: '900', color: C.burgundy },
});
