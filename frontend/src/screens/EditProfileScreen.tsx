import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { Avatar } from '../avatar/png/Avatar';

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

// ─── Enfants ─────────────────────────────────────────────────────────────────

const ENFANTS_OPTIONS = [
  { id: 'aucun',      emoji: '🌱', label: "Pas d'enfants",                            sub: 'liberté totale'          },
  { id: 'oui',        emoji: '👨‍👧', label: "J'ai des enfants",                          sub: 'mode parent activé'      },
  { id: 'oui_plus',   emoji: '👨‍👧‍👦', label: "J'ai des enfants mais pas assez",           sub: 'la maison est animée'    },
  { id: 'reflexion',  emoji: '🤔', label: 'En réflexion',                               sub: 'les pour et les contre'  },
  { id: 'non_moment', emoji: '⏳', label: 'Pas pour le moment',                         sub: 'on verra plus tard'      },
  { id: 'non',        emoji: '🙅', label: "Ne veut pas d'enfants",                      sub: "c'est décidé"            },
  { id: 'pingouins',  emoji: '🐧', label: "Compte se lancer dans l'élevage de pingouins", sub: "c'est ambitieux"         },
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
  const [city,        setCity]        = useState(currentUser?.city        ?? '');

  const parsedBirth = (() => {
    const bd = currentUser?.birthDate;
    if (!bd) return { d: '', m: '', y: '' };
    const [y, m, d] = bd.split('-');
    return { d: d ?? '', m: m ?? '', y: y ?? '' };
  })();
  const [birthDay,   setBirthDay]   = useState(parsedBirth.d);
  const [birthMonth, setBirthMonth] = useState(parsedBirth.m);
  const [birthYear,  setBirthYear]  = useState(parsedBirth.y);
  const [bio,         setBio]         = useState(currentUser?.bio         ?? '');
  const [height,      setHeight]      = useState(String(currentUser?.height   ?? ''));
  const [children,    setChildren]    = useState(currentUser?.children  ?? '');
  const [physique,    setPhysique]    = useState(currentUser?.physicalDesc ?? '');
  const [lookingFor,  setLookingFor]  = useState<string[]>(currentUser?.lookingFor  ?? []);
  const [interestedIn,setInterestedIn]= useState<string[]>(currentUser?.interestedIn ?? []);
  const [interests,   setInterests]   = useState<string[]>(currentUser?.interests   ?? []);
  const [questions,   setQuestions]   = useState<Question[]>(
    (currentUser?.questions as Question[] | undefined) ?? [EMPTY_QUESTION(), EMPTY_QUESTION(), EMPTY_QUESTION()]
  );

  const computedAge = (() => {
    const d = parseInt(birthDay), m = parseInt(birthMonth), y = parseInt(birthYear);
    if (!d || !m || !y || y < 1900 || y > new Date().getFullYear()) return null;
    const today = new Date();
    let age = today.getFullYear() - y;
    if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age--;
    return age >= 13 && age < 120 ? age : null;
  })();

  const isLocked = !!currentUser?.birthDate;

  const toggleItem = (list: string[], setList: (v: string[]) => void, id: string) => {
    setList(list.includes(id) ? list.filter(x => x !== id) : [...list, id]);
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Manque', 'Renseigne ton prénom.'); return; }
    if (bio.trim().length < 50) { Alert.alert('Bio trop courte', 'Min 50 caractères.'); return; }
    const birthDate = birthYear && birthMonth && birthDay
      ? `${birthYear}-${birthMonth.padStart(2, '0')}-${birthDay.padStart(2, '0')}`
      : currentUser?.birthDate;

    setCurrentUser({
      ...(currentUser as any),
      name: name.trim(),
      birthDate,
      age: computedAge ?? currentUser?.age,
      bio: bio.trim(),
      city: city.trim(),
      height: parseInt(height) || currentUser?.height,
      children,
      physicalDesc: physique,
      questions,
      lookingFor,
      interestedIn,
      interests,
    });
    router.back();
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
          {isLocked ? (
            <View style={styles.lockedField}>
              <Text style={styles.lockedText}>{name}</Text>
              <Text style={styles.lockedBadge}>🔒 non modifiable</Text>
            </View>
          ) : (
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Ton prénom" placeholderTextColor="#B8A082" />
          )}

          <View style={styles.row2}>
            <View style={styles.halfField}>
              <Text style={styles.inputLabel}>Ville</Text>
              <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Paris" placeholderTextColor="#B8A082" />
            </View>
            <View style={[styles.halfField, { marginLeft: 12 }]}>
              <Text style={styles.inputLabel}>Taille (cm)</Text>
              <TextInput style={styles.input} value={height} onChangeText={setHeight} placeholder="Ex: 168" keyboardType="numeric" placeholderTextColor="#B8A082" />
            </View>
          </View>

          <Text style={styles.inputLabel}>Date de naissance</Text>
          {isLocked ? (
            <View style={styles.lockedField}>
              <Text style={styles.lockedText}>
                {birthDay}/{birthMonth}/{birthYear}
                {computedAge !== null ? `  —  ${computedAge} ans` : ''}
              </Text>
              <Text style={styles.lockedBadge}>🔒 non modifiable</Text>
            </View>
          ) : (
            <View style={styles.birthRow}>
              <TextInput style={[styles.input, styles.birthField]} value={birthDay} onChangeText={setBirthDay} placeholder="JJ" keyboardType="numeric" maxLength={2} placeholderTextColor="#B8A082" />
              <Text style={styles.birthSep}>/</Text>
              <TextInput style={[styles.input, styles.birthField]} value={birthMonth} onChangeText={setBirthMonth} placeholder="MM" keyboardType="numeric" maxLength={2} placeholderTextColor="#B8A082" />
              <Text style={styles.birthSep}>/</Text>
              <TextInput style={[styles.input, styles.birthFieldYear]} value={birthYear} onChangeText={setBirthYear} placeholder="AAAA" keyboardType="numeric" maxLength={4} placeholderTextColor="#B8A082" />
              {computedAge !== null && (
                <Text style={styles.birthAge}>→ {computedAge} ans ✓</Text>
              )}
            </View>
          )}
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

        {/* ── Enfants ── */}
        <SectionCard emoji="👶" title="Côté enfants">
          <Text style={styles.subLabel}>Une question qui mérite une vraie réponse (et un peu d'humour)</Text>
          {ENFANTS_OPTIONS.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.physiqueCard, children === opt.id && styles.physiqueCardActive]}
              onPress={() => setChildren(children === opt.id ? '' : opt.id)}
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

  // Champs verrouillés (création uniquement)
  lockedField:    { backgroundColor: '#F0EBE3', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, borderWidth: 1, borderColor: '#DDD0BC', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lockedText:     { fontSize: 15, color: BROWN, fontWeight: '600', flex: 1 },
  lockedBadge:    { fontSize: 12, color: '#B8A082', marginLeft: 8 },

  // Date de naissance
  birthRow:       { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 8 },
  birthField:     { width: 52, textAlign: 'center', paddingHorizontal: 8 },
  birthFieldYear: { width: 76, textAlign: 'center', paddingHorizontal: 8 },
  birthSep:       { fontSize: 18, color: '#B8A082', fontWeight: '700' },
  birthAge:       { fontSize: 14, color: '#4CAF50', fontWeight: '700', marginLeft: 4, flex: 1 },

  // Save button
  saveBtn:     { backgroundColor: PINK, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
});
