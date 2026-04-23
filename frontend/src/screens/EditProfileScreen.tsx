import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';
import { apiFetch } from '../api/client';

// ─── Description physique avec humour ────────────────────────────────────────

const PHYSIQUE_OPTIONS = [
  { id: 'filiforme',   emoji: '🍝', label: 'Filiforme',             sub: 'comme un spaghetti'       },
  { id: 'ras_motte',   emoji: '🐭', label: 'Ras motte',             sub: 'petite taille'            },
  { id: 'grande_gigue',emoji: '🦒', label: 'Grande gigue',          sub: 'très grand•e'             },
  { id: 'beaute_int',  emoji: '✨', label: 'Grande beauté intérieure', sub: 'ce qui compte vraiment' },
  { id: 'athletique',  emoji: '🏃', label: 'Athlétique',            sub: 'toujours en mouvement'    },
  { id: 'genereuse',   emoji: '🍑', label: 'En formes généreuses',  sub: 'que de courbes !'         },
  { id: 'moyenne',     emoji: '⚖️', label: 'Moyenne',               sub: 'le juste milieu parfait'  },
  { id: 'muscle',      emoji: '💪', label: 'Musclé•e',              sub: 'ça se voit sous le t-shirt'},
];

// ─── Préférences rencontre ────────────────────────────────────────────────────

const LOOKING_FOR_OPTIONS = [
  { id: 'relation',   emoji: '💑', label: 'Relation sérieuse'  },
  { id: 'flirt',      emoji: '💋', label: 'Flirt'              },
  { id: 'amitie',     emoji: '🤝', label: 'Amitié'             },
  { id: 'discussion', emoji: '💬', label: 'Discussion'         },
];

const INTERESTED_IN_OPTIONS = [
  { id: 'F',  emoji: '👩', label: 'Femmes'    },
  { id: 'M',  emoji: '👨', label: 'Hommes'    },
  { id: 'NB', emoji: '🧑', label: 'Non-binaires' },
];

const INTERESTS_OPTIONS = [
  '🎵 Musique', '📚 Lecture', '🎬 Cinéma', '🍕 Gastronomie',
  '🏋️ Sport', '✈️ Voyages', '🎮 Jeux vidéo', '🌿 Nature',
  '🎨 Art', '🍳 Cuisine', '💃 Danse', '🎭 Théâtre',
  '📸 Photographie', '🐾 Animaux', '🧘 Méditation', '🚴 Vélo',
];

// ─── Champs V1 ────────────────────────────────────────────────────────────────

type Skill = { label: string; detail: string; score: number; emoji: string };

const IDENTITY_TAG_OPTIONS = [
  'Introverti•e', 'Extraverti•e', 'Créatif•ve', 'Analytique',
  'Aventurier•ère', 'Romantique', 'Drôle', 'Sérieux•se',
  'Empathique', 'Indépendant•e', 'Curieux•se', 'Calme',
];

const QUALITY_OPTIONS = [
  'Loyal•e', 'Drôle', 'Attentionné•e', 'Honnête',
  'Créatif•ve', 'Patient•e', 'Généreux•se', 'Curieux•se',
  'Aventurier•ère', 'Empathique', 'Optimiste', 'Fiable',
];

const DEFAULT_OPTIONS = [
  'Têtu•e', 'Toujours en retard', 'Trop perfectionniste',
  "Tête en l'air", 'Trop bavard•e', 'Mauvais•e cuisinier•ère',
  'Jaloux•se', 'Mauvais•e perdant•e', 'Trop sensible',
];

// ─── Composant SkillCard ──────────────────────────────────────────────────────

interface SkillCardProps {
  skill: Skill;
  onChange: (s: Skill) => void;
  onRemove: () => void;
}

const SkillCard: React.FC<SkillCardProps> = ({ skill, onChange, onRemove }) => (
  <View style={skStyles.card}>
    <View style={skStyles.topRow}>
      <TextInput
        style={[skStyles.input, skStyles.emojiInput]}
        value={skill.emoji}
        onChangeText={e => onChange({ ...skill, emoji: e })}
        placeholder="⭐"
        maxLength={2}
        placeholderTextColor="#B8A082"
      />
      <TextInput
        style={[skStyles.input, skStyles.labelInput]}
        value={skill.label}
        onChangeText={l => onChange({ ...skill, label: l })}
        placeholder="Compétence (ex: Guitare)"
        maxLength={50}
        placeholderTextColor="#B8A082"
      />
      <TouchableOpacity style={skStyles.removeBtn} onPress={onRemove}>
        <Text style={skStyles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
    <TextInput
      style={[skStyles.input, { marginBottom: 8 }]}
      value={skill.detail}
      onChangeText={d => onChange({ ...skill, detail: d })}
      placeholder="Détail (ex: Je joue depuis 10 ans)"
      maxLength={100}
      placeholderTextColor="#B8A082"
    />
    <View style={skStyles.scoreRow}>
      <Text style={skStyles.scoreLabel}>Niveau {skill.score}/100</Text>
      {[20, 40, 60, 80, 100].map(v => (
        <TouchableOpacity
          key={v}
          style={[skStyles.scoreBtn, skill.score >= v && skStyles.scoreBtnActive]}
          onPress={() => onChange({ ...skill, score: v })}
        >
          <Text style={skStyles.scoreBtnText}>{v}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
);

const skStyles = StyleSheet.create({
  card:           { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8D5B7' },
  topRow:         { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 },
  input:          { backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, borderWidth: 1, borderColor: '#E8D5B7', color: '#3A2818' },
  emojiInput:     { width: 44, textAlign: 'center' },
  labelInput:     { flex: 1 },
  removeBtn:      { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFE4E4', alignItems: 'center', justifyContent: 'center' },
  removeText:     { fontSize: 13, color: '#E91E8C', fontWeight: '700' },
  scoreRow:       { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  scoreLabel:     { fontSize: 12, color: '#8B6F47', minWidth: 80 },
  scoreBtn:       { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: '#E8D5B7' },
  scoreBtnActive: { backgroundColor: '#E91E8C' },
  scoreBtnText:   { fontSize: 11, fontWeight: '700', color: '#FFF' },
});

// ─── Composant QuestionBlock ──────────────────────────────────────────────────

type Question = { text: string; options: [string, string, string]; correctAnswer: 0 | 1 | 2 };

const EMPTY_QUESTION = (): Question => ({ text: '', options: ['', '', ''], correctAnswer: 0 });

interface QuestionBlockProps {
  index: number;
  question: Question;
  onChange: (q: Question) => void;
}

const QuestionBlock: React.FC<QuestionBlockProps> = ({ index, question, onChange }) => (
  <View style={qStyles.block}>
    <Text style={qStyles.qLabel}>Question {index + 1}</Text>
    <TextInput
      style={qStyles.qInput}
      value={question.text}
      onChangeText={t => onChange({ ...question, text: t })}
      placeholder="Ex: Quelle est ma passion principale ?"
      placeholderTextColor="#B8A082"
    />
    <Text style={qStyles.aLabel}>3 Réponses possibles</Text>
    {([0, 1, 2] as (0 | 1 | 2)[]).map(i => (
      <View key={i} style={qStyles.optionRow}>
        <TextInput
          style={qStyles.optionInput}
          value={question.options[i]}
          onChangeText={t => {
            const opts = [...question.options] as [string, string, string];
            opts[i] = t;
            onChange({ ...question, options: opts });
          }}
          placeholder={`Réponse ${i + 1}`}
          placeholderTextColor="#B8A082"
        />
        <TouchableOpacity
          style={[qStyles.checkBtn, question.correctAnswer === i && qStyles.checkBtnActive]}
          onPress={() => onChange({ ...question, correctAnswer: i })}
        >
          <Text style={qStyles.checkIcon}>{question.correctAnswer === i ? '✓' : ''}</Text>
        </TouchableOpacity>
      </View>
    ))}
    <Text style={qStyles.hint}>Marquez la bonne réponse avec ✓</Text>
  </View>
);

const qStyles = StyleSheet.create({
  block:           { backgroundColor: '#FFF', borderRadius: 16, padding: 16, marginBottom: 14 },
  qLabel:          { fontSize: 15, fontWeight: '700', color: '#3A2818', marginBottom: 8 },
  qInput:          { backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E8D5B7', marginBottom: 12 },
  aLabel:          { fontSize: 13, fontWeight: '600', color: '#8B6F47', marginBottom: 8 },
  optionRow:       { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  optionInput:     { flex: 1, backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1, borderColor: '#E8D5B7' },
  checkBtn:        { width: 40, height: 40, borderRadius: 10, backgroundColor: '#E8D5B7', alignItems: 'center', justifyContent: 'center', marginLeft: 8, borderWidth: 2, borderColor: '#E8D5B7' },
  checkBtnActive:  { backgroundColor: '#E91E8C', borderColor: '#E91E8C' },
  checkIcon:       { fontSize: 18, color: '#FFF', fontWeight: '800' },
  hint:            { fontSize: 12, color: '#B8A082', textAlign: 'right', marginTop: 4 },
});

// ─── Écran principal ──────────────────────────────────────────────────────────

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser, avatarPngConfig } = useStore();

  const [name,        setName]        = useState(currentUser?.name        ?? '');
  const [age,         setAge]         = useState(String(currentUser?.age  ?? ''));
  const [city,        setCity]        = useState(currentUser?.city        ?? '');
  const [bio,         setBio]         = useState(currentUser?.bio         ?? '');
  const [physique,    setPhysique]    = useState(currentUser?.physicalDesc ?? '');
  const [lookingFor,  setLookingFor]  = useState<string[]>(currentUser?.lookingFor  ?? []);
  const [interestedIn,setInterestedIn]= useState<string[]>(currentUser?.interestedIn ?? []);
  const [interests,   setInterests]   = useState<string[]>(currentUser?.interests   ?? []);
  const [questions,   setQuestions]   = useState<Question[]>(
    (currentUser?.questions as Question[] | undefined) ?? [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()]
  );

  const [height,       setHeight]       = useState(currentUser?.height != null ? String(currentUser.height) : '');
  const [vibe,         setVibe]         = useState(currentUser?.vibe         ?? '');
  const [quote,        setQuote]        = useState(currentUser?.quote        ?? '');
  const [hasChildren,  setHasChildren]  = useState<boolean | null>(currentUser?.hasChildren  ?? null);
  const [wantsChildren,setWantsChildren]= useState<boolean | null>(currentUser?.wantsChildren ?? null);
  const [identityTags, setIdentityTags] = useState<string[]>(currentUser?.identityTags ?? []);
  const [qualities,    setQualities]    = useState<string[]>(currentUser?.qualities    ?? []);
  const [defaults,     setDefaults]     = useState<string[]>(currentUser?.defaults     ?? []);
  const [idealDay,     setIdealDay]     = useState<string[]>(() => {
    const saved = currentUser?.idealDay ?? [];
    return [...saved, '', '', '', '', ''].slice(0, 5);
  });
  const [skills,       setSkills]       = useState<Skill[]>(currentUser?.skills ?? []);

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const handleSave = async () => {
    if (!name.trim()) { Alert.alert('Manque', 'Renseigne ton prénom.'); return; }
    if (bio.trim().length > 0 && bio.trim().length < 50) {
      Alert.alert('Bio trop courte', 'Min 50 caractères. Les autres champs sont sauvegardés.');
    }

    const LF_MAP: Record<string, string> = { relation: 'RELATION', flirt: 'FLIRT', amitie: 'AMITIE', discussion: 'DISCUSSION', serieux: 'SERIEUX' };
    const GI_MAP: Record<string, string> = { F: 'FEMME', M: 'HOMME', NB: 'AUTRE' };
    const heightNum = parseInt(height);
    const filteredIdealDay = idealDay.filter(s => s.trim());
    const validSkills = skills.filter(s => s.label.trim());

    const localProfile = {
      id:             currentUser?.id            ?? '',
      email:          currentUser?.email,
      isPremium:      currentUser?.isPremium      ?? false,
      avatarConfig:   currentUser?.avatarConfig   ?? ({} as any),
      stats:          currentUser?.stats          ?? { matchesCount: 0, lettersSent: 0, lettersReceived: 0, offeringsSent: 0, powerUsed: 0, gamesWon: 0, salonsVisited: 0, daysActive: 0, storiesParticipated: 0, storiesCompleted: 0 },
      unlockedBadges: currentUser?.unlockedBadges ?? [],
      gender:         currentUser?.gender,
      name:           name.trim(),
      age:            parseInt(age) || currentUser?.age,
      bio:            bio.trim(),
      city:           city.trim(),
      physicalDesc:   physique,
      questions,
      lookingFor,
      interestedIn,
      interests,
      hasChildren:    hasChildren  ?? currentUser?.hasChildren,
      wantsChildren:  wantsChildren ?? currentUser?.wantsChildren,
      height:         heightNum >= 100 && heightNum <= 250 ? heightNum : currentUser?.height,
      vibe:           vibe.trim(),
      quote:          quote.trim(),
      identityTags,
      qualities,
      defaults,
      idealDay:       filteredIdealDay,
      skills:         validSkills,
    };

    setCurrentUser(localProfile);
    console.log('USER SAVED', localProfile);

    apiFetch('/profiles/me', {
      method: 'PATCH',
      body: JSON.stringify({
        bio:          bio.trim(),
        city:         city.trim(),
        physicalDesc: physique || undefined,
        lookingFor:   lookingFor.map(id => LF_MAP[id]).filter(Boolean),
        interestedIn: interestedIn.map(id => GI_MAP[id]).filter(Boolean),
        interests,
        ...(heightNum >= 100 && heightNum <= 250 && { height: heightNum }),
        ...(hasChildren  !== null && { hasChildren }),
        ...(wantsChildren !== null && { wantsChildren }),
        vibe:         vibe.trim(),
        quote:        quote.trim(),
        identityTags,
        qualities,
        defaults,
        idealDay:     filteredIdealDay,
        skills:       validSkills,
      }),
    }).catch((err: any) => {
      console.warn('PATCH /profiles/me failed (local save OK):', err?.message);
    });

    setTimeout(() => { router.back(); }, 200);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MON PROFIL</Text>
        <TouchableOpacity style={styles.saveHeaderBtn} onPress={handleSave}>
          <Text style={styles.saveHeaderText}>Sauver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* ── Avatar ── */}
        <TouchableOpacity
          style={styles.avatarSection}
          onPress={() => router.push({ pathname: '/avatar-builder' })}
          activeOpacity={0.8}
        >
          <Avatar size={110} {...avatarPngConfig} />
          <View style={styles.avatarEditBadge}>
            <Text style={styles.avatarEditIcon}>🎨</Text>
          </View>
          <Text style={styles.avatarEditHint}>Modifier mon avatar</Text>
        </TouchableOpacity>

        {/* ── Infos de base ── */}
        <SectionCard emoji="📝" title="Informations de base">
          <Text style={styles.inputLabel}>Prénom</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor="#B8A082" />

          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Âge</Text>
              <TextInput style={styles.input} value={age} onChangeText={setAge} placeholder="Ex: 28" keyboardType="numeric" placeholderTextColor="#B8A082" />
            </View>
            <View style={[styles.halfField, { marginLeft: 12 }]}>
              <Text style={styles.inputLabel}>Ville</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Paris" placeholderTextColor="#B8A082" />
            </View>
          </View>

          <Text style={styles.inputLabel}>Taille (cm)</Text>
          <TextInput
            style={styles.input}
            value={height}
            onChangeText={setHeight}
            placeholder="Ex: 175"
            keyboardType="numeric"
            maxLength={3}
            placeholderTextColor="#B8A082"
          />
        </SectionCard>

        {/* ── Bio ── */}
        <SectionCard emoji="✨" title="Bio (Obligatoire - Min 50 caractères)">
          <TextInput
            style={[styles.input, styles.bioInput]}
            value={bio}
            onChangeText={setBio}
            placeholder="Parle de toi avec authenticité…"
            placeholderTextColor="#B8A082"
            multiline
            maxLength={500}
          />
          <Text style={[styles.charCount, bio.length >= 50 && styles.charCountOk]}>
            {bio.length} / 500 caractères {bio.length >= 50 ? '✓' : `(${50 - bio.length} de plus)`}
          </Text>
        </SectionCard>

        {/* ── Description physique ── */}
        <SectionCard emoji="😄" title="Description physique (avec humour)">
          <Text style={styles.subLabel}>Comment te décrirais-tu physiquement ? Choisis l'option qui te correspond le mieux !</Text>
          {PHYSIQUE_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.physiqueCard, physique === opt.id && styles.physiqueCardActive]}
              onPress={() => setPhysique(physique === opt.id ? '' : opt.id)}
              activeOpacity={0.75}
            >
              <Text style={styles.physiqueEmoji}>{opt.emoji}</Text>
              <Text style={styles.physiqueLabel}>{opt.label}</Text>
              <Text style={styles.physiqueSub}>{opt.sub}</Text>
            </TouchableOpacity>
          ))}
        </SectionCard>

        {/* ── Préférences rencontre ── */}
        <SectionCard emoji="💕" title="Préférences de Rencontre">
          <Text style={styles.subSectionLabel}>💑 Je cherche…</Text>
          <View style={styles.chipGrid}>
            {LOOKING_FOR_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, lookingFor.includes(opt.id) && styles.chipActive]}
                onPress={() => toggleItem(lookingFor, setLookingFor, opt.id)}
              >
                <Text style={styles.chipText}>{opt.emoji} {opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>👥 Intéressé•e par</Text>
          <View style={styles.chipGrid}>
            {INTERESTED_IN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, interestedIn.includes(opt.id) && styles.chipActive]}
                onPress={() => toggleItem(interestedIn, setInterestedIn, opt.id)}
              >
                <Text style={styles.chipText}>{opt.emoji} {opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Centres d'intérêt ── */}
        <SectionCard emoji="🎯" title="Centres d'intérêt">
          <Text style={styles.subLabel}>Choisis jusqu'à 8 passions</Text>
          <View style={styles.chipGrid}>
            {INTERESTS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[
                  styles.chip,
                  interests.includes(opt) && styles.chipActive,
                  interests.length >= 8 && !interests.includes(opt) && styles.chipDisabled,
                ]}
                onPress={() => {
                  if (interests.length >= 8 && !interests.includes(opt)) return;
                  toggleItem(interests, setInterests, opt);
                }}
              >
                <Text style={styles.chipText}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Vibe & Citation ── */}
        <SectionCard emoji="💭" title="Vibe & Citation">
          <Text style={styles.inputLabel}>Ta vibe (80 car. max)</Text>
          <TextInput
            style={styles.input}
            value={vibe}
            onChangeText={setVibe}
            placeholder="Ex: Soleil et bonne humeur toute l'année"
            placeholderTextColor="#B8A082"
            maxLength={80}
          />
          <Text style={styles.inputLabel}>Ta citation (150 car. max)</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={quote}
            onChangeText={setQuote}
            placeholder="Ex: « Carpe diem » ou quelque chose qui te tient à cœur"
            placeholderTextColor="#B8A082"
            maxLength={150}
            multiline
          />
        </SectionCard>

        {/* ── Tags d'identité ── */}
        <SectionCard emoji="🏷️" title="Tags d'identité (5 max)">
          <Text style={styles.subLabel}>Ce qui te définit en quelques mots</Text>
          <View style={styles.chipGrid}>
            {IDENTITY_TAG_OPTIONS.map(tag => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.chip,
                  identityTags.includes(tag) && styles.chipActive,
                  identityTags.length >= 5 && !identityTags.includes(tag) && styles.chipDisabled,
                ]}
                onPress={() => {
                  if (identityTags.length >= 5 && !identityTags.includes(tag)) return;
                  toggleItem(identityTags, setIdentityTags, tag);
                }}
              >
                <Text style={styles.chipText}>{tag}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Qualités & Défauts ── */}
        <SectionCard emoji="⚖️" title="Qualités & Défauts (5 max chacun)">
          <Text style={styles.subSectionLabel}>✨ Mes qualités</Text>
          <View style={styles.chipGrid}>
            {QUALITY_OPTIONS.map(q => (
              <TouchableOpacity
                key={q}
                style={[
                  styles.chip,
                  qualities.includes(q) && styles.chipActive,
                  qualities.length >= 5 && !qualities.includes(q) && styles.chipDisabled,
                ]}
                onPress={() => {
                  if (qualities.length >= 5 && !qualities.includes(q)) return;
                  toggleItem(qualities, setQualities, q);
                }}
              >
                <Text style={styles.chipText}>{q}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>🤭 Mes défauts (soyons honnêtes…)</Text>
          <View style={styles.chipGrid}>
            {DEFAULT_OPTIONS.map(d => (
              <TouchableOpacity
                key={d}
                style={[
                  styles.chip,
                  defaults.includes(d) && styles.chipActive,
                  defaults.length >= 5 && !defaults.includes(d) && styles.chipDisabled,
                ]}
                onPress={() => {
                  if (defaults.length >= 5 && !defaults.includes(d)) return;
                  toggleItem(defaults, setDefaults, d);
                }}
              >
                <Text style={styles.chipText}>{d}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </SectionCard>

        {/* ── Journée idéale ── */}
        <SectionCard emoji="🌅" title="Ma journée idéale (5 étapes)">
          <Text style={styles.subLabel}>Décris ta journée parfaite étape par étape</Text>
          {idealDay.map((step, i) => (
            <TextInput
              key={i}
              style={[styles.input, { marginBottom: 8 }]}
              value={step}
              onChangeText={t => {
                const copy = [...idealDay];
                copy[i] = t;
                setIdealDay(copy);
              }}
              placeholder={`Étape ${i + 1} (ex: Café en terrasse…)`}
              placeholderTextColor="#B8A082"
              maxLength={100}
            />
          ))}
        </SectionCard>

        {/* ── Compétences ── */}
        <SectionCard emoji="🎯" title="Mes compétences (6 max)">
          <Text style={styles.subLabel}>Tes talents cachés et pas si cachés</Text>
          {skills.map((sk, i) => (
            <SkillCard
              key={i}
              skill={sk}
              onChange={updated => {
                const copy = [...skills];
                copy[i] = updated;
                setSkills(copy);
              }}
              onRemove={() => setSkills(skills.filter((_, j) => j !== i))}
            />
          ))}
          {skills.length < 6 && (
            <TouchableOpacity
              style={styles.addSkillBtn}
              onPress={() => setSkills([...skills, { label: '', detail: '', score: 50, emoji: '⭐' }])}
            >
              <Text style={styles.addSkillText}>+ Ajouter une compétence</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* ── Jeu des 3 Questions ── */}
        <SectionCard emoji="🎲" title="Jeu des 3 Questions (Brise-glace)">
          <Text style={styles.subLabel}>
            Crée 3 questions avec 3 réponses chacune. En cas de match, l'autre personne devra répondre à tes questions pour débloquer les lettres.
          </Text>
          {questions.map((q, i) => (
            <QuestionBlock
              key={i}
              index={i}
              question={q}
              onChange={updated => {
                const copy = [...questions];
                copy[i] = updated;
                setQuestions(copy);
              }}
            />
          ))}
        </SectionCard>

        {/* ── Bouton Sauvegarder ── */}
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>💾 Sauvegarder mon profil</Text>
        </TouchableOpacity>

      </ScrollView>
    </View>
  );
}

// ─── Composant utilitaire SectionCard ────────────────────────────────────────

function SectionCard({ emoji, title, children }: { emoji: string; title: string; children: React.ReactNode }) {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionEmoji}>{emoji}</Text>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const PINK   = '#E91E8C';
const BEIGE  = '#FFF8E7';
const BROWN  = '#3A2818';
const SAND   = '#E8D5B7';
const MOCHA  = '#8B6F47';

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BEIGE },

  // Header
  header:      { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SAND, backgroundColor: BEIGE },
  backBtn:     { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAND },
  backIcon:    { fontSize: 20, color: BROWN, fontWeight: '700' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '900', color: BROWN, letterSpacing: 2 },
  saveHeaderBtn:  { backgroundColor: PINK, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  saveHeaderText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  scroll:      { padding: 16, paddingBottom: 100 },

  // Avatar
  avatarSection:   { alignItems: 'center', marginBottom: 20, marginTop: 8 },
  avatarEditBadge: { position: 'absolute', bottom: 30, right: '30%', width: 34, height: 34, borderRadius: 17, backgroundColor: PINK, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: BEIGE },
  avatarEditIcon:  { fontSize: 16 },
  avatarEditHint:  { fontSize: 13, color: MOCHA, marginTop: 4, fontWeight: '600' },

  // Section cards
  sectionCard:   { backgroundColor: '#FFF', borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: SAND },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#F5EFE6' },
  sectionEmoji:  { fontSize: 22, marginRight: 10 },
  sectionTitle:  { fontSize: 16, fontWeight: '800', color: PINK, flex: 1 },

  // Inputs
  inputLabel:  { fontSize: 13, fontWeight: '600', color: '#5D4037', marginBottom: 6, marginTop: 10 },
  input:       { backgroundColor: BEIGE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, borderWidth: 1, borderColor: SAND, color: BROWN },
  bioInput:    { height: 110, textAlignVertical: 'top' },
  charCount:   { fontSize: 12, color: MOCHA, textAlign: 'right', marginTop: 6 },
  charCountOk: { color: '#4CAF50', fontWeight: '700' },
  row2:        { flexDirection: 'row', marginTop: 4 },
  halfField:   { flex: 1 },
  subLabel:    { fontSize: 13, color: MOCHA, marginBottom: 14, lineHeight: 20 },
  subSectionLabel: { fontSize: 14, fontWeight: '700', color: BROWN, marginBottom: 10 },

  // Description physique cards
  physiqueCard:       { borderRadius: 16, borderWidth: 1.5, borderColor: SAND, padding: 18, marginBottom: 10, alignItems: 'center', backgroundColor: '#FDF5E6' },
  physiqueCardActive: { borderColor: PINK, backgroundColor: '#FFF0F7' },
  physiqueEmoji:      { fontSize: 32, marginBottom: 6 },
  physiqueLabel:      { fontSize: 17, fontWeight: '800', color: BROWN, marginBottom: 4 },
  physiqueSub:        { fontSize: 13, color: MOCHA, fontStyle: 'italic' },

  // Chips
  chipGrid:     { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip:         { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, backgroundColor: BEIGE, borderWidth: 1.5, borderColor: SAND },
  chipActive:   { backgroundColor: '#FFF0F7', borderColor: PINK },
  chipDisabled: { opacity: 0.4 },
  chipText:     { fontSize: 13, fontWeight: '600', color: BROWN },

  // Save button
  saveBtn:      { backgroundColor: PINK, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText:  { color: '#FFF', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
  addSkillBtn:  { backgroundColor: '#FFF0F7', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1.5, borderColor: PINK },
  addSkillText: { color: PINK, fontWeight: '700', fontSize: 14 },
});
