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
  { id: 'relation',   emoji: '💑', label: "J'ai vu de la lumière, je suis entré·e" },
  { id: 'flirt',      emoji: '💋', label: "Rien de trop sérieux"                   },
  { id: 'amitie',     emoji: '🤝', label: "Des affinités, d'abord"                 },
  { id: 'discussion', emoji: '💬', label: "Je cherche à discuter"                  },
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

function childrenLabel(hasChildren?: boolean | null, wantsChildren?: boolean | null): string | null {
  if (hasChildren === true  && wantsChildren === true)  return "A des enfants — et prêt·e à agrandir la troupe";
  if (hasChildren === true  && wantsChildren === false) return "A des enfants, c'est largement suffisant";
  if (hasChildren === true  && wantsChildren == null)   return "A des enfants";
  if (hasChildren === false && wantsChildren === true)  return "Pas d'enfants — compte se lancer dans l'élevage de pingouins";
  if (hasChildren === false && wantsChildren === false) return "Pas d'enfants, et ça ne changera pas";
  if (hasChildren === false && wantsChildren == null)   return "Pas d'enfants";
  if (hasChildren == null   && wantsChildren === true)  return "En réflexion — probablement oui";
  if (hasChildren == null   && wantsChildren === false) return "Pas vraiment prévu d'enfants";
  return null;
}

// ─── Champs V1 ────────────────────────────────────────────────────────────────

type Skill = { id: string; label: string; detail: string; score: number; emoji: string };

// ─── Liste centralisée des compétences ───────────────────────────────────────
const SKILL_OPTIONS = [
  { id: 'communication', label: 'Communication',       emoji: '💬' },
  { id: 'cuisine',       label: 'Cuisine',             emoji: '🍝' },
  { id: 'organisation',  label: 'Organisation',        emoji: '🗂️' },
  { id: 'ponctualite',   label: 'Ponctualité',         emoji: '⏰' },
  { id: 'ecoute',        label: 'Écoute',              emoji: '👂' },
  { id: 'humour',        label: 'Humour',              emoji: '😄' },
  { id: 'empathie',      label: 'Empathie',            emoji: '🫂' },
  { id: 'creativite',    label: 'Créativité',          emoji: '🎨' },
  { id: 'patience',      label: 'Patience',            emoji: '🕊️' },
  { id: 'seduction',     label: 'Séduction',           emoji: '💋' },
  { id: 'bricolage',     label: 'Bricolage',           emoji: '🔧' },
  { id: 'sport',         label: 'Sport',               emoji: '🏃' },
  { id: 'romantisme',    label: 'Romantisme',          emoji: '🌹' },
  { id: 'memoire',       label: 'Mémoire',             emoji: '🧠' },
  { id: 'techno',        label: 'Technologie',         emoji: '💻' },
  { id: 'navigation',    label: 'Navigation GPS',      emoji: '🗺️' },
  { id: 'drama',         label: 'Gestion des dramas',  emoji: '🎭' },
  { id: 'nocturnite',    label: 'Vie nocturne',        emoji: '🌙' },
  { id: 'menage',        label: 'Ménage',              emoji: '🧹' },
  { id: 'finances',      label: 'Budget',              emoji: '💸' },
];

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

const SCORE_VALUES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

const SkillCard: React.FC<SkillCardProps> = ({ skill, onChange, onRemove }) => (
  <View style={skStyles.card}>
    <View style={skStyles.topRow}>
      <Text style={skStyles.skillEmoji}>{skill.emoji}</Text>
      <Text style={skStyles.skillLabel}>{skill.label}</Text>
      <TouchableOpacity style={skStyles.removeBtn} onPress={onRemove}>
        <Text style={skStyles.removeText}>✕</Text>
      </TouchableOpacity>
    </View>
    <TextInput
      style={[skStyles.input, !skill.detail.trim() && skStyles.inputMissing]}
      value={skill.detail}
      onChangeText={d => onChange({ ...skill, detail: d })}
      placeholder="Commentaire drôle (obligatoire)…"
      maxLength={100}
      placeholderTextColor="#B8A082"
    />
    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
      <View style={skStyles.scoreRow}>
        <Text style={skStyles.scoreLabel}>{skill.score}/100</Text>
        {SCORE_VALUES.map(v => (
          <TouchableOpacity
            key={v}
            style={[skStyles.scoreBtn, skill.score === v && skStyles.scoreBtnActive]}
            onPress={() => onChange({ ...skill, score: v })}
          >
            <Text style={[skStyles.scoreBtnText, skill.score === v && skStyles.scoreBtnTextActive]}>
              {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  </View>
);

const skStyles = StyleSheet.create({
  card:               { backgroundColor: '#FFF8F0', borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: '#E8D5B7' },
  topRow:             { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  skillEmoji:         { fontSize: 22 },
  skillLabel:         { flex: 1, fontSize: 15, fontWeight: '700', color: '#3A2818' },
  removeBtn:          { width: 28, height: 28, borderRadius: 8, backgroundColor: '#FFE4E4', alignItems: 'center', justifyContent: 'center' },
  removeText:         { fontSize: 12, color: '#E91E8C', fontWeight: '700' },
  input:              { backgroundColor: '#FFF8E7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, borderWidth: 1, borderColor: '#E8D5B7', color: '#3A2818', marginBottom: 10 },
  inputMissing:       { borderColor: '#E91E8C', borderWidth: 1.5 },
  scoreRow:           { flexDirection: 'row', alignItems: 'center', gap: 6 },
  scoreLabel:         { fontSize: 12, fontWeight: '700', color: '#8B6F47', minWidth: 48 },
  scoreBtn:           { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 8, backgroundColor: '#E8D5B7' },
  scoreBtnActive:     { backgroundColor: '#E91E8C' },
  scoreBtnText:       { fontSize: 11, fontWeight: '600', color: '#5A3A1A' },
  scoreBtnTextActive: { color: '#FFF' },
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

  const [pseudo,      setPseudo]      = useState(currentUser?.pseudo ?? currentUser?.name ?? '');
  const [birthDate,   setBirthDate]   = useState(
    currentUser?.birthDate ? String(currentUser.birthDate).slice(0, 10) : ''
  );
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
    if (!pseudo.trim()) { Alert.alert('Manque', 'Renseigne ton pseudo.'); return; }
    if (bio.trim().length > 0 && bio.trim().length < 50) {
      Alert.alert('Bio trop courte', 'Min 50 caractères. Les autres champs sont sauvegardés.');
    }

    const LF_MAP: Record<string, string> = { relation: 'RELATION', flirt: 'FLIRT', amitie: 'AMITIE', discussion: 'DISCUSSION', serieux: 'SERIEUX' };
    const GI_MAP: Record<string, string> = { F: 'FEMME', M: 'HOMME', NB: 'AUTRE' };
    const LF_REVERSE: Record<string, string> = { RELATION: 'relation', FLIRT: 'flirt', AMITIE: 'amitie', DISCUSSION: 'discussion', SERIEUX: 'serieux' };
    const GI_REVERSE: Record<string, string> = { FEMME: 'F', HOMME: 'M', AUTRE: 'NB' };
    const PHYSIQUE_MAP_TO_API: Record<string, string> = {
      filiforme: 'filiforme',
      ras_motte: 'ras_motte',
      grande_gigue: 'grande_gigue',
      beaute_int: 'doux',
      athletique: 'athletique',
      genereuse: 'costaud',
      moyenne: 'mignon',
      muscle: 'mysterieux',
    };
    const PHYSIQUE_MAP_FROM_API: Record<string, string> = {
      filiforme: 'filiforme',
      ras_motte: 'ras_motte',
      grande_gigue: 'grande_gigue',
      doux: 'beaute_int',
      athletique: 'athletique',
      costaud: 'genereuse',
      mignon: 'moyenne',
      mysterieux: 'muscle',
    };
    const heightNum = parseInt(height);
    const birthDateIso = (() => {
      if (!birthDate.trim()) return currentUser?.birthDate;
      const d = new Date(`${birthDate.trim()}T00:00:00.000Z`);
      if (isNaN(d.getTime())) return currentUser?.birthDate;
      return d.toISOString();
    })();
    const ageFromBirthDate = (() => {
      if (!birthDateIso) return currentUser?.age;
      const bd = new Date(birthDateIso);
      if (isNaN(bd.getTime())) return currentUser?.age;
      const now = new Date();
      let a = now.getFullYear() - bd.getFullYear();
      if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) a--;
      return a;
    })();
    const filteredIdealDay = idealDay.filter(s => s.trim());
    const validSkills = skills.filter(s => s.id && s.detail.trim());

    const localProfile = {
      id:             currentUser?.id            ?? '',
      email:          currentUser?.email,
      isPremium:      currentUser?.isPremium      ?? false,
      avatarConfig:   currentUser?.avatarConfig   ?? ({} as any),
      stats:          currentUser?.stats          ?? { matchesCount: 0, lettersSent: 0, lettersReceived: 0, offeringsSent: 0, powerUsed: 0, gamesWon: 0, salonsVisited: 0, daysActive: 0, storiesParticipated: 0, storiesCompleted: 0 },
      unlockedBadges: currentUser?.unlockedBadges ?? [],
      gender:         currentUser?.gender,
      name:           pseudo.trim(),
      pseudo:         pseudo.trim(),
      age:            ageFromBirthDate,
      birthDate:      birthDateIso,
      bio:            bio.trim(),
      city:           city.trim(),
      physicalDesc:   physique || currentUser?.physicalDesc,
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

    console.log("SAVE_PAYLOAD", localProfile);
    setCurrentUser(localProfile);
    console.log("STORE_AFTER_SAVE", useStore.getState().currentUser);

    try {
      const res = await apiFetch('/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({
          pseudo:       pseudo.trim(),
          birthDate:    birthDateIso,
          bio:          bio.trim(),
          city:         city.trim(),
          physicalDesc: PHYSIQUE_MAP_TO_API[physique] || undefined,
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
      });

      const p = res?.data;
      if (p) {
        const nextBirthDate = p.birthDate ?? birthDateIso;
        const ageFromApi = (() => {
          if (!nextBirthDate) return localProfile.age;
          const bd = new Date(nextBirthDate);
          if (isNaN(bd.getTime())) return localProfile.age;
          const now = new Date();
          let a = now.getFullYear() - bd.getFullYear();
          if (now.getMonth() < bd.getMonth() || (now.getMonth() === bd.getMonth() && now.getDate() < bd.getDate())) a--;
          return a;
        })();
        setCurrentUser({
          ...localProfile,
          name: p.pseudo ?? localProfile.pseudo,
          pseudo: p.pseudo ?? localProfile.pseudo,
          birthDate: nextBirthDate,
          age: ageFromApi,
          city: p.city ?? localProfile.city,
          bio: p.bio ?? localProfile.bio,
          physicalDesc: PHYSIQUE_MAP_FROM_API[p.physicalDesc] ?? localProfile.physicalDesc,
          lookingFor: (p.lookingFor ?? localProfile.lookingFor ?? []).map((v: string) => LF_REVERSE[v] ?? v),
          interestedIn: (p.interestedIn ?? localProfile.interestedIn ?? []).map((v: string) => GI_REVERSE[v] ?? v),
          interests: p.interests ?? localProfile.interests,
          height: p.height ?? localProfile.height,
          hasChildren: p.hasChildren ?? localProfile.hasChildren,
          wantsChildren: p.wantsChildren ?? localProfile.wantsChildren,
          vibe: p.vibe ?? localProfile.vibe,
          quote: p.quote ?? localProfile.quote,
          identityTags: p.identityTags ?? localProfile.identityTags,
          qualities: p.qualities ?? localProfile.qualities,
          defaults: p.defaults ?? localProfile.defaults,
          idealDay: p.idealDay ?? localProfile.idealDay,
          skills: p.skills ?? localProfile.skills,
        });
      }
    } catch (err: any) {
      console.warn('PATCH /profiles/me failed (local save OK):', err?.message);
    }

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

        {/* ── Bio ── */}
        <SectionCard emoji="✨" title="BIO">
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
            {bio.length} / 500 {bio.length >= 50 ? '✓' : `(min 50 caractères)`}
          </Text>
        </SectionCard>

        {/* ── Ma citation ── */}
        <SectionCard emoji="💬" title="MA CITATION">
          <Text style={styles.subLabel}>Affichée en italique dans ton journal de bord</Text>
          <TextInput
            style={[styles.input, { height: 70, textAlignVertical: 'top' }]}
            value={quote}
            onChangeText={setQuote}
            placeholder="Ex: « Un mélange de sérieux et d'autodérision »"
            placeholderTextColor="#B8A082"
            maxLength={150}
            multiline
          />
        </SectionCard>

        {/* ── Ce que je cherche ici ── */}
        <SectionCard emoji="💕" title="CE QUE JE CHERCHE ICI">
          <Text style={styles.subSectionLabel}>Ce qui s'affichera dans ton profil :</Text>
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

        {/* ── Un peu de moi ── */}
        <SectionCard emoji="📍" title="UN PEU DE MOI">
          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Ville</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Paris" placeholderTextColor="#B8A082" />
            </View>
            <View style={[styles.halfField, { marginLeft: 12 }]}>
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
            </View>
          </View>

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>Morphologie</Text>
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

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>As-tu des enfants ?</Text>
          <View style={styles.chipGrid}>
            {[
              { label: "J'ai des enfants",                   value: true  as boolean | null },
              { label: "Je n'ai pas d'enfant",               value: false as boolean | null },
              { label: 'Je préfère en parler plus tard',      value: null  as boolean | null },
            ].map(opt => (
              <TouchableOpacity
                key={opt.label}
                style={[styles.chip, hasChildren === opt.value && styles.chipActive]}
                onPress={() => setHasChildren(opt.value)}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>Souhaites-tu avoir des enfants ?</Text>
          <View style={styles.chipGrid}>
            {[
              { label: "J'en veux",                          value: true  as boolean | null },
              { label: "Je n'en veux pas",                   value: false as boolean | null },
              { label: "Je n'ai pas encore décidé",          value: null  as boolean | null },
            ].map(opt => (
              <TouchableOpacity
                key={`wants-${opt.label}`}
                style={[styles.chip, wantsChildren === opt.value && styles.chipActive]}
                onPress={() => setWantsChildren(opt.value)}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {!!childrenLabel(hasChildren, wantsChildren) && (
            <Text style={styles.childrenPreview}>
              👶 Affiché dans le profil : « {childrenLabel(hasChildren, wantsChildren)} »
            </Text>
          )}
        </SectionCard>

        {/* ── Ce que je gère ── */}
        <SectionCard emoji="🎯" title={`CE QUE JE GÈRE  (${skills.length}/5)`}>
          <Text style={styles.subLabel}>Choisis 3 à 5 compétences — sois honnête (ou presque)</Text>
          {skills.map((sk, i) => (
            <SkillCard
              key={sk.id}
              skill={sk}
              onChange={updated => {
                const copy = [...skills];
                copy[i] = updated;
                setSkills(copy);
              }}
              onRemove={() => setSkills(skills.filter((_, j) => j !== i))}
            />
          ))}
          {skills.length < 3 && (
            <Text style={styles.skillWarning}>⚠️ Minimum 3 compétences requises</Text>
          )}
          {skills.length < 5 && (
            <>
              <Text style={[styles.subLabel, { marginTop: 12 }]}>
                {skills.length === 0 ? 'Sélectionne des compétences :' : 'En ajouter une autre :'}
              </Text>
              <View style={styles.chipGrid}>
                {SKILL_OPTIONS
                  .filter(opt => !skills.find(s => s.id === opt.id))
                  .map(opt => (
                    <TouchableOpacity
                      key={opt.id}
                      style={styles.chip}
                      onPress={() =>
                        setSkills([...skills, { id: opt.id, label: opt.label, emoji: opt.emoji, detail: '', score: 50 }])
                      }
                    >
                      <Text style={styles.chipText}>{opt.emoji} {opt.label}</Text>
                    </TouchableOpacity>
                  ))}
              </View>
            </>
          )}
        </SectionCard>

        {/* ── Mes petits + et − ── */}
        <SectionCard emoji="⚖️" title="MES PETITS + ET MES PETITS −">
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
        <SectionCard emoji="🌅" title="JOURNÉE IDÉALE">
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

        {/* ── Mes tags (matching invisible) ── */}
        <SectionCard emoji="🏷️" title="MES TAGS">
          <Text style={styles.tagsNote}>
            Ces informations n'apparaissent pas dans ton profil visible.{'\n'}Elles servent à te trouver des profils compatibles.
          </Text>

          <Text style={styles.inputLabel}>Mon univers en une phrase (80 car. max)</Text>
          <TextInput
            style={styles.input}
            value={vibe}
            onChangeText={setVibe}
            placeholder="Ex: Romantique curieuse, soleil et autodérision"
            placeholderTextColor="#B8A082"
            maxLength={80}
          />

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>Qui je suis (5 max)</Text>
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

          <Text style={[styles.subSectionLabel, { marginTop: 16 }]}>Centres d'intérêt (8 max)</Text>
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

  skillWarning:     { fontSize: 12, color: '#E91E8C', fontWeight: '600', marginBottom: 10 },
  tagsNote:         { fontSize: 13, color: '#8B6F47', fontStyle: 'italic', lineHeight: 20, backgroundColor: '#FFF8E7', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#E8D5B7' },
  childrenPreview:  { marginTop: 14, fontSize: 13, color: '#5A3A1A', fontStyle: 'italic', backgroundColor: '#FFF8E7', borderRadius: 10, padding: 10, borderWidth: 1, borderColor: '#E8D5B7' },

  // Save button
  saveBtn:      { backgroundColor: PINK, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText:  { color: '#FFF', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
});
