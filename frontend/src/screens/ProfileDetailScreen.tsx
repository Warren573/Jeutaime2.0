import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPublicProfile, reportUser, type PublicProfileResponse } from '../api/profiles';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { useStore } from '../store/useStore';
import { AppBackButton } from '../components/AppBackButton';

const LOOKING_FOR_LABEL: Record<string, { label: string; sub: string }> = {
  relation: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' }, RELATION: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  serieux: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' }, SERIEUX: { label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  flirt: { label: 'Rien de trop sérieux', sub: 'On verra bien où ça mène.' }, FLIRT: { label: 'Rien de trop sérieux', sub: 'On verra bien où ça mène.' },
  amitie: { label: "Des affinités d'abord", sub: 'Les belles histoires commencent parfois comme ça.' }, AMITIE: { label: "Des affinités d'abord", sub: 'Les belles histoires commencent parfois comme ça.' },
  discussion: { label: "J'ai vu de la lumière", sub: 'Je suis entré·e, on discute.' }, DISCUSSION: { label: "J'ai vu de la lumière", sub: 'Je suis entré·e, on discute.' },
};

const INTERESTED_IN_LABEL: Record<string, string> = {
  F: 'Femmes', FEMME: 'Femmes', women: 'Femmes', WOMEN: 'Femmes', M: 'Hommes', HOMME: 'Hommes', men: 'Hommes', MEN: 'Hommes',
  NB: 'Non-binaires', AUTRE: 'Non-binaires', other: 'Non-binaires', OTHER: 'Non-binaires',
};

const PHYSICAL_DESC_LABEL: Record<string, { label: string; sub: string }> = {
  filiforme: { label: 'Filiforme', sub: 'Le vent me connaît bien.' }, ras_motte: { label: 'Ras des mottes', sub: 'Petit format, grande présence.' },
  grande_gigue: { label: 'Grande gigue', sub: 'Les étagères du haut sont pour moi.' }, doux: { label: 'Grande beauté intérieure', sub: "Et c'est déjà beaucoup." },
  beaute_int: { label: 'Grande beauté intérieure', sub: "Et c'est déjà beaucoup." }, athletique: { label: 'Athlétique', sub: 'Toujours plus ou moins en mouvement.' },
  costaud: { label: 'En formes généreuses', sub: 'Les courbes ont aussi leur mot à dire.' }, genereuse: { label: 'En formes généreuses', sub: 'Les courbes ont aussi leur mot à dire.' },
  mignon: { label: 'Dans la moyenne', sub: 'Ni trop, ni pas assez.' }, moyenne: { label: 'Dans la moyenne', sub: 'Ni trop, ni pas assez.' },
  mysterieux: { label: 'Musclé·e', sub: 'Ça se remarque parfois sous le t-shirt.' }, muscle: { label: 'Musclé·e', sub: 'Ça se remarque parfois sous le t-shirt.' },
};

function calcAge(birthDate?: string | null): number | null {
  if (!birthDate) return null;
  const birth = new Date(birthDate); if (Number.isNaN(birth.getTime())) return null;
  const now = new Date(); let age = now.getFullYear() - birth.getFullYear();
  if (now.getMonth() < birth.getMonth() || (now.getMonth() === birth.getMonth() && now.getDate() < birth.getDate())) age--;
  return age;
}

function cleanArray(value: unknown): string[] { return Array.isArray(value) ? value.map(v => String(v).trim()).filter(Boolean) : []; }

type Tone = 'paper' | 'grid' | 'pink' | 'lavender' | 'yellow';
type Variant = 'a' | 'b' | 'c' | 'd';
type PaperSectionProps = { title: string; note?: string; tone: Tone; variant?: Variant; children: React.ReactNode };

function PaperLines({ count = 5 }: { count?: number }) {
  return <View pointerEvents="none" style={styles.paperLines}>{Array.from({ length: count }).map((_, i) => <View key={i} style={styles.paperLine} />)}</View>;
}

function Tape({ variant = 'a', large = false }: { variant?: Variant; large?: boolean }) {
  return (
    <View pointerEvents="none" style={[styles.tape, large ? styles.tapeLarge : styles[`tape_${variant}`]]}>
      <View style={styles.tapeSheen} />
      <View style={styles.tapeEdgeLeft} />
      <View style={styles.tapeEdgeRight} />
    </View>
  );
}

function PaperClip() {
  const wire = "M12 8 C18 1 30 1 36 8 L52 32 C58 41 56 53 47 59 C38 65 26 62 20 53 L8 35 C4 29 6 21 12 17 C18 13 26 15 30 21 L41 38";
  return (
    <View pointerEvents="none" style={styles.paperClipSlot}>
      <Svg width="62" height="72" viewBox="0 0 62 72">
        <Path d={wire} fill="none" stroke="rgba(45,39,34,0.14)" strokeWidth="3.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(1.2 1.6)" />
        <Path d={wire} fill="none" stroke="#77716A" strokeWidth="2.45" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M12.8 7.8 C18.7 2.6 29.3 2.5 35.1 8.5 L51.1 32.4" fill="none" stroke="rgba(255,255,255,0.56)" strokeWidth="0.65" strokeLinecap="round" />
      </Svg>
    </View>
  );
}

function PaperSection({ title, note, tone, variant = 'a', children }: PaperSectionProps) {
  return (
    <View style={[styles.noteCard, styles[`tone_${tone}`], styles[`card_${variant}`]]}>
      <PaperLines count={tone === 'grid' ? 8 : 4} />
      <Tape variant={variant} />
      <View style={styles.sectionTop}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionMark}>{tone === 'yellow' ? '☆' : '♡'}</Text></View>
      {!!note && <Text style={styles.sectionNote}>{note}</Text>}
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export default function ProfileDetailScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const params = useLocalSearchParams<{ id?: string }>();
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id; const currentUser = useStore(s => s.currentUser);
  const [data, setData] = useState<PublicProfileResponse | null>(null); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [reporting, setReporting] = useState(false);
  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      if (!profileId) { setError('Profil introuvable'); setLoading(false); return; }
      try { setLoading(true); const result = await getPublicProfile(profileId); if (mounted) setData(result); }
      catch (err: any) { if (mounted) setError(err?.message || 'Impossible de charger le profil'); }
      finally { if (mounted) setLoading(false); }
    };
    void load(); return () => { mounted = false; };
  }, [profileId]);

  const profile = data?.profile; const age = useMemo(() => calcAge(profile?.birthDate), [profile?.birthDate]);
  const report = async () => {
    if (!profileId || isOwnProfile || reporting) return;
    try { setReporting(true); await reportUser(profileId, 'OTHER'); Alert.alert('Signalement envoyé', 'Merci, le profil sera examiné.'); }
    catch (err: any) { Alert.alert('Erreur', err?.message || 'Impossible de signaler ce profil'); }
    finally { setReporting(false); }
  };

  if (loading) return <View style={[styles.container, styles.center]}><ActivityIndicator size="large" color="#A7324B" /></View>;
  if (error || !profile) return <View style={[styles.container, { paddingTop: insets.top }]}><View style={styles.header}><AppBackButton onPress={() => router.back()} /><Text style={styles.headerTitle}>PROFIL</Text><View style={styles.headerSpacer} /></View><View style={styles.center}><Text style={styles.errorText}>{error ?? 'Profil introuvable'}</Text></View></View>;

  const avatar = resolveAvatarConfig(profile.userId ?? profile.id, profile.avatarConfig, profile.gender, 'ProfileDetailScreen').config;
  const lookingFor = cleanArray(profile.lookingFor).map(v => LOOKING_FOR_LABEL[v] ?? { label: v, sub: '' });
  const interestedIn = cleanArray(profile.interestedIn).map(v => INTERESTED_IN_LABEL[v] ?? v); const identityTags = cleanArray(profile.identityTags);
  const skills = Array.isArray(profile.skills) ? profile.skills.filter(skill => skill?.label || skill?.detail).slice(0, 3) : []; const physical = PHYSICAL_DESC_LABEL[String(profile.physicalDesc ?? '')];

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}><AppBackButton onPress={() => router.back()} /><Text style={styles.headerTitle}>PROFIL</Text>{isOwnProfile ? <TouchableOpacity style={styles.headerAction} onPress={() => router.push('/edit-profile' as any)}><Text style={styles.headerActionText}>Modifier</Text></TouchableOpacity> : <TouchableOpacity style={styles.headerAction} onPress={report} disabled={reporting}><Text style={styles.headerActionText}>{reporting ? '...' : 'Signaler'}</Text></TouchableOpacity>}</View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.dossier}>
          <Tape large />
          <View style={styles.headerSheet}>
            <PaperLines count={7} />
            <View style={styles.headerAvatarWrap}>
              <View style={styles.avatarBox}><Avatar size={106} {...avatar} /></View>
              <PaperClip />
              <Text style={styles.avatarCaption}>Avatar, pas ma vraie tête.</Text>
              <Text style={styles.avatarSubcaption}>La surprise, c'est plus amusant.</Text>
            </View>
            <View style={styles.headerInfo}><Text numberOfLines={1} adjustsFontSizeToFit style={styles.profilePseudo}>{profile.pseudo || '—'}</Text><View style={styles.nameUnderline} /><Text style={styles.metaRow}>{age != null ? `${age} ans` : 'Âge non précisé'}</Text><Text style={styles.metaRow}>{profile.city || 'Ville non précisée'}</Text></View>
          </View>

          <View style={styles.stack}>
            <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses." tone="paper" variant="a"><Text style={styles.bodyText}>{profile.bio?.trim() || 'Rien d’écrit pour le moment.'}</Text></PaperSection>
            <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Voilà ce qui lui ressemble aujourd'hui." tone="paper" variant="d">
              {lookingFor.length ? lookingFor.map((option, i) => <View key={`${option.label}-${i}`} style={styles.bigChoice}><Text style={styles.bigChoiceTitle}>{option.label}</Text>{!!option.sub && <Text style={styles.bigChoiceSub}>{option.sub}</Text>}</View>) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}
              <Text style={styles.labelStandalone}>Qui aimerait-il·elle rencontrer ?</Text><View style={styles.chipWrap}>{interestedIn.length ? interestedIn.map((item, i) => <View style={styles.chip} key={`${item}-${i}`}><Text style={styles.chipText}>{item}</Text></View>) : <Text style={styles.emptyText}>Pas encore précisé.</Text>}</View>
            </PaperSection>
            <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier." tone="paper" variant="c"><View style={styles.infoRow}><Text style={styles.label}>Taille</Text><Text style={styles.value}>{profile.height ? `${profile.height} cm` : '—'}</Text></View><Text style={styles.labelStandalone}>Description physique</Text>{physical ? <View style={styles.physicalCard}><Text style={styles.physicalTitle}>{physical.label}</Text><Text style={styles.physicalSub}>{physical.sub}</Text></View> : <Text style={styles.emptyText}>Pas encore précisée.</Text>}</PaperSection>
            <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial." tone="grid" variant="b"><View style={styles.childrenRow}><View style={styles.childQuestion}><Text style={styles.question}>As-tu des enfants ?</Text><View style={styles.answerSlip}><Text style={styles.answer}>{profile.hasChildren === true ? 'Oui' : profile.hasChildren === false ? 'Non' : 'Je préfère ne pas préciser'}</Text></View></View><View style={styles.childQuestion}><Text style={styles.question}>Souhaites-tu avoir des enfants ?</Text><View style={styles.answerSlip}><Text style={styles.answer}>{profile.wantsChildren === true ? 'Oui' : profile.wantsChildren === false ? 'Non' : 'Je ne sais pas encore'}</Text></View></View></View></PaperSection>
            <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite." tone="lavender" variant="b">{identityTags.length ? <View style={styles.chipWrap}>{identityTags.map((tag, i) => <View style={styles.chip} key={`${tag}-${i}`}><Text style={styles.chipText}>{tag}</Text></View>)}</View> : <Text style={styles.emptyText}>Aucun trait renseigné pour le moment.</Text>}</PaperSection>
            <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte." tone="yellow" variant="c">{skills.length ? skills.map((skill, i) => <View style={styles.skillCard} key={`${skill.label || 'skill'}-${i}`}>{!!skill.label && <Text style={styles.skillTitle}>{skill.label}</Text>}{!!skill.detail && <Text style={styles.bodyText}>{skill.detail}</Text>}</View>) : <><Text style={styles.emptyText}>Aucun talent déclaré. Ça ne veut pas dire qu’il n’y en a pas.</Text><View style={styles.fakePlus}><Text style={styles.fakePlusText}>Ajouter une compétence</Text></View></>}</PaperSection>
          </View>

          <View style={styles.reportStrip}><Text style={styles.reportText}>Tu peux toujours signaler ou bloquer ce profil si quelque chose cloche.</Text>{!isOwnProfile && <TouchableOpacity onPress={report} disabled={reporting}><Text style={styles.reportAction}>{reporting ? '...' : 'Signaler / Bloquer →'}</Text></TouchableOpacity>}</View>
        </View>
      </ScrollView>
    </View>
  );
}

const C = { bg: '#EDE1CF', paper: '#FDF9F1', warm: '#F7ECDD', grid: '#F6F4E9', pink: '#F1D7D7', lavender: '#E5DCEB', yellow: '#F2D989', ink: '#30241E', muted: '#907B65', line: '#D4BE9E', burgundy: '#A7324B', tape: '#D8C09A', shadow: '#88745E', gridLine: '#DED8CA', white: '#FFFDF8' };

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg }, center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }, errorText: { color: C.muted, fontSize: 14, textAlign: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#DCCEBB', backgroundColor: C.white }, headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: C.ink, letterSpacing: 1.7 }, headerSpacer: { width: 64 }, headerAction: { minWidth: 64, alignItems: 'flex-end' }, headerActionText: { fontSize: 13, fontWeight: '800', color: C.burgundy },
  scroll: { padding: 14, paddingTop: 18, paddingBottom: 80 }, dossier: { position: 'relative', backgroundColor: '#F9F2E7', borderWidth: 1, borderColor: '#D1B996', padding: 12, shadowColor: C.shadow, shadowOpacity: 0.24, shadowRadius: 10, shadowOffset: { width: 2, height: 5 }, elevation: 3 },
  headerSheet: { minHeight: 205, position: 'relative', overflow: 'visible', backgroundColor: '#FBF8F0', borderBottomWidth: 1, borderBottomColor: '#D9CBB7', flexDirection: 'row', paddingHorizontal: 38, paddingVertical: 25 }, paperLines: { ...StyleSheet.absoluteFillObject, opacity: 0.42 }, paperLine: { height: 1, backgroundColor: C.gridLine, marginTop: 28 },
  headerAvatarWrap: { width: 155, zIndex: 2, position: 'relative', overflow: 'visible' },
  paperClipSlot: { position: 'absolute', zIndex: 8, left: -12, top: -16, width: 62, height: 72, transform: [{ rotate: '-28deg' }] },
  avatarBox: { width: 132, height: 132, zIndex: 2, backgroundColor: C.warm, borderWidth: 1, borderColor: C.line, borderRadius: 10, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-1.5deg' }], shadowColor: C.shadow, shadowOpacity: 0.09, shadowRadius: 2, shadowOffset: { width: 1, height: 2 } }, avatarCaption: { fontSize: 9, color: C.ink, marginTop: 8, transform: [{ rotate: '-1deg' }] }, avatarSubcaption: { fontSize: 8, color: C.burgundy, marginTop: 2, fontStyle: 'italic' }, headerInfo: { flex: 1, paddingLeft: 18, paddingTop: 18, zIndex: 2 }, profilePseudo: { fontSize: 29, lineHeight: 34, fontWeight: '900', color: C.ink }, nameUnderline: { width: 145, height: 3, backgroundColor: C.burgundy, marginTop: 4, marginBottom: 13, transform: [{ rotate: '-2deg' }] }, metaRow: { fontSize: 16, fontWeight: '800', color: C.ink, marginBottom: 8 },
  stack: { paddingTop: 16 }, noteCard: { position: 'relative', overflow: 'visible', marginBottom: 12, paddingHorizontal: 18, paddingTop: 20, paddingBottom: 16, borderWidth: 1, borderColor: C.line, shadowColor: C.shadow, shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 2, height: 3 }, elevation: 2 }, tone_paper: { backgroundColor: C.paper }, tone_grid: { backgroundColor: C.grid }, tone_pink: { backgroundColor: C.pink }, tone_lavender: { backgroundColor: C.lavender }, tone_yellow: { backgroundColor: C.yellow },
  card_a: { transform: [{ rotate: '-0.35deg' }], marginHorizontal: 2 }, card_b: { transform: [{ rotate: '0.45deg' }], marginLeft: 4, marginRight: 1 }, card_c: { transform: [{ rotate: '-0.55deg' }], marginLeft: 1, marginRight: 5 }, card_d: { transform: [{ rotate: '0.5deg' }], marginLeft: 5, marginRight: 1 },
  tape: { position: 'absolute', zIndex: 12, top: -9, width: 76, height: 21, backgroundColor: C.tape, opacity: 0.74, shadowColor: '#8F7758', shadowOpacity: 0.08, shadowRadius: 1, shadowOffset: { width: 0, height: 1 } }, tapeLarge: { top: -11, left: '43%', width: 112, height: 26, transform: [{ rotate: '-3deg' }] }, tape_a: { left: 26, transform: [{ rotate: '-4deg' }] }, tape_b: { right: 28, transform: [{ rotate: '3deg' }] }, tape_c: { left: '42%', transform: [{ rotate: '-1.5deg' }] }, tape_d: { right: 38, transform: [{ rotate: '4.5deg' }] }, tapeSheen: { position: 'absolute', top: 2, left: 5, right: 5, height: 5, backgroundColor: 'rgba(255,255,255,0.18)' }, tapeEdgeLeft: { position: 'absolute', left: -2, top: 2, bottom: 2, width: 5, backgroundColor: 'rgba(202,177,137,0.45)', transform: [{ rotate: '-5deg' }] }, tapeEdgeRight: { position: 'absolute', right: -2, top: 3, bottom: 1, width: 5, backgroundColor: 'rgba(202,177,137,0.35)', transform: [{ rotate: '5deg' }] },
  sectionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }, sectionTitle: { flex: 1, fontSize: 17, lineHeight: 21, fontWeight: '900', letterSpacing: 0.5, color: C.ink }, sectionMark: { fontSize: 22, color: C.burgundy, marginLeft: 5, marginTop: -3 }, sectionNote: { fontSize: 11.5, lineHeight: 17, color: C.muted, fontStyle: 'italic', marginTop: 6 }, sectionContent: { marginTop: 12 }, bodyText: { fontSize: 14, lineHeight: 23, color: C.ink }, emptyText: { fontSize: 13, lineHeight: 20, color: C.muted, fontStyle: 'italic' },
  bigChoice: { alignSelf: 'flex-end', width: '48%', backgroundColor: '#F0DADA', borderWidth: 1, borderColor: '#E4BABA', padding: 11, marginBottom: 10, transform: [{ rotate: '-0.7deg' }] }, bigChoiceTitle: { fontSize: 14, fontWeight: '900', color: C.ink }, bigChoiceSub: { fontSize: 11.5, lineHeight: 17, color: C.muted, fontStyle: 'italic', marginTop: 3 }, labelStandalone: { fontSize: 12.5, fontWeight: '900', color: C.ink, marginTop: 9, marginBottom: 8 }, chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, chip: { borderWidth: 1, borderColor: C.line, backgroundColor: '#FBF4E9', borderRadius: 18, paddingHorizontal: 11, paddingVertical: 6 }, chipText: { fontSize: 12, fontWeight: '800', color: C.ink },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 9, borderBottomWidth: 1, borderBottomColor: '#DDCDB8' }, label: { fontSize: 13, fontWeight: '800', color: C.ink }, value: { fontSize: 16, fontWeight: '900', color: C.ink }, physicalCard: { maxWidth: '70%', backgroundColor: C.warm, borderWidth: 1, borderColor: C.line, padding: 11, marginTop: 4, borderRadius: 12 }, physicalTitle: { fontSize: 14, fontWeight: '900', color: C.ink }, physicalSub: { fontSize: 11.5, lineHeight: 17, color: C.muted, fontStyle: 'italic', marginTop: 3 },
  childrenRow: { flexDirection: 'row', gap: 16 }, childQuestion: { flex: 1 }, question: { fontSize: 12.5, lineHeight: 18, fontWeight: '800', color: C.ink, marginBottom: 7 }, answerSlip: { alignSelf: 'flex-start', backgroundColor: '#FBF8F0', borderWidth: 1, borderColor: C.line, borderRadius: 17, paddingHorizontal: 11, paddingVertical: 7 }, answer: { fontSize: 11.5, lineHeight: 16, fontWeight: '800', color: C.ink }, skillCard: { backgroundColor: 'rgba(255,255,255,0.32)', borderWidth: 1, borderColor: '#D6BC70', padding: 10, marginBottom: 7, borderRadius: 4 }, skillTitle: { fontSize: 13, fontWeight: '900', color: C.ink, marginBottom: 3 }, fakePlus: { borderWidth: 1, borderStyle: 'dashed', borderColor: '#C7A958', paddingVertical: 9, alignItems: 'center', marginTop: 5 }, fakePlusText: { fontSize: 11, fontWeight: '800', color: C.ink },
  reportStrip: { position: 'relative', marginTop: 3, borderWidth: 1, borderColor: C.line, backgroundColor: '#F7EFE3', padding: 12, minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 }, reportText: { flex: 1, fontSize: 10.5, lineHeight: 16, color: C.muted }, reportAction: { fontSize: 11, fontWeight: '900', color: C.burgundy },
});