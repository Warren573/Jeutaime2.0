/**
 * AvatarOptionItem — carte d'option individuelle dans un carrousel de personnalisation.
 *
 * Affiche un mini-aperçu de l'avatar avec uniquement la couche concernée appliquée
 * sur le corps/tête de base. Quand les PNG sont enregistrés dans registry.ts,
 * l'aperçu s'affiche automatiquement.
 */

import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import type { AvatarProps } from '../Avatar';
import { Avatar } from '../Avatar';
import { theme, journal } from '../../../styles/theme';

// ─── Types exportés ───────────────────────────────────────────────────────────

export type AvatarLayerKey =
  | 'hair'
  | 'nose'
  | 'mouth'
  | 'pilosite'
  | 'clothes'
  | 'earrings'
  | 'accessory';

export type AvatarOption = {
  /** ID de l'asset (registry.ts). null = "Aucun". */
  id: string | null;
  /** Label affiché sous l'aperçu. */
  label: string;
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  option: AvatarOption;
  /** Couche Avatar que cet item contrôle. */
  layer: AvatarLayerKey;
  isSelected: boolean;
  onPress: () => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const AvatarOptionItem = memo(function AvatarOptionItem({
  option,
  layer,
  isSelected,
  onPress,
}: Props) {
  // Mini aperçu : corps + tête de base + uniquement cette couche
  const layerProp = { [layer]: option.id } as Partial<AvatarProps>;

  return (
    <TouchableOpacity
      style={[styles.item, isSelected && styles.itemSelected]}
      onPress={onPress}
      activeOpacity={0.72}
    >
      <View style={[styles.preview, isSelected && styles.previewSelected]}>
        <Avatar
          size={56}
          body="body_default"
          head="head_default"
          {...layerProp}
        />
      </View>

      <Text
        style={[styles.label, isSelected && styles.labelSelected]}
        numberOfLines={1}
      >
        {option.label}
      </Text>
    </TouchableOpacity>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const ITEM_WIDTH = 82;

const styles = StyleSheet.create({
  item: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    marginRight: 10,
    borderRadius: theme.borderRadius.md,
    borderWidth: 2,
    borderColor: 'transparent',
    paddingVertical: 8,
    paddingHorizontal: 4,
    backgroundColor: journal.bgCard,
  },
  itemSelected: {
    borderColor: journal.accentPrimary,
    backgroundColor: '#FDF5F5',
  },

  preview: {
    width: 62,
    height: 62,
    backgroundColor: journal.bgSoft,
    borderRadius: theme.borderRadius.sm,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  previewSelected: {
    backgroundColor: '#F5E8E8',
  },

  label: {
    marginTop: 6,
    fontSize: theme.fontSize.xs,
    color: journal.textSecondary,
    textAlign: 'center',
    fontWeight: theme.fontWeight.medium as '500',
  },
  labelSelected: {
    color: journal.accentPrimary,
    fontWeight: theme.fontWeight.bold as '700',
  },
});
