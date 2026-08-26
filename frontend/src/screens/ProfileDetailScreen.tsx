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
  variant?: 'a' | 'b' | 'c' | 'd';
  children: React.ReactNode;
};

function PaperSection({ title, note, tone, variant = 'a', children }: PaperSectionProps) {
  return (
    <View style={[styles.noteCard, styles[`tone_${tone}`], styles[`card_${variant}`]]}>
      <View style={[styles.cardTape, styles[`tape_${variant}`]]} />
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
            <View style={styles.columnLeft}>
              <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses." tone="paper" variant="a">
                <Text style={styles.bodyText}>{profile.bio?.trim() || 'Rien d’écrit pour le moment.'}</Text>
              </PaperSection>

              <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier." tone="paper" variant="c">
                <View style={styles.infoRow}><Text style={styles.label}>Taille</Text><Text style={styles.value}>{profile.height ? `${profile.height} cm` : '—'}</Text></View>
                <Text style={styles.labelStandalone}>Description physique</Text>
                {physical ? (
                  <View style={styles.physicalCard}>
                    <Text style={styles.physicalTitle}>{physical.label}</Text>
                    <Text style={styles.physicalSub}>{physical.sub}</Text>
                  </View>
                ) : <Text style={styles.emptyText}>Pas encore précisée.</Text>}
              </PaperSection>

              <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite." tone="lavender" variant="b">
                <View style={styles.chipWrap}>
                  {identityTags.length > 0 ? identityTags.map((tag, i) => (
                    <View style={styles.chip} key={`${tag}-${i}`}><Text style={styles.chipText}>{tag}</Text></View>
                  )) : <Text style={styles.emptyText}>Aucun trait renseigné pour le moment.</Text>}
                </View>
              </PaperSection>
            </View>

            <View style={styles.columnRight}>
              <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Voilà ce qui lui ressemble aujourd'hui." tone="paper" variant="d">
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

              <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial." tone="grid" variant="b">
                <View style={styles.questionBlock}>
                  <Text style={styles.question}>As-tu des enfants ?</Text>
                  <Text style={styles.answer}>{profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Je préfère ne pas préciser'}</Text>
                </View>
                <View style={styles.questionBlock}>
                  <Text style={styles.question}>Souhaites-tu avoir des enfants ?</Text>
                  <Text style={styles.answer}>{profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Je ne sais pas encore'}</Text>
                </View>
              </PaperSection>

              <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte." tone="yellow" variant="c">
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
  bg: '#EEE3D2', paper: '#FBF7EE', paperWarm: '#F8EFE2',
  gridPaper: '#F4F3EA', pinkPaper: '#F2D9D7', lavender: '#E7DDEC', yellow: '#F1D98E',
  line: '#CDB99D', ink: '#30251F', muted: '#8A7662', burgundy: '#A7324B',
  tape: '#D2BA96', tapeDark: '#C3A77D', shadow: '#8E7B66', gridLine: '#D8D0C3',
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  errorText: { color: C.muted, fontSize: 14, textAlign: 'center' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.line, backgroundColor: '#FFFDF8' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: C.ink, letterSpacing: 1.6 },
  headerSpacer: { width: 64 },
  headerAction: { minWidth: 64, alignItems: 'flex-end' },
  headerActionText: { fontSize: 13, fontWeight: '800', color: C.burgundy },

  scroll: { paddingHorizontal: 14, paddingTop: 16, paddingBottom: 70 },

  profileSheet: {
    position: 'relative', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line,
    borderRadius: 1, padding: 12, shadowColor: C.shadow, shadowOpacity: 0.22,
    shadowRadius: 8, shadowOffset: { width: 2, height: 5 }, elevation: 3,
  },
  sheetTape: { position: 'absolute', zIndex: 8, top: -10, left: '45%', width: 100, height: 24, backgroundColor: C.tape, opacity: 0.78, transform: [{ rotate: '-3deg' }] },
  paperClip: { position: 'absolute', zIndex: 9, top: 17, left: 12, width: 27, height: 66, borderLeftWidth: 3, borderTopWidth: 3, borderRightWidth: 3, borderColor: '#948B7F', borderRadius: 15, transform: [{ rotate: '-13deg' }] },

  profileHeader: { position: 'relative', flexDirection: 'row', alignItems: 'center', minHeight: 190, paddingVertical: 24, paddingHorizontal: 30, borderBottomWidth: 1, borderBottomColor: '#D9CCBA' },
  avatarBox: { width: 132, height: 132, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paperWarm, borderWidth: 1, borderColor: C.line, borderRadius: 9, transform: [{ rotate: '-1.5deg' }] },
  profileHeaderInfo: { flex: 1, paddingLeft: 22, paddingRight: 12 },
  profilePseudo: { fontSize: 28, fontWeight: '900', color: C.ink, letterSpacing: -0.5 },
  underNameLine: { width: 154, height: 3, backgroundColor: C.burgundy, marginTop: 4, marginBottom: 12, transform: [{ rotate: '-2deg' }] },
  profileAge: { fontSize: 17, fontWeight: '900', color: C.ink, marginTop: 1 },
  profileCity: { fontSize: 15, color: C.muted, marginTop: 8 },
  headerNote: { position: 'absolute', right: 8, bottom: 12, width: 104, height: 72, backgroundColor: '#EBC0C0', padding: 13, transform: [{ rotate: '4deg' }], shadowColor: C.shadow, shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 2, height: 3 }, elevation: 2 },
  headerNoteLine: { height: 1, backgroundColor: '#B98787', marginBottom: 9, opacity: 0.65 },
  headerNoteLineShort: { width: '63%', height: 1, backgroundColor: '#B98787', opacity: 0.55 },

  grid: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingTop: 20 },
  columnLeft: { flex: 1, gap: 13, paddingTop: 0 },
  columnRight: { flex: 1, gap: 13, paddingTop: 7 },

  noteCard: {
    position: 'relative', paddingHorizontal: 14, paddingTop: 20, paddingBottom: 16,
    borderWidth: 1, borderColor: C.line, borderRadius: 1,
    shadowColor: C.shadow, shadowOpacity: 0.17, shadowRadius: 4,
    shadowOffset: { width: 2, height: 3 }, elevation: 2, overflow: 'visible',
  },
  card_a: { transform: [{ rotate: '-0.35deg' }] },
  card_b: { transform: [{ rotate: '0.45deg' }], marginTop: 2 },
  card_c: { transform: [{ rotate: '-0.65deg' }], marginLeft: 2 },
  card_d: { transform: [{ rotate: '0.7deg' }], marginRight: 1 },
  tone_paper: { backgroundColor: C.paper },
  tone_grid: { backgroundColor: C.gridPaper },
  tone_pink: { backgroundColor: C.pinkPaper },
  tone_lavender: { backgroundColor: C.lavender },
  tone_yellow: { backgroundColor: C.yellow },

  cardTape: { position: 'absolute', zIndex: 6, width: 68, height: 19, backgroundColor: C.tape, opacity: 0.76 },
  tape_a: { top: -8, left: 18, transform: [{ rotate: '-3deg' }] },
  tape_b: { top: -7, right: 18, transform: [{ rotate: '4deg' }] },
  tape_c: { top: -8, left: 34, transform: [{ rotate: '1deg' }] },
  tape_d: { top: -7, left: 14, transform: [{ rotate: '-5deg' }] },

  sectionTitle: { fontSize: 17, lineHeight: 21, fontWeight: '900', letterSpacing: 0.45, color: C.ink, paddingRight: 3 },
  sectionNote: { fontSize: 11.5, lineHeight: 17, color: C.muted, fontStyle: 'italic', marginTop: 6, marginBottom: 11 },
  bodyText: { fontSize: 13, lineHeight: 19, color: C.ink },
  emptyText: { fontSize: 12, lineHeight: 18, color: C.muted, fontStyle: 'italic' },

  bigChoice: { backgroundColor: '#F0D8D9', borderWidth: 1, borderColor: '#D9B8B9', padding: 11, marginTop: 8, transform: [{ rotate: '-0.8deg' }] },
  bigChoiceTitle: { fontSize: 14, lineHeight: 19, fontWeight: '900', color: C.ink },
  bigChoiceSub: { fontSize: 11.5, lineHeight: 16, color: C.muted, fontStyle: 'italic', marginTop: 3 },

  labelStandalone: { fontSize: 12, lineHeight: 16, fontWeight: '900', color: C.ink, marginTop: 14, marginBottom: 7 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { backgroundColor: '#F7EEE4', borderWidth: 1, borderColor: C.line, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6, transform: [{ rotate: '-0.5deg' }] },
  chipText: { fontSize: 11.5, fontWeight: '800', color: C.ink },

  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: '#DCCFC0', gap: 10 },
  label: { flex: 1, fontSize: 12.5, fontWeight: '800', color: C.ink },
  value: { flex: 1, fontSize: 12.5, fontWeight: '900', color: C.ink, textAlign: 'right' },
  physicalCard: { marginTop: 5, backgroundColor: C.paperWarm, borderWidth: 1, borderColor: C.line, padding: 11, borderRadius: 8, transform: [{ rotate: '0.7deg' }] },
  physicalTitle: { fontSize: 13.5, fontWeight: '900', color: C.ink },
  physicalSub: { fontSize: 11.5, lineHeight: 16, color: C.muted, fontStyle: 'italic', marginTop: 3 },

  questionBlock: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.gridLine },
  question: { fontSize: 12.5, lineHeight: 17, fontWeight: '800', color: C.ink },
  answer: { alignSelf: 'flex-start', marginTop: 7, backgroundColor: '#FFFDF8', borderWidth: 1, borderColor: C.line, borderRadius: 13, paddingHorizontal: 10, paddingVertical: 6, fontSize: 11.5, fontWeight: '800', color: C.ink, transform: [{ rotate: '0.4deg' }] },

  skillCard: { backgroundColor: 'rgba(255,253,248,0.45)', borderWidth: 1, borderStyle: 'dashed', borderColor: '#AD9656', padding: 9, marginTop: 8, borderRadius: 4, transform: [{ rotate: '-0.7deg' }] },
  skillTitle: { fontSize: 13.5, fontWeight: '900', color: C.ink, marginBottom: 3 },

  reportStrip: { position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, padding: 12, paddingLeft: 18, backgroundColor: '#F6EDE1', borderWidth: 1, borderColor: C.line, minHeight: 56, transform: [{ rotate: '-0.25deg' }] },
  reportPaperClip: { position: 'absolute', left: 9, top: -11, width: 18, height: 32, borderLeftWidth: 2, borderTopWidth: 2, borderRightWidth: 2, borderColor: '#948B7F', borderRadius: 9, transform: [{ rotate: '-10deg' }] },
  reportText: { flex: 1, paddingLeft: 8, fontSize: 10.5, lineHeight: 15, color: C.muted },
  reportAction: { fontSize: 11, fontWeight: '900', color: C.burgundy },
});
