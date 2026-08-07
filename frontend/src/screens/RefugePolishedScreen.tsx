import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RefugeIllustratedScreen } from './RefugeIllustratedScreen';

/**
 * Fine visual pass around the illustrated Refuge.
 * The cabin artwork still contains legacy printed header labels, so this
 * wrapper masks only that small header zone and renders one real interactive
 * header above it. The Refuge mechanics remain entirely in
 * RefugeIllustratedScreen.
 */
export function RefugePolishedScreen({ sessionIdProp }: { sessionIdProp: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      <RefugeIllustratedScreen sessionIdProp={sessionIdProp} />

      <View
        pointerEvents="box-none"
        style={[styles.headerLayer, { top: insets.top }]}
      >
        <View pointerEvents="none" style={styles.headerMask} />

        <TouchableOpacity
          accessibilityRole="button"
          accessibilityLabel="Retour"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Retour</Text>
        </TouchableOpacity>

        <View pointerEvents="none" style={styles.titleBlock}>
          <Text style={styles.title}>Mon refuge</Text>
          <View style={styles.ornamentRow}>
            <View style={styles.ornamentLine} />
            <Text style={styles.heart}>♥</Text>
            <View style={styles.ornamentLine} />
          </View>
          <Text style={styles.subtitle}>Prenez soin l’un de l’autre pendant 7 jours</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#28170E',
  },
  headerLayer: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 106,
    zIndex: 100,
  },
  headerMask: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(218, 185, 139, 0.94)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(105, 67, 39, 0.42)',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top: 22,
    paddingHorizontal: 6,
    paddingVertical: 8,
    zIndex: 2,
  },
  backText: {
    color: '#8A2F3C',
    fontFamily: 'Georgia',
    fontSize: 18,
    fontWeight: '700',
  },
  titleBlock: {
    position: 'absolute',
    left: '28%',
    right: '8%',
    top: 9,
    alignItems: 'center',
  },
  title: {
    color: '#8A2F3C',
    fontFamily: 'Georgia',
    fontSize: 29,
    lineHeight: 34,
  },
  ornamentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  ornamentLine: {
    width: 32,
    height: 1,
    backgroundColor: '#8A2F3C',
    opacity: 0.68,
  },
  heart: {
    color: '#8A2F3C',
    fontSize: 12,
  },
  subtitle: {
    color: '#4A2B1C',
    fontFamily: 'Georgia',
    fontSize: 10.5,
    marginTop: 2,
    textAlign: 'center',
  },
});
