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
 *   - Connecter au store : implémenter handleSave (commentaire TODO)
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
import { AvatarConfig, DEFAULT_AVATAR } from '../avatar/png/defaults';
import { AvatarSelectorRow } from '../avatar/png/editor/AvatarSelectorRow';
import type {
  AvatarLayerKey,
  AvatarOption,
} from '../avatar/png/editor/AvatarOptionItem';
import { theme } from '../styles/theme';
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
      { id: 'hair_01',  label: 'Courts'   },
      { id: 'hair_02',  label: 'Mi-longs' },
      { id: 'hair_03',  label: 'Longs'    },
      { id: 'hair_04',  label: 'Bouclés'  },
      { id: 'hair_05',  label: 'Chignon'  },
      { id: 'hair_06',  label: 'Tressés'  },
    ],
  },
  {
    key: 'nose',
    title: 'Nez',
    icon: '👃',
    options: [
      { id: 'nose_01', label: 'Délicat'   },
      { id: 'nose_02', label: 'Droit'     },
      { id: 'nose_03', label: 'Retroussé' },
      { id: 'nose_04', label: 'Épaté'     },
    ],
  },
  {
    key: 'mouth',
    title: 'Bouche',
    icon: '💋',
    options: [
      { id: 'mouth_01', label: 'Sourire'      },
      { id: 'mouth_02', label: 'Neutre'       },
      { id: 'mouth_03', label: 'Malicieux'    },
      { id: 'mouth_04', label: 'Doux'         },
    ],
  },
  {
    key: 'pilosite',
    title: 'Pilosité',
    icon: '🧔',
    options: [
      { id: null,          label: 'Aucune'       },
      { id: 'beard_01',    label: 'Barbe courte' },
      { id: 'beard_02',    label: 'Barbe longue' },
      { id: 'mustache_01', label: 'Moustache'    },
    ],
  },
  {
    key: 'clothes',
    title: 'Vêtements',
    icon: '👕',
    options: [
      { id: null,         label: 'Basique'    },
      { id: 'clothes_01', label: 'Casual'     },
      { id: 'clothes_02', label: 'Élégant'    },
      { id: 'clothes_03', label: 'Sport'      },
      { id: 'clothes_04', label: 'Romantique' },
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
  const { currentUser } = useStore();

  // Config avatar locale — à connecter au store/API lors de la sauvegarde
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);
  const [bio, setBio]       = useState<string>((currentUser as any)?.bio ?? '');
  const [saved, setSaved]   = useState(false);

  const handleSelect = useCallback((layer: AvatarLayerKey, id: string | null) => {
    setConfig(prev => ({ ...prev, [layer]: id }));
    setSaved(false);
  }, []);

  const handleSave = useCallback(() => {
    // TODO: persister config + bio → store.updateAvatarConfig(config) / API
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [config, bio]);

  const displayName = currentUser?.name ?? 'Mon avatar';
  const displayCity = (currentUser as any)?.city as string | undefined;

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
                {displayCity ? (
                  <Text style={styles.polaroidCity}>📍 {displayCity}</Text>
                ) : null}
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
              placeholderTextColor={theme.journal.textSecondary}
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
    backgroundColor: theme.journal.bgMain,
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
    borderBottomColor: theme.journal.borderSoft,
    backgroundColor: theme.journal.bgMain,
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
    color: theme.journal.textMain,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: theme.fontSize.xs,
    color: theme.journal.accentSecondary,
    letterSpacing: 0.8,
    marginTop: 1,
  },
  backArrow: {
    fontSize: 22,
    color: theme.journal.textMain,
    lineHeight: 26,
  },
  saveLabel: {
    fontSize: theme.fontSize.sm,
    fontWeight: theme.fontWeight.semibold as '600',
    color: theme.journal.accentPrimary,
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
    backgroundColor: theme.journal.bgSoft,
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
    color: theme.journal.textMain,
    letterSpacing: 0.6,
    fontStyle: 'italic',
  },
  polaroidCity: {
    fontSize: theme.fontSize.sm,
    color: theme.journal.textSecondary,
    letterSpacing: 0.3,
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
    backgroundColor: theme.journal.accentSecondary,
    opacity: 0.5,
  },
  dividerLabel: {
    fontSize: theme.fontSize.xs,
    fontWeight: theme.fontWeight.semibold as '600',
    color: theme.journal.accentSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // ── Bio ────────────────────────────────────────────────────────────────────

  bioSection: {
    marginHorizontal: 20,
    marginBottom: 8,
  },
  bioInput: {
    backgroundColor: theme.journal.bgCard,
    borderRadius: theme.borderRadius.md,
    borderWidth: 1,
    borderColor: theme.journal.borderSoft,
    borderLeftWidth: 3,
    borderLeftColor: theme.journal.accentSecondary,
    paddingTop: 14,
    paddingBottom: 14,
    paddingHorizontal: 16,
    minHeight: 130,
    fontSize: theme.fontSize.md,
    color: theme.journal.textMain,
    lineHeight: 24,
    fontStyle: 'italic',
  },
  bioCounter: {
    textAlign: 'right',
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: theme.journal.textSecondary,
    letterSpacing: 0.3,
  },
});
