/**
 * AvatarBuilderScreen — éditeur d'avatar premium avec preview live
 * ─────────────────────────────────────────────────────────────────────────────
 * Interface en deux zones :
 *  - Haut   : preview de l'avatar (grand, centré, avec fond dégradé)
 *  - Bas    : panneau de configuration scrollable (groupé par catégories)
 *
 * Utilise AvatarRenderer + TraitPicker.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';

import { AvatarConfig, DEFAULT_AVATAR } from '../types/avatar';
import {
  FACE_SHAPES, SKIN_TONES, EYE_STYLES, EYE_COLORS,
  BROW_STYLES, NOSE_STYLES, MOUTH_STYLES,
  HAIR_STYLES, HAIR_COLORS, BEARD_STYLES, ACCESSORY_STYLES,
  SKIN_COLORS, HAIR_COLOR_PALETTE,
} from '../data/avatarCatalog';

import { AvatarRenderer } from '../components/avatar/AvatarRenderer';
import { TraitPicker }    from '../components/TraitPicker';

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AvatarBuilderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [config, setConfig] = useState<AvatarConfig>(DEFAULT_AVATAR);

  // Mise à jour partielle du config
  const update = useCallback(<K extends keyof AvatarConfig>(
    key: K, value: AvatarConfig[K],
  ) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleSave = () => {
    // TODO : persister dans le store utilisateur
    router.back();
  };

  // Options de couleur enrichies (avec la valeur hex pour les cercles)
  const skinColorOptions = SKIN_TONES.map(t => ({
    id:    t.id,
    label: t.label,
    color: SKIN_COLORS[t.id].base,
  }));

  const hairColorOptions = HAIR_COLORS.map(c => ({
    id:    c.id,
    label: c.label,
    color: HAIR_COLOR_PALETTE[c.id].base,
  }));

  const eyeColorOptions = EYE_COLORS.map(c => ({
    id:    c.id,
    label: c.label,
    color: {
      hazel: '#8B7040', blue: '#4A7EC0', green: '#5A8A45',
      brown: '#6B3820', dark: '#241810', gray:  '#7A8A9A',
    }[c.id],
  }));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Mon avatar</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

      {/* ── Preview avatar ────────────────────────────────────────────────────── */}
      <LinearGradient
        colors={['#EDE0F4', '#D8EEF8', '#FDF2E8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.previewZone}
      >
        <AvatarRenderer
          config={config}
          size={220}
          background={null}
        />
        {/* Nom sous l'avatar */}
        <Text style={styles.previewName}>Aperçu</Text>
      </LinearGradient>

      {/* ── Panneau de configuration ──────────────────────────────────────────── */}
      <ScrollView
        style={styles.panel}
        contentContainerStyle={[styles.panelContent, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >

        {/* Section Visage */}
        <SectionTitle label="Visage" />
        <TraitPicker
          label="Forme"
          options={FACE_SHAPES}
          selected={config.faceShape}
          onChange={v => update('faceShape', v as AvatarConfig['faceShape'])}
        />
        <TraitPicker
          label="Teint"
          options={skinColorOptions}
          selected={config.skinTone}
          onChange={v => update('skinTone', v as AvatarConfig['skinTone'])}
          type="color"
        />

        {/* Section Yeux */}
        <SectionTitle label="Yeux" />
        <TraitPicker
          label="Style"
          options={EYE_STYLES}
          selected={config.eyeStyle}
          onChange={v => update('eyeStyle', v as AvatarConfig['eyeStyle'])}
        />
        <TraitPicker
          label="Couleur"
          options={eyeColorOptions}
          selected={config.eyeColor}
          onChange={v => update('eyeColor', v as AvatarConfig['eyeColor'])}
          type="color"
        />
        <TraitPicker
          label="Sourcils"
          options={BROW_STYLES}
          selected={config.browStyle}
          onChange={v => update('browStyle', v as AvatarConfig['browStyle'])}
        />

        {/* Section Traits */}
        <SectionTitle label="Traits" />
        <TraitPicker
          label="Nez"
          options={NOSE_STYLES}
          selected={config.noseStyle}
          onChange={v => update('noseStyle', v as AvatarConfig['noseStyle'])}
        />
        <TraitPicker
          label="Bouche"
          options={MOUTH_STYLES}
          selected={config.mouthStyle}
          onChange={v => update('mouthStyle', v as AvatarConfig['mouthStyle'])}
        />

        {/* Section Cheveux */}
        <SectionTitle label="Cheveux" />
        <TraitPicker
          label="Coiffure"
          options={HAIR_STYLES}
          selected={config.hairStyle}
          onChange={v => update('hairStyle', v as AvatarConfig['hairStyle'])}
        />
        <TraitPicker
          label="Couleur"
          options={hairColorOptions}
          selected={config.hairColor}
          onChange={v => update('hairColor', v as AvatarConfig['hairColor'])}
          type="color"
        />

        {/* Section Pilosité & Accessoires */}
        <SectionTitle label="Finitions" />
        <TraitPicker
          label="Pilosité"
          options={BEARD_STYLES}
          selected={config.beardStyle}
          onChange={v => update('beardStyle', v as AvatarConfig['beardStyle'])}
        />
        <TraitPicker
          label="Accessoires"
          options={ACCESSORY_STYLES}
          selected={config.accessoryStyle}
          onChange={v => update('accessoryStyle', v as AvatarConfig['accessoryStyle'])}
        />
      </ScrollView>
    </View>
  );
}

// ─── Sous-composant : titre de section ────────────────────────────────────────

function SectionTitle({ label }: { label: string }) {
  return (
    <View style={styles.sectionTitle}>
      <View style={styles.sectionLine} />
      <Text style={styles.sectionText}>{label}</Text>
      <View style={styles.sectionLine} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#FDF8F4',
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical:   12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0D4',
    backgroundColor:   '#FFF',
  },
  backBtn: { padding: 8 },
  backText: {
    fontSize:   22,
    color:      '#5D4037',
    fontWeight: '600',
  },
  title: {
    fontSize:   17,
    fontWeight: '700',
    color:      '#3D2A1E',
  },
  saveBtn: {
    backgroundColor: '#8B5CF6',
    paddingHorizontal: 16,
    paddingVertical:    8,
    borderRadius:      20,
  },
  saveText: {
    fontSize:   14,
    fontWeight: '700',
    color:      '#FFF',
  },

  // Preview
  previewZone: {
    alignItems:     'center',
    justifyContent: 'flex-end',
    paddingBottom:  12,
    height:         260,
  },
  previewName: {
    fontSize:     13,
    fontWeight:   '600',
    color:        '#7A5A8A',
    marginTop:    4,
    letterSpacing: 0.5,
    opacity:       0.7,
  },

  // Panel
  panel: {
    flex: 1,
    backgroundColor: '#FDF8F4',
  },
  panelContent: {
    paddingHorizontal: 16,
    paddingTop:        16,
    gap:               0,
  },

  // Section title
  sectionTitle: {
    flexDirection:  'row',
    alignItems:     'center',
    marginTop:       16,
    marginBottom:    10,
    gap:             8,
  },
  sectionLine: {
    flex:            1,
    height:          1,
    backgroundColor: '#E8D5C4',
  },
  sectionText: {
    fontSize:     11,
    fontWeight:   '700',
    color:        '#A08070',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
});
