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
  { id: 'filiforme',    emoji: '🍝', label: 'Filiforme',              sub: 'comme un spaghetti'        },
  { id: 'ras_motte',    emoji: '🐭', label: 'Ras motte',              sub: 'petite taille'             },
  { id: 'grande_gigue', emoji: '🦒', label: 'Grande gigue',           sub: 'très grand•e'              },
  { id: 'beaute_int',   emoji: '✨', label: 'Grande beauté intérieure', sub: 'ce qui compte vraiment'  },
  { id: 'athletique',   emoji: '🏃', label: 'Athlétique',             sub: 'toujours en mouvement'     },
  { id: 'genereuse',    emoji: '🍑', label: 'En formes généreuses',   sub: 'que de courbes !'          },
  { id: 'moyenne',      emoji: '⚖️', label: 'Moyenne',                sub: 'le juste milieu parfait'   },
  { id: 'muscle',       emoji: '💪', label: 'Musclé•e',               sub: 'ça se voit sous le t-shirt'},
];

// ─── Préférences rencontre ────────────────────────────────────────────────────

const LOOKING_FOR_OPTIONS = [
  { id: 'relation',   emoji: '💑', label: 'Relation sérieuse' },
  { id: 'flirt',      emoji: '💋', label: 'Flirt'             },
  { id: 'amitie',     emoji: '🤝', label: 'Amitié'            },
  { id: 'discussion', emoji: '💬', label: 'Discussion'        },
];

const INTERESTED_IN_OPTIONS = [
  { id: 'F',  emoji: '👩', label: 'Femmes'       },
  { id: 'M',  emoji: '👨', label: 'Hommes'       },
  { id: 'NB', emoji: '🧑', label: 'Non-binaires' },
];

const INTERESTS_OPTIONS = [
  '🎵 Musique', '📚 Lecture', '🎬 Cinéma', '🍕 Gastronomie',
  '🏋️ Sport', '✈️ Voyages', '🎮 Jeux vidéo', '🌿 Nature',
  '🎨 Art', '🍳 Cuisine', '💃 Danse', '🎭 Théâtre',
  '📸 Photographie', '🐾 Animaux', '🧘 Méditation', '🚴 Vélo',
];

// ─── Situation parentale ─────────────────────────────────────────────────────

const CHILDREN_OPTIONS = [
  { id: 'no_children',       label: "Pas d'enfants" },
  { id: 'has_children',      label: "J'ai des enfants" },
  { id: 'has_children_more', label: "J'ai des enfants mais pas assez" },
  { id: 'thinking',          label: "En réflexion" },
  { id: 'not_now',           label: "Ne veut pas d'enfants pour le moment" },
  { id: 'never',             label: "Ne veut pas d'enfants" },
  { id: 'breeding',          label: "Compte se lancer dans l'élevage de …" },
];

function childrenStatusToStore(id: string | null): { hasChildren?: boolean; wantsChildren?: boolean } {
  switch (id) {
    case 'no_children':        return { hasChildren: false };
    case 'has_children':       return { hasChildren: true };
    case 'has_children_more':  return { hasChildren: true, wantsChildren: true };
    case 'thinking':           return {};
    case 'not_now':            return { hasChildren: false, wantsChildren: false };
    case 'never':              return { hasChildren: false, wantsChildren: false };
    case 'breeding':           return { wantsChildren: true };
    default:                   return {};
  }
}

function storeToChildrenStatus(has?: boolean | null, wants?: boolean | null): string | null {
  if (has === false && wants === false) return 'never';
  if (has === false)                    return 'no_children';
  if (has === true && wants === true)   return 'has_children_more';
  if (has === true)                     return 'has_children';
  if (wants === true)                   return 'breeding';
  return null;
}

function computeAge(dateStr: string): number | undefined {
  if (dateStr.trim().length !== 10) return undefined;
  const d = new Date(`${dateStr.trim()}T00:00:00.000Z`);
  if (isNaN(d.getTime())) return undefined;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  if (now.getMonth() < d.getMonth() || (now.getMonth() === d.getMonth() && now.getDate() < d.getDate())) a--;
  return a >= 0 ? a : undefined;
}

// ─── Écran principal ──────────────────────────────────────────────────────────

export function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { currentUser, setCurrentUser, avatarPngConfig } = useStore();

  const [name,          setName]          = useState(currentUser?.name        ?? '');
  const [birthDate,     setBirthDate]     = useState('');
  const [city,          setCity]          = useState(currentUser?.city        ?? '');
  const [bio,           setBio]           = useState(currentUser?.bio         ?? '');
  const [physique,      setPhysique]      = useState(currentUser?.physicalDesc ?? '');
  const [lookingFor,    setLookingFor]    = useState<string[]>(currentUser?.lookingFor   ?? []);
  const [interestedIn,  setInterestedIn]  = useState<string[]>(currentUser?.interestedIn ?? []);
  const [interests,     setInterests]     = useState<string[]>(currentUser?.interests    ?? []);
  const [height,        setHeight]        = useState(currentUser?.height != null ? String(currentUser.height) : '');
  const [childrenStatus,setChildrenStatus]= useState<string | null>(
    storeToChildrenStatus(currentUser?.hasChildren, currentUser?.wantsChildren)
  );

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

    const localProfile = {
      id:             currentUser?.id            ?? '',
      email:          currentUser?.email,
      isPremium:      currentUser?.isPremium      ?? false,
      avatarConfig:   currentUser?.avatarConfig   ?? ({} as any),
      stats:          currentUser?.stats          ?? { matchesCount: 0, lettersSent: 0, lettersReceived: 0, offeringsSent: 0, powerUsed: 0, gamesWon: 0, salonsVisited: 0, daysActive: 0, storiesParticipated: 0, storiesCompleted: 0 },
      unlockedBadges: currentUser?.unlockedBadges ?? [],
      gender:         currentUser?.gender,
      name:           name.trim(),
      age:            computeAge(birthDate) ?? currentUser?.age,
      bio:            bio.trim(),
      city:           city.trim(),
      physicalDesc:   physique,
      lookingFor,
      interestedIn,
      interests,
      hasChildren:    childrenStatus !== null ? childrenStatusToStore(childrenStatus).hasChildren  : currentUser?.hasChildren,
      wantsChildren:  childrenStatus !== null ? childrenStatusToStore(childrenStatus).wantsChildren : currentUser?.wantsChildren,
      height:         heightNum >= 100 && heightNum <= 250 ? heightNum : currentUser?.height,
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
        ...(childrenStatus !== null ? childrenStatusToStore(childrenStatus) : {}),
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

          <Text style={styles.inputLabel}>Date de naissance</Text>
          <TextInput
            style={styles.input}
            value={birthDate}
            onChangeText={setBirthDate}
            placeholder="AAAA-MM-JJ"
            keyboardType="numeric"
            maxLength={10}
            placeholderTextColor="#B8A082"
          />

          <Text style={styles.inputLabel}>Ville</Text>
          <TextInput style={styles.input} value={city} onChangeText={setCity} placeholder="Ex: Paris" placeholderTextColor="#B8A082" />

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

        {/* ── Situation parentale ── */}
        <SectionCard emoji="👶" title="Situation parentale">
          <View style={styles.chipGrid}>
            {CHILDREN_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.id}
                style={[styles.chip, childrenStatus === opt.id && styles.chipActive]}
                onPress={() => setChildrenStatus(childrenStatus === opt.id ? null : opt.id)}
              >
                <Text style={styles.chipText}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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

const PINK  = '#E91E8C';
const BEIGE = '#FFF8E7';
const BROWN = '#3A2818';
const SAND  = '#E8D5B7';
const MOCHA = '#8B6F47';

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: BEIGE },

  // Header
  header:         { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: SAND, backgroundColor: BEIGE },
  backBtn:        { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: SAND },
  backIcon:       { fontSize: 20, color: BROWN, fontWeight: '700' },
  headerTitle:    { flex: 1, textAlign: 'center', fontSize: 20, fontWeight: '900', color: BROWN, letterSpacing: 2 },
  saveHeaderBtn:  { backgroundColor: PINK, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  saveHeaderText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  scroll: { padding: 16, paddingBottom: 100 },

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
  inputLabel:      { fontSize: 13, fontWeight: '600', color: '#5D4037', marginBottom: 6, marginTop: 10 },
  input:           { backgroundColor: BEIGE, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 13, fontSize: 15, borderWidth: 1, borderColor: SAND, color: BROWN },
  bioInput:        { height: 110, textAlignVertical: 'top' },
  charCount:       { fontSize: 12, color: MOCHA, textAlign: 'right', marginTop: 6 },
  charCountOk:     { color: '#4CAF50', fontWeight: '700' },
  row2:            { flexDirection: 'row', marginTop: 4 },
  halfField:       { flex: 1 },
  subLabel:        { fontSize: 13, color: MOCHA, marginBottom: 14, lineHeight: 20 },
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
  saveBtn:     { backgroundColor: PINK, borderRadius: 20, padding: 20, alignItems: 'center', marginTop: 8, marginBottom: 20 },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 17, letterSpacing: 0.5 },
});
