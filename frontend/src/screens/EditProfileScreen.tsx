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
  { value: 'SERIEUX', label: 'Relation sérieuse' },
  { value: 'FLIRT', label: 'Flirt' },
  { value: 'AMITIE', label: 'Amitié' },
  { value: 'DISCUSSION', label: 'Discussion' },
];

const INTERESTED_IN_OPTIONS = [
  { value: 'FEMME', label: 'Femmes' },
  { value: 'HOMME', label: 'Hommes' },
  { value: 'AUTRE', label: 'Non-binaires' },
];

const PHYSICAL_DESC_OPTIONS = [
  { value: 'filiforme', label: 'Filiforme' },
  { value: 'ras_motte', label: 'Ras des mottes' },
  { value: 'grande_gigue', label: 'Grande gigue' },
  { value: 'doux', label: 'Grande beauté intérieure' },
  { value: 'athletique', label: 'Athlétique' },
  { value: 'costaud', label: 'En formes généreuses' },
  { value: 'mignon', label: 'Moyenne' },
  { value: 'mysterieux', label: 'Musclé·e' },
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
  const map: Record<string, string> = {
    beaute_int: 'doux', genereuse: 'costaud', moyenne: 'mignon', muscle: 'mysterieux',
  };
  const raw = typeof value === 'string' ? value : '';
  return map[raw] ?? raw;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function ChoiceChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.75}>
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
  const [skills, setSkills] = useState<Skill[]>(
    Array.isArray(currentUser?.skills)
      ? (currentUser?.skills as any[]).slice(0, 3).map((s, index) => ({
          id: String(s?.id ?? `skill_${index}`),
          label: String(s?.label ?? ''),
          detail: String(s?.detail ?? ''),
          score: Number(s?.score ?? s?.level ?? 50),
        }))
      : []
  );
  const [questions, setQuestions] = useState<Question[]>(() => {
    const local = currentUser?.questions as Question[] | undefined;
    if (Array.isArray(local) && local.length === 3) return local;
    return [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()];
  });
  const [saving, setSaving] = useState(false);

  const avatarResolution = resolveAvatarConfig(
    currentUser?.id || 'unknown',
    currentUser?.avatarConfig,
    currentUser?.gender,
    'EditProfileScreen'
  );

  const questionsReady = useMemo(
    () => questions.every(q => q.text.trim().length >= 5 && q.options.every(o => o.trim().length > 0)),
    [questions]
  );

  const toggle = (value: string, list: string[], setter: (v: string[]) => void) => {
    setter(list.includes(value) ? list.filter(item => item !== value) : [...list, value]);
  };

  const save = async () => {
    if (!pseudo.trim()) {
      Alert.alert('Profil incomplet', 'Renseigne ton pseudo.');
      return;
    }
    if (saving) return;

    const heightNumber = Number.parseInt(height, 10);
    const validSkills = skills
      .filter(skill => skill.label.trim() || skill.detail.trim())
      .slice(0, 3)
      .map(skill => ({ ...skill, label: skill.label.trim(), detail: skill.detail.trim() }));

    try {
      setSaving(true);
      await apiFetch('/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pseudo: pseudo.trim(),
          birthDate: birthDate.trim() ? new Date(`${birthDate.trim()}T00:00:00.000Z`).toISOString() : undefined,
          city: city.trim(),
          bio: bio.trim(),
          physicalDesc: physicalDesc || undefined,
          lookingFor,
          interestedIn,
          ...(heightNumber >= 100 && heightNumber <= 250 ? { height: heightNumber } : {}),
          ...(hasChildren !== null ? { hasChildren } : {}),
          ...(wantsChildren !== null ? { wantsChildren } : {}),
          identityTags,
          skills: validSkills,
        }),
      });

      if (questionsReady) {
        await apiFetch('/profiles/me/questions', {
          method: 'PUT',
          body: JSON.stringify({
            questions: questions.map(q => ({
              questionText: q.text.trim(),
              answer: q.options[q.correctAnswer].trim(),
              wrongAnswers: q.options.filter((_, index) => index !== q.correctAnswer).map(o => o.trim()),
            })),
          }),
        });
      }

      await hydrateFromApi();
      router.back();
    } catch (err: any) {
      Alert.alert('Erreur', err?.message || 'Impossible de sauvegarder le profil');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={() => router.back()}>
          <Text style={styles.headerButtonText}>Retour</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MON PROFIL</Text>
        <TouchableOpacity style={styles.headerButton} onPress={save} disabled={saving}>
          <Text style={styles.headerButtonText}>{saving ? '...' : 'Sauver'}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <TouchableOpacity style={styles.avatarBlock} onPress={() => router.push('/avatar-builder' as any)}>
          <Avatar size={104} {...avatarResolution.config} />
          <Text style={styles.linkText}>Modifier mon avatar</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/my-photos' as any)}>
          <Text style={styles.secondaryButtonText}>Gérer mes photos</Text>
        </TouchableOpacity>

        <Section title="IDENTITÉ">
          <Text style={styles.label}>Pseudo</Text>
          <TextInput style={styles.input} value={pseudo} onChangeText={setPseudo} placeholder="Pseudo" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Date de naissance</Text>
          <TextInput style={styles.input} value={birthDate} onChangeText={setBirthDate} placeholder="AAAA-MM-JJ" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Ville</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ville" placeholderTextColor="#A8957C" />
        </Section>

        <Section title="BIO / DESCRIPTION">
          <TextInput
            style={[styles.input, styles.multiline]}
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={500}
            placeholder="Parle de toi..."
            placeholderTextColor="#A8957C"
          />
        </Section>

        <Section title="CE QUE JE RECHERCHE">
          <View style={styles.chipWrap}>
            {LOOKING_FOR_OPTIONS.map(option => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                active={lookingFor.includes(option.value)}
                onPress={() => toggle(option.value, lookingFor, setLookingFor)}
              />
            ))}
          </View>
          <Text style={styles.label}>Je suis intéressé·e par</Text>
          <View style={styles.chipWrap}>
            {INTERESTED_IN_OPTIONS.map(option => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                active={interestedIn.includes(option.value)}
                onPress={() => toggle(option.value, interestedIn, setInterestedIn)}
              />
            ))}
          </View>
        </Section>

        <Section title="DESCRIPTION PHYSIQUE">
          <Text style={styles.label}>Taille (cm)</Text>
          <TextInput style={styles.input} value={height} onChangeText={setHeight} keyboardType="numeric" maxLength={3} placeholder="175" placeholderTextColor="#A8957C" />
          <Text style={styles.label}>Morphologie</Text>
          <View style={styles.chipWrap}>
            {PHYSICAL_DESC_OPTIONS.map(option => (
              <ChoiceChip
                key={option.value}
                label={option.label}
                active={physicalDesc === option.value}
                onPress={() => setPhysicalDesc(physicalDesc === option.value ? '' : option.value)}
              />
            ))}
          </View>
        </Section>

        <Section title="ENFANTS">
          <Text style={styles.label}>As-tu des enfants ?</Text>
          <View style={styles.chipWrap}>
            <ChoiceChip label="Oui" active={hasChildren === true} onPress={() => setHasChildren(true)} />
            <ChoiceChip label="Non" active={hasChildren === false} onPress={() => setHasChildren(false)} />
            <ChoiceChip label="Je préfère ne pas préciser" active={hasChildren === null} onPress={() => setHasChildren(null)} />
          </View>
          <Text style={styles.label}>Souhaites-tu avoir des enfants ?</Text>
          <View style={styles.chipWrap}>
            <ChoiceChip label="Oui" active={wantsChildren === true} onPress={() => setWantsChildren(true)} />
            <ChoiceChip label="Non" active={wantsChildren === false} onPress={() => setWantsChildren(false)} />
            <ChoiceChip label="Je ne sais pas encore" active={wantsChildren === null} onPress={() => setWantsChildren(null)} />
          </View>
        </Section>

        <Section title="TRAITS D’IDENTITÉ">
          <View style={styles.chipWrap}>
            {IDENTITY_TAG_OPTIONS.map(tag => (
              <ChoiceChip
                key={tag}
                label={tag}
                active={identityTags.includes(tag)}
                onPress={() => toggle(tag, identityTags, setIdentityTags)}
              />
            ))}
          </View>
        </Section>

        <Section title="COMPÉTENCES / TALENTS">
          {skills.map((skill, index) => (
            <View style={styles.skillCard} key={skill.id || index}>
              <TextInput
                style={styles.input}
                value={skill.label}
                onChangeText={value => setSkills(prev => prev.map((item, i) => i === index ? { ...item, label: value } : item))}
                placeholder="Compétence"
                placeholderTextColor="#A8957C"
              />
              <TextInput
                style={[styles.input, { marginTop: 8 }]}
                value={skill.detail}
                onChangeText={value => setSkills(prev => prev.map((item, i) => i === index ? { ...item, detail: value } : item))}
                placeholder="Détail"
                placeholderTextColor="#A8957C"
              />
              <TouchableOpacity onPress={() => setSkills(prev => prev.filter((_, i) => i !== index))}>
                <Text style={styles.removeText}>Retirer</Text>
              </TouchableOpacity>
            </View>
          ))}
          {skills.length < 3 && (
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setSkills(prev => [...prev, { id: `skill_${Date.now()}`, label: '', detail: '', score: 50 }])}
            >
              <Text style={styles.secondaryButtonText}>Ajouter une compétence</Text>
            </TouchableOpacity>
          )}
        </Section>

        <Section title="MES 3 QUESTIONS">
          {questions.map((question, questionIndex) => (
            <View style={styles.questionCard} key={questionIndex}>
              <Text style={styles.label}>Question {questionIndex + 1}</Text>
              <TextInput
                style={styles.input}
                value={question.text}
                onChangeText={value => setQuestions(prev => prev.map((item, i) => i === questionIndex ? { ...item, text: value } : item))}
                placeholder="Ta question"
                placeholderTextColor="#A8957C"
              />
              {([0, 1, 2] as const).map(answerIndex => (
                <TouchableOpacity
                  key={answerIndex}
                  style={[styles.answerRow, question.correctAnswer === answerIndex && styles.answerRowActive]}
                  onPress={() => setQuestions(prev => prev.map((item, i) => i === questionIndex ? { ...item, correctAnswer: answerIndex } : item))}
                >
                  <TextInput
                    style={styles.answerInput}
                    value={question.options[answerIndex]}
                    onChangeText={value => setQuestions(prev => prev.map((item, i) => {
                      if (i !== questionIndex) return item;
                      const options = [...item.options] as [string, string, string];
                      options[answerIndex] = value;
                      return { ...item, options };
                    }))}
                    placeholder={`Réponse ${answerIndex + 1}`}
                    placeholderTextColor="#A8957C"
                  />
                  <Text style={styles.answerState}>{question.correctAnswer === answerIndex ? 'Bonne réponse' : 'Choisir'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ))}
          {!questionsReady && <Text style={styles.helperText}>Complète les 3 questions et leurs 3 réponses pour les sauvegarder.</Text>}
        </Section>

        <TouchableOpacity style={styles.saveButton} onPress={save} disabled={saving}>
          {saving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.saveButtonText}>Sauvegarder mon profil</Text>}
        </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border, backgroundColor: COLORS.paper },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '900', color: COLORS.ink, letterSpacing: 1.3 },
  headerButton: { minWidth: 58, paddingVertical: 8 },
  headerButtonText: { fontSize: 13, fontWeight: '700', color: COLORS.accent },
  scroll: { padding: 16, paddingBottom: 80 },
  avatarBlock: { alignItems: 'center', marginVertical: 8 },
  linkText: { marginTop: 8, fontSize: 13, fontWeight: '700', color: COLORS.accent },
  section: { backgroundColor: COLORS.paper, borderWidth: 1, borderColor: COLORS.border, borderRadius: 18, padding: 16, marginTop: 14 },
  sectionTitle: { fontSize: 14, fontWeight: '900', color: COLORS.ink, marginBottom: 12, letterSpacing: 0.7 },
  label: { fontSize: 12, fontWeight: '700', color: COLORS.muted, marginTop: 10, marginBottom: 6 },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, color: COLORS.ink, fontSize: 14 },
  multiline: { minHeight: 110, textAlignVertical: 'top' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.background, borderRadius: 18, paddingHorizontal: 12, paddingVertical: 8 },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { fontSize: 13, fontWeight: '600', color: COLORS.ink },
  chipTextActive: { color: '#FFF' },
  secondaryButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 16, alignItems: 'center', marginTop: 12 },
  secondaryButtonText: { color: COLORS.accent, fontSize: 13, fontWeight: '800' },
  skillCard: { backgroundColor: COLORS.soft, borderRadius: 14, padding: 12, marginBottom: 10 },
  removeText: { marginTop: 8, color: COLORS.accent, fontSize: 12, fontWeight: '700', textAlign: 'right' },
  questionCard: { backgroundColor: COLORS.soft, borderRadius: 14, padding: 12, marginBottom: 12 },
  answerRow: { marginTop: 8, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.paper, padding: 8 },
  answerRowActive: { borderColor: COLORS.accent },
  answerInput: { color: COLORS.ink, fontSize: 14, paddingVertical: 4 },
  answerState: { marginTop: 4, fontSize: 10, fontWeight: '700', color: COLORS.muted },
  helperText: { fontSize: 12, color: COLORS.muted, lineHeight: 18 },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 18 },
  saveButtonText: { color: '#FFF', fontSize: 16, fontWeight: '900' },
});
