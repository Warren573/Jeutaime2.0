/**
 * AvatarSelectorRow — section horizontale scrollable d'options avatar.
 *
 * Affiche un titre de catégorie + un carrousel horizontal d'AvatarOptionItem.
 * S'intègre dans un ScrollView vertical parent (AvatarEditorScreen).
 */

import React, { memo, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import { theme } from '../../../styles/theme';
import {
  AvatarLayerKey,
  AvatarOption,
  AvatarOptionItem,
} from './AvatarOptionItem';

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  title: string;
  icon: string;
  layer: AvatarLayerKey;
  options: AvatarOption[];
  selectedId: string | null | undefined;
  onSelect: (id: string | null) => void;
}

// ─── Composant ────────────────────────────────────────────────────────────────

export const AvatarSelectorRow = memo(function AvatarSelectorRow({
  title,
  icon,
  layer,
  options,
  selectedId,
  onSelect,
}: Props) {
  return (
    <View style={styles.section}>
      {/* Titre de la catégorie */}
      <View style={styles.titleRow}>
        <Text style={styles.icon}>{icon}</Text>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.titleUnderline} />
      </View>

      {/* Carrousel horizontal */}
      <FlatList
        horizontal
        data={options}
        keyExtractor={(item) => item.id ?? '__none__'}
        renderItem={({ item }) => (
          <AvatarOptionItem
            option={item}
            layer={layer}
            isSelected={selectedId === item.id}
            onPress={() => onSelect(item.id)}
          />
        )}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        // Évite le scroll vertical parasite dans le ScrollView parent
        nestedScrollEnabled
      />
    </View>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  icon: {
    fontSize: 15,
  },
  title: {
    fontSize: theme.fontSize.md,
    fontWeight: theme.fontWeight.semibold as '600',
    color: theme.journal.textMain,
    letterSpacing: 0.4,
  },
  titleUnderline: {
    flex: 1,
    height: 1,
    backgroundColor: theme.journal.borderSoft,
    marginLeft: 4,
  },

  list: {
    paddingHorizontal: 20,
    paddingBottom: 2,
  },
});
