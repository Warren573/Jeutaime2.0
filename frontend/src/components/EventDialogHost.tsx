import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { NotificationIcon } from './NotificationIcon';
import { eventQueue } from '../hooks/useAppEvents';
import type { EventDialogModel } from '../data/appEvents';
import { APP_COLORS, APP_RADIUS } from '../theme/appTheme';

const SERIF = Platform.select({ ios: 'Georgia', default: 'serif' });
const ENTER_MS = 240;
const EXIT_MS = 180;

/**
 * Fenêtre événementielle : carte au centre de l'écran, comme l'annonce « C'est un match ! », mais aux couleurs de JeuTaime,
 * avec l'illustration de la fonctionnalité. Une seule à la fois ; les suivantes attendent (file d'attente). Fermable
 * (croix, « Plus tard », toucher à côté). Posée en surcouche du layout racine (pas de Modal natif : aucun conflit avec
 * l'alerte de match ni avec les écrans en paysage).
 */
export function EventDialogHost() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [model, setModel] = useState<EventDialogModel | null>(() => eventQueue.current());
  const progress = useRef(new Animated.Value(0)).current;
  const closing = useRef(false);

  useEffect(() => {
    const sync = () => setModel(eventQueue.current());
    sync();
    return eventQueue.subscribe(sync);
  }, []);

  // Apparition à chaque nouvel événement.
  const key = model?.key ?? null;
  useEffect(() => {
    if (!key) return;
    closing.current = false;
    progress.setValue(0);
    void Haptics.selectionAsync().catch(() => {});
    Animated.timing(progress, { toValue: 1, duration: ENTER_MS, easing: Easing.out(Easing.back(1.2)), useNativeDriver: true }).start();
  }, [key, progress]);

  const close = useCallback((after?: () => void) => {
    if (closing.current) return;
    closing.current = true;
    Animated.timing(progress, { toValue: 0, duration: EXIT_MS, easing: Easing.in(Easing.quad), useNativeDriver: true }).start(() => {
      eventQueue.dismiss(); // marque l'événement comme vu : il ne reviendra jamais ; la suivante apparaît ensuite
      after?.();
    });
  }, [progress]);

  if (!model) return null;
  const cardWidth = Math.min(340, Math.max(260, width - 56));
  const scale = progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View style={styles.overlay} pointerEvents="box-none" accessibilityViewIsModal>
      <Animated.View style={[styles.backdrop, { opacity: progress }]}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => close()} accessibilityLabel="Fermer" />
      </Animated.View>
      <Animated.View style={[styles.card, { width: cardWidth, opacity: progress, transform: [{ scale }] }]} accessibilityRole="alert">
        <TouchableOpacity style={styles.closeButton} onPress={() => close()} accessibilityLabel="Fermer la fenêtre" hitSlop={12}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.illustration}>
          <NotificationIcon name={model.icon} size={44} color={APP_COLORS.burgundy} />
        </View>
        <Text style={styles.label}>{model.label.toUpperCase()}</Text>
        <Text style={styles.title}>{model.title}</Text>
        {model.pseudo ? <Text style={styles.pseudo}>avec {model.pseudo}</Text> : null}
        <Text style={styles.message}>{model.message}</Text>
        {model.cta ? (
          <TouchableOpacity style={styles.primary} onPress={() => { const route = model.cta!.route; close(() => router.push(route as never)); }} accessibilityRole="button">
            <Text style={styles.primaryText}>{model.cta.label}</Text>
          </TouchableOpacity>
        ) : null}
        <TouchableOpacity style={styles.secondary} onPress={() => close()} accessibilityRole="button">
          <Text style={styles.secondaryText}>{model.cta ? 'Plus tard' : 'Fermer'}</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', zIndex: 9999, elevation: 9999 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(44,26,14,0.58)' },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderStrong,
    paddingHorizontal: 22,
    paddingTop: 26,
    paddingBottom: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  closeButton: { position: 'absolute', top: 10, right: 12, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 16, color: APP_COLORS.muted, fontWeight: '700' },
  illustration: { width: 92, height: 92, borderRadius: 46, backgroundColor: APP_COLORS.backgroundWarm, borderWidth: 1.5, borderColor: APP_COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  label: { fontFamily: SERIF, fontSize: 10, letterSpacing: 2.4, color: APP_COLORS.muted },
  title: { fontFamily: SERIF, fontSize: 22, fontWeight: '700', color: APP_COLORS.burgundy, textAlign: 'center', marginTop: 6 },
  pseudo: { fontFamily: SERIF, fontSize: 14, fontStyle: 'italic', color: APP_COLORS.text, marginTop: 4 },
  message: { fontFamily: SERIF, fontSize: 15, lineHeight: 21, color: APP_COLORS.ink, textAlign: 'center', marginTop: 10 },
  primary: { alignSelf: 'stretch', marginTop: 18, backgroundColor: APP_COLORS.burgundy, borderRadius: APP_RADIUS.md, paddingVertical: 13, alignItems: 'center' },
  primaryText: { color: '#FFF8E7', fontSize: 15, fontWeight: '800' },
  secondary: { marginTop: 10, paddingVertical: 8, paddingHorizontal: 18 },
  secondaryText: { color: APP_COLORS.muted, fontSize: 14, fontWeight: '700' },
});
