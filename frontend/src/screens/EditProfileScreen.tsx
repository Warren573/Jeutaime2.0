import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { resolveAvatarConfig } from '../avatar/resolveAvatarConfig';
import { apiFetch } from '../api/client';

const LOOKING_FOR_OPTIONS = [
  { value: 'SERIEUX', label: "L'âme sœur, rien que ça", sub: 'On peut rêver grand.' },
  { value: 'FLIRT', label: 'Rien de trop sérieux', sub: 'On verra bien où ça mène.' },
  { value: 'AMITIE', label: "Des affinités d'abord", sub: 'Les belles histoires commencent parfois comme ça.' },
  { value: 'DISCUSSION', label: "J'ai vu de la lumière", sub: 'Je suis entré·e, on discute.' },
];

const INTERESTED_IN_OPTIONS = [
  { value: 'FEMME', label: 'Femmes' },
  { value: 'HOMME', label: 'Hommes' },
  { value: 'AUTRE', label: 'Non-binaires' },
];

const PHYSICAL_DESC_OPTIONS = [
  { value: 'filiforme', label: 'Filiforme', sub: 'Le vent me connaît bien.' },
  { value: 'ras_motte', label: 'Ras des mottes', sub: 'Petit format, grande présence.' },
  { value: 'grande_gigue', label: 'Grande gigue', sub: 'Les étagères du haut sont pour moi.' },
  { value: 'doux', label: 'Grande beauté intérieure', sub: "Et c'est déjà beaucoup." },
  { value: 'athletique', label: 'Athlétique', sub: 'Toujours plus ou moins en mouvement.' },
  { value: 'costaud', label: 'En formes généreuses', sub: 'Les courbes ont aussi leur mot à dire.' },
  { value: 'mignon', label: 'Dans la moyenne', sub: 'Ni trop, ni pas assez.' },
  { value: 'mysterieux', label: 'Musclé·e', sub: 'Ça se remarque parfois sous le t-shirt.' },
];

const IDENTITY_TAG_OPTIONS = [
  'Introverti·e', 'Extraverti·e', 'Créatif·ve', 'Analytique',
  'Aventurier·ère', 'Romantique', 'Drôle', 'Sérieux·se',
  'Empathique', 'Indépendant·e', 'Curieux·se', 'Calme',
];

type Skill = { id: string; label: string; detail: string; score: number };
type Question = { text: string; options: [string, string, string]; correctAnswer: 0 | 1 | 2 };
const EMPTY_QUESTION = (): Question => ({ text: '', options: ['', '', ''], correctAnswer: 0 });

function normalizeLookingFor(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const map: Record<string, string> = {
    relation: 'SERIEUX', RELATION: 'SERIEUX', serieux: 'SERIEUX', SERIEUX: 'SERIEUX',
    flirt: 'FLIRT', FLIRT: 'FLIRT', amitie: 'AMITIE', AMITIE: 'AMITIE',
    discussion: 'DISCUSSION', DISCUSSION: 'DISCUSSION',
  };
  return values.map(v => map[String(v)] ?? String(v)).filter(Boolean);
}
function normalizeInterestedIn(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const map: Record<string, string> = {
    F: 'FEMME', FEMME: 'FEMME', women: 'FEMME', WOMEN: 'FEMME',
    M: 'HOMME', HOMME: 'HOMME', men: 'HOMME', MEN: 'HOMME',
    NB: 'AUTRE', AUTRE: 'AUTRE', other: 'AUTRE', OTHER: 'AUTRE',
  };
  return values.map(v => map[String(v)] ?? String(v)).filter(Boolean);
}
function normalizePhysicalDesc(value: unknown): string {
  const map: Record<string, string> = { beaute_int: 'doux', genereuse: 'costaud', moyenne: 'mignon', muscle: 'mysterieux' };
  const raw = typeof value === 'string' ? value : '';
  return map[raw] ?? raw;
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
function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.78}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );
}

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, hydrateFromApi } = useStore();
  const [pseudo, setPseudo] = useState(currentUser?.pseudo ?? currentUser?.name ?? '');
  const [birthDate, setBirthDate] = useState(currentUser?.birthDate ? String(currentUser.birthDate).slice(0, 10) : '');
  const [city, setCity] = useState(currentUser?.city ?? '');
  const [bio, setBio] = useState(currentUser?.bio ?? '');
  const [height, setHeight] = useState(currentUser?.height != null ? String(currentUser.height) : '');
  const [physicalDesc, setPhysicalDesc] = useState(normalizePhysicalDesc(currentUser?.physicalDesc));
  const [lookingFor, setLookingFor] = useState<string[]>(normalizeLookingFor(currentUser?.lookingFor));
  const [interestedIn, setInterestedIn] = useState<string[]>(normalizeInterestedIn(currentUser?.interestedIn));
  const [hasChildren, setHasChildren] = useState<boolean | null>(currentUser?.hasChildren ?? null);
  const [wantsChildren, setWantsChildren] = useState<boolean | null>(currentUser?.wantsChildren ?? null);
  const [identityTags, setIdentityTags] = useState<string[]>(currentUser?.identityTags ?? []);
  const [skills, setSkills] = useState<Skill[]>(Array.isArray(currentUser?.skills) ? (currentUser?.skills as any[]).slice(0, 3).map((s, i) => ({ id: String(s?.id ?? `skill_${i}`), label: String(s?.label ?? ''), detail: String(s?.detail ?? ''), score: Number(s?.score ?? s?.level ?? 50) })) : []);
  const [questions, setQuestions] = useState<Question[]>(() => {
    const local = currentUser?.questions as Question[] | undefined;
    return Array.isArray(local) && local.length === 3 ? local : [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()];
  });
  const [saving, setSaving] = useState(false);

  const avatarResolution = resolveAvatarConfig(currentUser?.id || 'unknown', currentUser?.avatarConfig, currentUser?.gender, 'EditProfileScreen');
  const questionsReady = useMemo(() => questions.every(q => q.text.trim().length >= 5 && q.options.every(o => o.trim().length > 0)), [questions]);
  const toggle = (value: string, list: string[], setter: (v: string[]) => void) => setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);

  const save = async () => {
    if (!pseudo.trim()) return Alert.alert('Profil incomplet', 'Renseigne ton pseudo.');
    if (saving) return;
    const heightNumber = Number.parseInt(height, 10);
    const validSkills = skills.filter(s => s.label.trim() || s.detail.trim()).slice(0, 3).map(s => ({ ...s, label: s.label.trim(), detail: s.detail.trim() }));
    try {
      setSaving(true);
      await apiFetch('/profiles/me', { method: 'PATCH', body: JSON.stringify({
        pseudo: pseudo.trim(), birthDate: birthDate.trim() ? new Date(`${birthDate.trim()}T00:00:00.000Z`).toISOString() : undefined,
        city: city.trim(), bio: bio.trim(), physicalDesc: physicalDesc || undefined, lookingFor, interestedIn,
        ...(heightNumber >= 100 && heightNumber <= 250 ? { height: heightNumber } : {}),
        ...(hasChildren !== null ? { hasChildren } : {}), ...(wantsChildren !== null ? { wantsChildren } : {}),
        identityTags, skills: validSkills,
      }) });
      if (questionsReady) {
        await apiFetch('/profiles/me/questions', { method: 'PUT', body: JSON.stringify({ questions: questions.map(q => ({ questionText: q.text.trim(), answer: q.options[q.correctAnswer].trim(), wrongAnswers: q.options.filter((_, i) => i !== q.correctAnswer).map(o => o.trim()) })) }) });
      }
      await hydrateFromApi();
      router.back();
    } catch (err: any) { Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder le profil'); }
    finally { setSaving(false); }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}><Text style={styles.headerAction}>Retour</Text></TouchableOpacity>
        <Text style={styles.headerTitle}>MON PROFIL</Text>
        <TouchableOpacity onPress={save} disabled={saving}><Text style={styles.headerAction}>{saving ? '...' : 'Sauver'}</Text></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.introCard}>
          <View style={styles.avatarFrame}><Avatar size={106} {...avatarResolution.config} /></View>
          <View style={styles.introText}><Text style={styles.introTitle}>Ton petit carnet de présentation</Text><Text style={styles.introSub}>Pas besoin d'un CV. Juste assez de toi pour donner envie d'en savoir plus.</Text></View>
          <TouchableOpacity onPress={() => router.push('/avatar-builder' as any)}><Text style={styles.textLink}>Modifier l'avatar</Text></TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/my-photos' as any)}><Text style={styles.textLink}>Gérer mes photos</Text></TouchableOpacity>
        </View>

        <PaperSection title="IDENTITÉ" note="Les bases. Rien de très mystérieux pour l'instant.">
          <Text style={styles.label}>Pseudo</Text><TextInput style={styles.input} value={pseudo} onChangeText={setPseudo} placeholder="Le nom sous lequel on te connaîtra" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Date de naissance</Text><TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-JJ" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Ville</Text><TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Là où tu poses tes valises" placeholderTextColor="#A8957C" />
        </PaperSection>

        <PaperSection title="BIO / DESCRIPTION" note="Quelques lignes valent mieux qu'une liste de courses.">
          <TextInput style={[styles.input, styles.multiline]} value={bio} onChangeText={setBio} multiline maxLength={500} placeholder="Parle de toi comme tu parlerais à quelqu'un que tu viens de rencontrer..." placeholderTextColor="#A8957C" />
        </PaperSection>

        <PaperSection title="CE QUE JE CHERCHE" note="Pas besoin de signer un contrat. Choisis ce qui te ressemble aujourd'hui.">
          {LOOKING_FOR_OPTIONS.map(option => (
            <TouchableOpacity key={option.value} style={[styles.bigChoice, lookingFor.includes(option.value) && styles.bigChoiceActive]} onPress={() => toggle(option.value, lookingFor, setLookingFor)}>
              <Text style={styles.bigChoiceTitle}>{option.label}</Text><Text style={styles.bigChoiceSub}>{option.sub}</Text>
            </TouchableOpacity>
          ))}
          <Text style={styles.label}>Qui aimerais-tu rencontrer ?</Text>
          <View style={styles.chipWrap}>{INTERESTED_IN_OPTIONS.map(option => <ChoiceChip key={option.value} label={option.label} active={interestedIn.includes(option.value)} onPress={() => toggle(option.value, interestedIn, setInterestedIn)} />)}</View>
        </PaperSection>

        <PaperSection title="UN PEU DE MOI" note="Les mensurations exactes ne sont pas exigées par huissier.">
          <Text style={styles.label}>Taille</Text><TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" maxLength={3} placeholder="175 cm, à quelques millimètres près" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Description physique</Text>
          {PHYSICAL_DESC_OPTIONS.map(option => (
            <TouchableOpacity key={option.value} style={[styles.physicalCard, physicalDesc === option.value && styles.physicalCardActive]} onPress={() => setPhysicalDesc(physicalDesc === option.value ? '' : option.value)}>
              <Text style={styles.physicalTitle}>{option.label}</Text><Text style={styles.physicalSub}>{option.sub}</Text>
            </TouchableOpacity>
          ))}
        </PaperSection>

        <PaperSection title="ENFANTS" note="Sujet important, réponses simples. Et sans interrogatoire familial.">
          <Text style={styles.label}>As-tu des enfants ?</Text><View style={styles.chipWrap}><ChoiceChip label="Oui" active={hasChildren === true} onPress={() => setHasChildren(true)} /><ChoiceChip label="Non" active={hasChildren === false} onPress={() => setHasChildren(false)} /><ChoiceChip label="Je préfère ne pas préciser" active={hasChildren === null} onPress={() => setHasChildren(null)} /></View>
          <Text style={styles.label}>Souhaites-tu avoir des enfants ?</Text><View style={styles.chipWrap}><ChoiceChip label="Oui" active={wantsChildren === true} onPress={() => setWantsChildren(true)} /><ChoiceChip label="Non" active={wantsChildren === false} onPress={() => setWantsChildren(false)} /><ChoiceChip label="Je ne sais pas encore" active={wantsChildren === null} onPress={() => setWantsChildren(null)} /></View>
        </PaperSection>

        <PaperSection title="TRAITS D’IDENTITÉ" note="On garde cette partie pour l'instant. On la retravaillera ensuite.">
          <View style={styles.chipWrap}>{IDENTITY_TAG_OPTIONS.map(tag => <ChoiceChip key={tag} label={tag} active={identityTags.includes(tag)} onPress={() => toggle(tag, identityTags, setIdentityTags)} />)}</View>
        </PaperSection>

        <PaperSection title="COMPÉTENCES / TALENTS" note="Les vrais talents, les inutiles, les étrangement spécifiques : tout compte.">
          {skills.map((skill, index) => (
            <View style={styles.skillCard} key={skill.id || index}>
              <TextInput style={styles.input} value={skill.label} onChangeText={value => setSkills(prev => prev.map((item, i) => i === index ? { ...item, label: value } : item))} placeholder="Ex : guitare, risotto, trouver une place de parking..." placeholderTextColor="#A8957C" />
              <TextInput style={[styles.input, { marginTop: 8 }]} value={skill.detail} onChangeText={value => setSkills(prev => prev.map((item, i) => i === index ? { ...item, detail: value } : item))} placeholder="Le détail qui fait toute la différence" placeholderTextColor="#A8957C" />
              <TouchableOpacity onPress={() => setSkills(prev => prev.filter((_, i) => i !== index))}><Text style={styles.removeText}>Retirer</Text></TouchableOpacity>
            </View>
          ))}
          {skills.length < 3 && <TouchableOpacity style={styles.outlineButton} onPress={() => setSkills(prev => [...prev, { id: `skill_${Date.now()}`, label: '', detail: '', score: 50 }])}><Text style={styles.outlineButtonText}>Ajouter une compétence</Text></TouchableOpacity>}
        </PaperSection>

        <PaperSection title="MES 3 QUESTIONS" note="Trois petites énigmes sur toi. C'est ici que le jeu commence vraiment.">
          {questions.map((question, qi) => (
            <View style={styles.questionCard} key={qi}>
              <Text style={styles.questionTitle}>Question {qi + 1}</Text>
              <TextInput style={styles.input} value={question.text} onChangeText={value => setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, text: value } : q))} placeholder="Pose une question sur toi" placeholderTextColor="#A8957C" />
              {([0,1,2] as const).map(oi => (
                <TouchableOpacity key={oi} style={styles.answerRow} onPress={() => setQuestions(prev => prev.map((q, i) => i === qi ? { ...q, correctAnswer: oi } : q))}>
                  <View style={[styles.answerDot, question.correctAnswer === oi && styles.answerDotActive]} />
                  <TextInput style={[styles.input, styles.answerInput]} value={question.options[oi]} onChangeText={value => setQuestions(prev => prev.map((q, i) => { if (i !== qi) return q; const options = [...q.options] as [string,string,string]; options[oi] = value; return { ...q, options }; }))} placeholder={`Réponse ${oi + 1}`} placeholderTextColor="#A8957C" />
                </TouchableOpacity>
              ))}
              <Text style={styles.answerHint}>Le point rempli indique la bonne réponse.</Text>
            </View>
          ))}
        </PaperSection>

        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>{saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Sauvegarder mon profil</Text>}</TouchableOpacity>
        {currentUser?.id && <TouchableOpacity style={styles.previewButton} onPress={() => router.push(`/profile/${currentUser.id}`)}><Text style={styles.previewButtonText}>Voir mon profil comme les autres</Text></TouchableOpacity>}
      </ScrollView>
    </View>
  );
}

const C = { bg:'#F5EDE0', paper:'#FFFDF8', paper2:'#F7EEE4', ink:'#34271F', muted:'#8D7A67', line:'#DECDB8', burgundy:'#A7324B', burgundySoft:'#F6E8E8' };
const styles = StyleSheet.create({
  container:{flex:1,backgroundColor:C.bg}, header:{height:64,flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingHorizontal:20,borderBottomWidth:1,borderBottomColor:C.line,backgroundColor:C.paper}, headerTitle:{fontSize:19,fontWeight:'900',letterSpacing:2,color:C.ink}, headerAction:{fontSize:15,fontWeight:'800',color:C.burgundy}, scroll:{padding:16,paddingBottom:70},
  introCard:{backgroundColor:C.paper,borderRadius:26,borderWidth:1,borderColor:C.line,padding:18,alignItems:'center',marginBottom:18}, avatarFrame:{width:126,height:126,borderRadius:63,backgroundColor:C.paper2,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:C.line}, introText:{alignItems:'center',marginVertical:12}, introTitle:{fontSize:19,fontWeight:'900',color:C.ink}, introSub:{fontSize:13,color:C.muted,lineHeight:19,textAlign:'center',marginTop:5,maxWidth:310}, textLink:{fontSize:13,fontWeight:'800',color:C.burgundy,marginTop:7},
  paperSection:{position:'relative',backgroundColor:C.paper,borderRadius:25,borderWidth:1,borderColor:C.line,padding:20,paddingTop:24,marginBottom:18}, tape:{position:'absolute',top:-7,left:34,width:74,height:18,backgroundColor:'#E9D8C1',opacity:.7,transform:[{rotate:'-2deg'}]}, sectionTitle:{fontSize:20,fontWeight:'900',letterSpacing:1.2,color:C.ink}, sectionNote:{fontSize:13,color:C.muted,lineHeight:19,fontStyle:'italic',marginTop:5,marginBottom:15}, label:{fontSize:14,fontWeight:'800',color:'#745F4B',marginTop:13,marginBottom:7}, input:{borderWidth:1,borderColor:C.line,borderRadius:15,backgroundColor:C.paper2,paddingHorizontal:14,paddingVertical:12,fontSize:15,color:C.ink}, multiline:{minHeight:130,textAlignVertical:'top'},
  chipWrap:{flexDirection:'row',flexWrap:'wrap',gap:8}, chip:{paddingHorizontal:14,paddingVertical:10,borderRadius:22,borderWidth:1,borderColor:C.line,backgroundColor:C.paper2}, chipActive:{backgroundColor:C.burgundy,borderColor:C.burgundy}, chipText:{fontSize:13,fontWeight:'700',color:C.ink}, chipTextActive:{color:'#FFF'},
  bigChoice:{borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,marginBottom:9,backgroundColor:C.paper2}, bigChoiceActive:{borderColor:C.burgundy,backgroundColor:C.burgundySoft}, bigChoiceTitle:{fontSize:15,fontWeight:'900',color:C.ink}, bigChoiceSub:{fontSize:12,color:C.muted,marginTop:3,fontStyle:'italic'}, physicalCard:{borderWidth:1,borderColor:C.line,borderRadius:16,padding:14,marginBottom:9,backgroundColor:C.paper2}, physicalCardActive:{borderColor:C.burgundy,backgroundColor:C.burgundySoft}, physicalTitle:{fontSize:15,fontWeight:'900',color:C.ink}, physicalSub:{fontSize:12,color:C.muted,fontStyle:'italic',marginTop:3},
  skillCard:{backgroundColor:C.burgundySoft,borderRadius:18,padding:12,marginBottom:10}, removeText:{fontSize:13,fontWeight:'800',color:C.burgundy,textAlign:'right',paddingTop:9}, outlineButton:{borderWidth:1.5,borderColor:C.burgundy,borderRadius:18,paddingVertical:14,alignItems:'center',marginTop:4}, outlineButtonText:{fontSize:14,fontWeight:'900',color:C.burgundy},
  questionCard:{backgroundColor:C.paper2,borderRadius:18,padding:14,marginBottom:12,borderWidth:1,borderColor:C.line}, questionTitle:{fontSize:15,fontWeight:'900',color:C.ink,marginBottom:9}, answerRow:{flexDirection:'row',alignItems:'center',marginTop:8}, answerDot:{width:18,height:18,borderRadius:9,borderWidth:2,borderColor:C.line,marginRight:8}, answerDotActive:{backgroundColor:C.burgundy,borderColor:C.burgundy}, answerInput:{flex:1}, answerHint:{fontSize:11,color:C.muted,textAlign:'right',marginTop:7},
  saveButton:{backgroundColor:C.burgundy,borderRadius:20,paddingVertical:17,alignItems:'center',marginTop:4}, saveButtonText:{fontSize:16,fontWeight:'900',color:'#FFF'}, previewButton:{borderWidth:1.5,borderColor:C.burgundy,borderRadius:20,paddingVertical:15,alignItems:'center',marginTop:10}, previewButtonText:{fontSize:14,fontWeight:'900',color:C.burgundy},
});