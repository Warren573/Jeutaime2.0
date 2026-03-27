import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  BACKGROUNDS,
  CONFIGURABLE_SCREENS,
  DEFAULT_BG,
  type Background,
} from '../data/backgrounds';

export default function BackgroundPickerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenBackgrounds, setScreenBackground } = useStore();
  const [openScreenId, setOpenScreenId] = useState<string | null>(null);

  const getBg = (screenId: string): Background => {
    const color = screenBackgrounds[screenId] ?? DEFAULT_BG;
    return BACKGROUNDS.find((b) => b.color === color) ?? BACKGROUNDS[0];
  };

  const toggle = (id: string) =>
    setOpenScreenId((prev) => (prev === id ? null : id));

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>🎨 Arrière-plans</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.hint}>
          Choisissez un fond différent pour chaque écran de l'application.
        </Text>

        {CONFIGURABLE_SCREENS.map((screen) => {
          const current = getBg(screen.id);
          const isOpen = openScreenId === screen.id;

          return (
            <View key={screen.id} style={styles.screenRow}>
              {/* Tap row */}
              <TouchableOpacity
                style={styles.screenHeader}
                onPress={() => toggle(screen.id)}
                activeOpacity={0.75}
              >
                <View style={styles.screenLeft}>
                  <Text style={styles.screenIcon}>{screen.icon}</Text>
                  <View>
                    <Text style={styles.screenName}>{screen.name}</Text>
                    <Text style={styles.screenCurrent}>{current.name}</Text>
                  </View>
                </View>
                <View style={styles.screenRight}>
                  {/* Current color swatch */}
                  <View
                    style={[
                      styles.swatch,
                      { backgroundColor: current.color, borderColor: current.dark ? '#555' : '#DDD' },
                    ]}
                  />
                  <Text style={styles.chevron}>{isOpen ? '▲' : '▼'}</Text>
                </View>
              </TouchableOpacity>

              {/* Palette (expanded) */}
              {isOpen && (
                <View style={styles.palette}>
                  {/* Light section */}
                  <Text style={styles.paletteSection}>Clairs</Text>
                  <View style={styles.paletteRow}>
                    {BACKGROUNDS.filter((b) => !b.dark).map((bg) => {
                      const selected = (screenBackgrounds[screen.id] ?? DEFAULT_BG) === bg.color;
                      return (
                        <TouchableOpacity
                          key={bg.id}
                          style={styles.swatchWrap}
                          onPress={() => setScreenBackground(screen.id, bg.color)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.swatchLg,
                              { backgroundColor: bg.preview },
                              selected && styles.swatchSelected,
                            ]}
                          >
                            {selected && <Text style={styles.checkmark}>✓</Text>}
                          </View>
                          <Text style={styles.swatchName} numberOfLines={1}>
                            {bg.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Dark section */}
                  <Text style={[styles.paletteSection, { marginTop: 12 }]}>Sombres</Text>
                  <View style={styles.paletteRow}>
                    {BACKGROUNDS.filter((b) => b.dark).map((bg) => {
                      const selected = (screenBackgrounds[screen.id] ?? DEFAULT_BG) === bg.color;
                      return (
                        <TouchableOpacity
                          key={bg.id}
                          style={styles.swatchWrap}
                          onPress={() => setScreenBackground(screen.id, bg.color)}
                          activeOpacity={0.8}
                        >
                          <View
                            style={[
                              styles.swatchLg,
                              { backgroundColor: bg.preview },
                              selected && styles.swatchSelected,
                            ]}
                          >
                            {selected && <Text style={[styles.checkmark, { color: '#FFF' }]}>✓</Text>}
                          </View>
                          <Text style={styles.swatchName} numberOfLines={1}>
                            {bg.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Reset button */}
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => setScreenBackground(screen.id, DEFAULT_BG)}
                  >
                    <Text style={styles.resetText}>↺ Réinitialiser</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}

        {/* Reset all */}
        <TouchableOpacity
          style={styles.resetAllBtn}
          onPress={() => {
            CONFIGURABLE_SCREENS.forEach((s) =>
              setScreenBackground(s.id, DEFAULT_BG)
            );
          }}
        >
          <Text style={styles.resetAllText}>↺ Tout réinitialiser</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#FFF8E7' },

  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EDE0C8',
    backgroundColor: '#FFF8E7',
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3E5C8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backArrow: { fontSize: 18, color: '#3A2818', fontWeight: '600' },
  topBarTitle: { fontSize: 16, fontWeight: '700', color: '#3A2818' },

  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 10 },

  hint: {
    fontSize: 13,
    color: '#8B6F47',
    lineHeight: 19,
    marginBottom: 4,
  },

  // Screen row
  screenRow: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  screenHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  screenLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  screenIcon: { fontSize: 24 },
  screenName: { fontSize: 15, fontWeight: '600', color: '#3A2818' },
  screenCurrent: { fontSize: 12, color: '#8B6F47', marginTop: 1 },
  screenRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  chevron: { fontSize: 11, color: '#8B6F47' },

  // Palette
  palette: {
    borderTopWidth: 1,
    borderTopColor: '#F0E8D8',
    padding: 14,
    backgroundColor: '#FAFAF8',
  },
  paletteSection: {
    fontSize: 10,
    fontWeight: '700',
    color: '#B8A082',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  paletteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  swatchWrap: { alignItems: 'center', width: 56 },
  swatchLg: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchSelected: {
    borderColor: '#E91E63',
    shadowColor: '#E91E63',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 4,
  },
  checkmark: { fontSize: 18, fontWeight: '700', color: '#E91E63' },
  swatchName: { fontSize: 9, color: '#8B6F47', marginTop: 4, textAlign: 'center' },

  // Reset
  resetBtn: {
    marginTop: 14,
    alignSelf: 'flex-end',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
    backgroundColor: '#F3E5C8',
  },
  resetText: { fontSize: 12, color: '#8B6F47', fontWeight: '600' },

  // Reset all
  resetAllBtn: {
    marginTop: 8,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EDE0C8',
  },
  resetAllText: { fontSize: 13, color: '#8B6F47', fontWeight: '600' },
});
