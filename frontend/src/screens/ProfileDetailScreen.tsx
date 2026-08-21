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

function PaperSection({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <View style={styles.paperSection}>
      <View style={styles.tape} />
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
  const questions = Array.isArray(profile.questions) ? profile.questions.filter(question => question?.questionText).slice(0, 3) : [];
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
        <View style={styles.introCard}>
          <View style={styles.avatarFrame}><Avatar size={106} {...avatar} /></View>
          <Text style={styles.introTitle}>Petit carnet de présentation</Text>
          <Text style={styles.introSub}>Pas un CV. Juste assez pour donner envie d'en savoir plus.</Text>
        </View>

        <PaperSection title="IDENTITÉ" note="Les bases. Rien de très mystérieux pour l'instant.">
          <View style={styles.infoRow}><Text style={styles.label}>Pseudo</Text><Text style={styles.value}>{profile.pseudo || '—'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Âge</Text><Text style={styles.value}>{age != null ? `${age} ans` : '—'}</Text></View>
          <View style={styles.infoRow}><Text style={styles.label}>Ville</Text><Text style={styles.value}>{profile.city || '—'}</Text></View>
        </PaperSection>

        <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses.">
          <Text style={styles.bodyText}>{profile.bio?.trim() || 'Rien d’écrit pour le moment.'}</Text>
        </PaperSection>

        <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Voilà ce qui lui ressemble aujourd'hui.">
          {lookingFor.length > 0 ? lookingFor.map((option, index) => (
            <View key={`${option.label}-${index}`} style={styles.bigChoice}>
              <Text style={styles.bigChoiceTitle}>{option.label}</Text>
              {!!option.sub && <Text style={styles.bigChoiceSub}>{option.sub}</Text>}
            </View>
          )) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
          <Text style={styles.labelStandalone}>Qui aimerait-il·elle rencontrer ?</Text>
          <View style={styles.chipWrap}>
            {interestedIn.length > 0 ? interestedIn.map((item, index) => (
              <View style={styles.chip} key={`${item}-${index}`}><Text style={styles.chipText}>{item}</Text></View>
            )) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
          </View>
        </PaperSection>

        <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier.">
          <View style={styles.infoRow}><Text style={styles.label}>Taille</Text><Text style={styles.value}>{profile.height ? `${profile.height} cm` : '—'}</Text></View>
          <Text style={styles.labelStandalone}>Description physique</Text>
          {physical ? (
            <View style={styles.physicalCard}>
              <Text style={styles.physicalTitle}>{physical.label}</Text>
              <Text style={styles.physicalSub}>{physical.sub}</Text>
            </View>
          ) : <Text style={styles.emptyText}>Pas encore précisée.</Text>}
        </PaperSection>

        <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial.">
          <View style={styles.infoRow}>
            <Text style={styles.label}>As-tu des enfants ?</Text>
            <Text style={styles.value}>{profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Je préfère ne pas préciser'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Souhaites-tu avoir des enfants ?</Text>
            <Text style={styles.value}>{profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Je ne sais pas encore'}</Text>
          </View>
        </PaperSection>

        <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite.">
          <View style={styles.chipWrap}>
            {identityTags.length > 0 ? identityTags.map((tag, index) => (
              <View style={styles.chip} key={`${tag}-${index}`}><Text style={styles.chipText}>{tag}</Text></View>
            )) : <Text style={styles.emptyText}>Aucun trait renseigné pour le moment.</Text>}
          </View>
        </PaperSection>

        <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte.">
          {skills.length > 0 ? skills.map((skill, index) => (
            <View style={styles.skillCard} key={`${skill.label || 'skill'}-${index}`}>
              {!!skill.label && <Text style={styles.skillTitle}>{skill.label}</Text>}
              {!!skill.detail && <Text style={styles.bodyText}>{skill.detail}</Text>}
            </View>
          )) : <Text style={styles.emptyText}>Aucun talent déclaré. Ça ne veut pas dire qu’il n’y en a pas.</Text>}
        </PaperSection>

        <PaperSection title="MES 3 QUESTIONS" note="Les réponses restent secrètes. Sinon ce serait beaucoup trop facile.">
          {questions.length > 0 ? questions.map((question, index) => (
            <View style={styles.questionCard} key={question.questionId || index}>
              <Text style={styles.questionNumber}>QUESTION {index + 1}</Text>
              <Text style={styles.questionText}>{question.questionText}</Text>
            </View>
          )) : <Text style={styles.emptyText}>Les questions ne sont pas encore renseignées.</Text>}
        </PaperSection>
      </ScrollView>
    </View>
  );
}

const C = {
  bg: '#F3EBDD', paper: '#FFFDF8', paper2: '#F7EEE4', line: '#DCC9B2', ink: '#34271F',
  muted: '#8D7A67', burgundy: '#A7324B', burgundySoft: '#F5E5E5', tape: '#E6D2B8',
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
  introCard: { alignItems: 'center', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 24, padding: 18, marginBottom: 18 },
  avatarFrame: { width: 128, height: 128, borderRadius: 64, alignItems: 'center', justifyContent: 'center', backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line },
  introTitle: { marginTop: 12, fontSize: 18, fontWeight: '900', color: C.ink },
  introSub: { marginTop: 5, fontSize: 12, color: C.muted, fontStyle: 'italic', textAlign: 'center', lineHeight: 18 },
  paperSection: { position: 'relative', backgroundColor: C.paper, borderWidth: 1, borderColor: C.line, borderRadius: 22, padding: 18, paddingTop: 23, marginBottom: 18 },
  tape: { position: 'absolute', top: -7, left: 28, width: 68, height: 18, backgroundColor: C.tape, opacity: 0.7, transform: [{ rotate: '-3deg' }] },
  sectionTitle: { fontSize: 16, fontWeight: '900', letterSpacing: 0.9, color: C.ink },
  sectionNote: { fontSize: 12, color: C.muted, fontStyle: 'italic', lineHeight: 18, marginTop: 5, marginBottom: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#EFE4D8', gap: 16 },
  label: { flex: 1, fontSize: 13, fontWeight: '700', color: C.muted },
  value: { flex: 1, fontSize: 14, fontWeight: '800', color: C.ink, textAlign: 'right' },
  labelStandalone: { fontSize: 13, fontWeight: '800', color: C.ink, marginTop: 16, marginBottom: 8 },
  bodyText: { fontSize: 15, lineHeight: 22, color: C.ink },
  emptyText: { fontSize: 13, lineHeight: 20, color: C.muted, fontStyle: 'italic' },
  bigChoice: { backgroundColor: C.burgundySoft, borderRadius: 14, padding: 12, marginTop: 9, borderWidth: 1, borderColor: '#E9CECE' },
  bigChoiceTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  bigChoiceSub: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: C.paper2, borderWidth: 1, borderColor: C.line, borderRadius: 16, paddingHorizontal: 11, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700', color: C.ink },
  physicalCard: { marginTop: 2, backgroundColor: C.paper2, borderRadius: 14, padding: 13, borderWidth: 1, borderColor: C.line },
  physicalTitle: { fontSize: 15, fontWeight: '900', color: C.ink },
  physicalSub: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  skillCard: { backgroundColor: C.paper2, borderRadius: 15, padding: 12, marginTop: 10 },
  skillTitle: { fontSize: 15, fontWeight: '900', color: C.ink, marginBottom: 3 },
  questionCard: { backgroundColor: C.paper2, borderRadius: 14, padding: 13, marginTop: 9, borderWidth: 1, borderColor: C.line },
  questionNumber: { fontSize: 10, fontWeight: '900', color: C.burgundy, letterSpacing: 0.8, marginBottom: 5 },
  questionText: { fontSize: 14, fontWeight: '700', lineHeight: 20, color: C.ink },
});