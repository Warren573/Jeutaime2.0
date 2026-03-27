/**
 * AvatarEditorScreen — écran de personnalisation d'avatar, style journal / carnet.
 *
 * ─── STRUCTURE ───────────────────────────────────────────────────────────────
 *   Header          ← bouton retour + titre + bouton sauver
 *   Polaroid        ← avatar en grand + nom + ville
 *   ── Personnalisation ──
 *   AvatarSelectorRow × 7   (cheveux, nez, bouche, pilosité, vêtements, bijoux, accessoires)
 *   ── Journal intime ──
 *   Textarea bio    ← style lettre, italique, 300 chars max
 *
 * ─── EXTENSIBILITÉ ───────────────────────────────────────────────────────────
 *   - Ajouter une catégorie : ajouter une entrée dans CATEGORIES[]
 *   - Ajouter des options : ajouter dans la liste `options` de la catégorie
 *   - Connecter bio → store / API : voir TODO dans handleSave
 *   - Effets / transformations : ajouter des AvatarSelectorRow dédiées
 */

import React, { useCallback, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { Avatar } from '../avatar/png/Avatar';
import { AvatarConfig } from '../avatar/png/defaults';
import { AvatarSelectorRow } from '../avatar/png/editor/AvatarSelectorRow';
import type {
  AvatarLayerKey,
  AvatarOption,
} from '../avatar/png/editor/AvatarOptionItem';
import { theme, journal } from '../styles/theme';
import { useStore } from '../store/useStore';

// ─── Données des catégories ───────────────────────────────────────────────────

type CategoryConfig = {
  key: AvatarLayerKey;
  title: string;
  icon: string;
  options: AvatarOption[];
};

const CATEGORIES: CategoryConfig[] = [
  {
    key: 'hair',
    title: 'Cheveux',
    icon: '✂️',
    options: [
      { id: null,       label: 'Aucun'    },
      { id: 'hair_01',  label: 'Style 1'  },
      { id: 'hair_02',  label: 'Style 2'  },
      { id: 'hair_03',  label: 'Style 3'  },
      { id: 'hair_04',  label: 'Style 4'  },
      { id: 'hair_05',  label: 'Style 5'  },
      { id: 'hair_06',  label: 'Style 6'  },
      { id: 'hair_07',  label: 'Style 7'  },
      { id: 'hair_08',  label: 'Style 8'  },
      { id: 'hair_09',  label: 'Style 9'  },
      { id: 'hair_10',  label: 'Style 10' },
      { id: 'hair_11',  label: 'Style 11' },
      { id: 'hair_12',  label: 'Style 12' },
      { id: 'hair_13',  label: 'Style 13' },
      { id: 'hair_14',  label: 'Style 14' },
    ],
  },
  {
    key: 'nose',
    title: 'Nez',
    icon: '👃',
    options: [
      { id: 'nose_01', label: 'Style 1' },
      { id: 'nose_02', label: 'Style 2' },
      { id: 'nose_03', label: 'Style 3' },
      { id: 'nose_04', label: 'Style 4' },
      { id: 'nose_05', label: 'Style 5' },
      { id: 'nose_06', label: 'Style 6' },
    ],
  },
  {
    key: 'mouth',
    title: 'Bouche',
    icon: '💋',
    options: [
      { id: 'mouth_01', label: 'Style 1' },
      { id: 'mouth_02', label: 'Style 2' },
      { id: 'mouth_03', label: 'Style 3' },
      { id: 'mouth_04', label: 'Style 4' },
      { id: 'mouth_05', label: 'Style 5' },
      { id: 'mouth_06', label: 'Style 6' },
      { id: 'mouth_07', label: 'Style 7' },
    ],
  },
  {
    key: 'pilosite',
    title: 'Pilosité',
    icon: '🧔',
    options: [
      { id: null,          label: 'Aucune'    },
      { id: 'beard_01',    label: 'Barbe 1'   },
      { id: 'beard_02',    label: 'Barbe 2'   },
      { id: 'beard_03',    label: 'Barbe 3'   },
      { id: 'beard_04',    label: 'Barbe 4'   },
      { id: 'mustache_01', label: 'Moustache' },
    ],
  },
  {
    key: 'clothes',
    title: 'Vêtements',
    icon: '👕',
    options: [
      { id: null,         label: 'Basique'  },
      { id: 'clothes_01', label: 'Tenue 1'  },
      { id: 'clothes_02', label: 'Tenue 2'  },
      { id: 'clothes_03', label: 'Tenue 3'  },
      { id: 'clothes_04', label: 'Tenue 4'  },
      { id: 'clothes_05', label: 'Tenue 5'  },
      { id: 'clothes_06', label: 'Tenue 6'  },
      { id: 'clothes_07', label: 'Tenue 7'  },
      { id: 'clothes_08', label: 'Tenue 8'  },
      { id: 'clothes_09', label: 'Tenue 9'  },
      { id: 'clothes_10', label: 'Tenue 10' },
      { id: 'clothes_11', label: 'Tenue 11' },
      { id: 'clothes_12', label: 'Tenue 12' },
      { id: 'clothes_13', label: 'Tenue 13' },
      { id: 'clothes_14', label: 'Tenue 14' },
      { id: 'clothes_15', label: 'Tenue 15' },
      { id: 'clothes_16', label: 'Tenue 16' },
      { id: 'clothes_17', label: 'Tenue 17' },
      { id: 'clothes_18', label: 'Tenue 18' },
      { id: 'clothes_19', label: 'Tenue 19' },
      { id: 'clothes_20', label: 'Tenue 20' },
    ],
  },
  {
    key: 'earrings',
    title: "Boucles d'oreilles",
    icon: '💎',
    options: [
      { id: null,          label: 'Aucunes'   },
      { id: 'earrings_01', label: 'Dorées'    },
      { id: 'earrings_02', label: 'Argentées' },
      { id: 'earrings_03', label: 'Perles'    },
    ],
  },
  {
    key: 'accessory',
    title: 'Accessoires',
    icon: '🎩',
    options: [
      { id: null,         label: 'Aucun'         },
      { id: 'glasses_01', label: 'Lunettes'       },
      { id: 'glasses_02', label: 'Soleil'         },
      { id: 'hat_01',     label: 'Chapeau'        },
      { id: 'crown_01',   label: 'Couronne'       },
    ],
  },
];

// ─── Écran ────────────────────────────────────────────────────────────────────

export function AvatarEditorScreen() {
  const { currentUser, avatarPngConfig, updateAvatarPngConfig } = useStore();

  // Initialisation depuis le store (config sauvegardée ou DEFAULT_AVATAR)
  const [config, setConfig] = useState<AvatarConfig>(() => avatarPngConfig);
  const [bio, setBio]       = useState('');
  const [saved, setSaved]   = useState(false);

  const handleSelect = useCallback((layer: AvatarLayerKey, id: string | null) => {
    setConfig(prev => ({ ...prev, [layer]: id }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    updateAvatarPngConfig(config);
    // TODO: persister bio → store / API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [config, updateAvatarPngConfig]);

  const displayName = currentUser?.name ?? 'Mon avatar';

  return (
    <SafeAreaView style={styles.safe}>

      {/* ══ Header ═══════════════════════════════════════════════════════════ */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerSide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Mon profil</Text>
          <Text style={styles.headerSub}>Personnalisation</Text>
        </View>

        <TouchableOpacity
          onPress={handleSave}
          style={styles.headerSide}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={[styles.saveLabel, saved && styles.saveLabelDone]}>
            {saved ? 'Sauvé ✓' : 'Sauver'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* ══ Corps ════════════════════════════════════════════════════════════ */}
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          style={styles.flex}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

          {/* ── Polaroid ──────────────────────────────────────────────────── */}
          <View style={styles.previewSection}>
            <View style={styles.polaroid}>
              {/* Zone image : fond papier, avatar centré */}
              <View style={styles.polaroidFrame}>
                <Avatar size={190} {...config} />
              </View>

              {/* Légende dans le style polaroid */}
              <View style={styles.polaroidCaption}>
                <Text style={styles.polaroidName}>{displayName}</Text>
              </View>
            </View>
          </View>

          {/* ── Personnalisation ──────────────────────────────────────────── */}
          <SectionDivider label="Personnalisation" />

          {CATEGORIES.map(cat => (
            <AvatarSelectorRow
              key={cat.key}
              title={cat.title}
              icon={cat.icon}
              layer={cat.key}
              options={cat.options}
              selectedId={config[cat.key] as string | null | undefined}
              onSelect={(id) => handleSelect(cat.key, id)}
            />
          ))}

          {/* ── Journal intime ────────────────────────────────────────────── */}
          <SectionDivider label="Journal intime" />

          <View style={styles.bioSection}>
            <TextInput
              style={styles.bioInput}
              multiline
              value={bio}
              onChangeText={setBio}
              placeholder="Écris quelque chose sur toi…"
              placeholderTextColor={journal.textSecondary}
              maxLength={300}
              textAlignVertical="top"
              scrollEnabled={false}
            />
            <Text style={styles.bioCounter}>{bio.length} / 300</Text>
          </View>

          {/* Espace bas (tab bar + keyboard) */}
          <View style={{ height: 72 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── SectionDivider ───────────────────────────────────────────────────────────

function SectionDivider({ label }: { label: string }) {
  return (
    <View style={styles.divider}>
      <View style={styles.dividerLine} />
      <Text style={styles.dividerLabel}>{label}</Text>
      <View style={styles.dividerLine} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({

  safe: {
    flex: 1,
    backgroundColor: journal.bgMain,
  },
  flex: { flex: 1 },

  // ── Header ─────────────────────────────────────────────────────────────────

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: journal.borderSoft,
    backgroundColor: journal.bgMain,
  },
  headerSide: {
    minWidth: 64,
  },
  headerCenter: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.bold as '700',
    color: journal.textMain,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: theme.fontSize.xs,
    color: journal.accentSecondary,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  backArrow: {
    fontSize: 22,
    color: journal.textMain,
    lineHeight: 26,
  },
  saveLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as '600',
    color: journal.accentPrimary,
    textAlign: 'right',
  },
  saveLabelDone: {
    color: theme.colors.success,
  },

  // ── Polaroid ───────────────────────────────────────────────────────────────

  previewSection: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 28,
  },
  polaroid: {
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
    paddingTop: 14,
    paddingHorizontal: 14,
    paddingBottom: 18,
    alignItems: 'center',
    // Ombre douce style photo imprimée
    shadowColor: '#6B4F35',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  polaroidFrame: {
    width: 218,
    height: 218,
    backgroundColor: journal.bgSoft,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  polaroidCaption: {
    alignItems: 'center',
    paddingTop: 14,
    gap: 3,
  },
  polaroidName: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as '600',
    color: journal.textMain,
    letterSpacing: 0.6,
    fontStyle: 'italic',
  },
  // ── Divider ────────────────────────────────────────────────────────────────

  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: journal.accentSecondary,
    opacity: 0.5,
  },
  dividerLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as '600',
    color: journal.accentSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Bio ────────────────────────────────────────────────────────────────────

  bioSection: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  bioInput: {
    backgroundColor: journal.bgCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: journal.borderSoft,
    borderLeftWidth: 3,
    borderLeftColor: journal.accentSecondary,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    minHeight: 130,
    fontSize: theme.fontSize.md,
    color: journal.textMain,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bioCounter: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: journal.textSecondary,
    letterSpacing: 0.3,
  },
});
