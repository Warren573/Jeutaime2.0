/**
 * TraitPicker — sélecteur de trait générique et réutilisable
 * ─────────────────────────────────────────────────────────────────────────────
 * Props :
 *  - label    : nom de la section affichée
 *  - options  : tableau { id, label, color? }
 *  - selected : id actuellement sélectionné
 *  - onChange : callback(id)
 *  - type     : 'text' | 'color'
 *    · text  → pilules avec le label
 *    · color → cercles de couleur (pour teints/cheveux)
 */

import React from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Option {
  id:     string;
  label:  string;
  color?: string;   // si type='color', couleur à afficher dans le cercle
}

interface Props {
  label:    string;
  options:  Option[];
  selected: string;
  onChange: (id: string) => void;
  type?:    'text' | 'color';
}

// ─── Composant ────────────────────────────────────────────────────────────────

export function TraitPicker({
  label,
  options,
  selected,
  onChange,
  type = 'text',
}: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        bounces={false}
      >
        {options.map((opt) => {
          const isSelected = opt.id === selected;

          if (type === 'color') {
            return (
              <Pressable
                key={opt.id}
                onPress={() => onChange(opt.id)}
                style={[
                  styles.colorDot,
                  { backgroundColor: opt.color ?? '#888' },
                  isSelected && styles.colorDotSelected,
                ]}
              >
                {isSelected && (
                  <View style={styles.colorDotCheck} />
                )}
              </Pressable>
            );
          }

          return (
            <Pressable
              key={opt.id}
              onPress={() => onChange(opt.id)}
              style={[
                styles.pill,
                isSelected && styles.pillSelected,
              ]}
            >
              <Text
                style={[
                  styles.pillText,
                  isSelected && styles.pillTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const ACCENT = '#8B5CF6';   // violet premium

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  label: {
    fontSize:     12,
    fontWeight:   '600',
    color:        '#6B5040',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    paddingLeft:  2,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems:    'center',
    paddingRight:  12,
    gap:           6,
  },

  // ── Pilules texte ──────────────────────────────────────────────────────────
  pill: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      20,
    backgroundColor:   '#F0EDE8',
    borderWidth:       1.5,
    borderColor:       '#E0D8D0',
  },
  pillSelected: {
    backgroundColor: ACCENT,
    borderColor:     ACCENT,
  },
  pillText: {
    fontSize:   13,
    fontWeight: '500',
    color:      '#5D4037',
  },
  pillTextSelected: {
    color:      '#FFF',
    fontWeight: '700',
  },

  // ── Cercles couleur ────────────────────────────────────────────────────────
  colorDot: {
    width:        32,
    height:       32,
    borderRadius: 16,
    alignItems:   'center',
    justifyContent: 'center',
    borderWidth:  2,
    borderColor:  'transparent',
  },
  colorDotSelected: {
    borderColor:  ACCENT,
    shadowColor:  ACCENT,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 4,
    shadowOpacity: 0.5,
    elevation:    3,
  },
  colorDotCheck: {
    width:        10,
    height:       10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
});
