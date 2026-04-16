/**
 * JeuTaime — Système d'accès aux features
 *
 * Quatre patterns disponibles selon le contexte :
 *
 * ① useFeature(key)
 *    Hook — état d'une feature. Pour les screens avec guards manuels complexes.
 *    const state = useFeature('profiles');
 *    if (state === 'hidden') return <MonFallback />;
 *
 * ② <FeatureGate feature="key">
 *    Composant — gate tout-ou-rien. Fallbacks génériques par défaut.
 *    <FeatureGate feature="premium"><PremiumContent /></FeatureGate>
 *
 * ③ isVisible() / isUnlocked() depuis features.ts
 *    Helpers inline — filtrage d'éléments (listes, onglets).
 *    Utilisé dans SocialScreen, LettersScreen, CustomTabBar.
 *
 * ④ useRouteGuard(key, redirectTo?)
 *    Hook — protection au niveau route / navigation.
 *    Si hidden → router.replace(redirectTo) immédiatement.
 *    Si locked/teased → retourne l'état, le composant décide.
 *    Placé dans les fichiers app/*.tsx (thin wrappers Expo Router).
 */

import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { FEATURES, FeatureState } from '../config/features';

// ─── ① useFeature ─────────────────────────────────────────────────────────────

/**
 * Retourne l'état courant d'une feature.
 * Retourne "unlocked" si la clé est inconnue (fail-open par défaut).
 */
export function useFeature(key: string): FeatureState {
  return (FEATURES[key] as FeatureState) ?? 'unlocked';
}

// ─── ④ useRouteGuard ──────────────────────────────────────────────────────────

/**
 * Protège une route selon l'état de sa feature.
 *
 * - hidden   → redirige vers `redirectTo` (défaut : '/(tabs)')
 * - locked / teased → retourne l'état sans rediriger (l'UI gère)
 * - unlocked → no-op, retourne 'unlocked'
 *
 * Usage dans un fichier app/*.tsx :
 *
 *   export default function PetPage() {
 *     const state = useRouteGuard('refuge');
 *     if (state === 'hidden') return null;   // redirect en cours
 *     return <PetScreen />;
 *   }
 */
export function useRouteGuard(
  featureKey: string,
  redirectTo: string = '/(tabs)',
): FeatureState {
  const router = useRouter();
  const state = useFeature(featureKey);

  useEffect(() => {
    if (state === 'hidden') {
      router.replace(redirectTo as never);
    }
  }, [state]);

  return state;
}

// ─── Fallbacks par défaut ─────────────────────────────────────────────────────

function DefaultLockedFallback() {
  return (
    <View style={s.center}>
      <Text style={s.emoji}>🔒</Text>
      <Text style={s.title}>Bientôt disponible</Text>
      <Text style={s.sub}>Cette section sera accessible prochainement.</Text>
    </View>
  );
}

function DefaultTeasedFallback() {
  return (
    <View style={s.center}>
      <Text style={s.emoji}>✨</Text>
      <Text style={s.title}>À venir</Text>
      <Text style={s.sub}>Quelque chose de nouveau se prépare ici.</Text>
    </View>
  );
}

// ─── ② FeatureGate ────────────────────────────────────────────────────────────

interface FeatureGateProps {
  /** Clé de la feature dans FEATURES */
  feature: string;
  /** Contenu rendu si unlocked */
  children: React.ReactNode;
  /** Rendu si hidden — null par défaut */
  hiddenFallback?: React.ReactNode;
  /** Rendu si locked — DefaultLockedFallback si omis */
  lockedFallback?: React.ReactNode;
  /** Rendu si teased — DefaultTeasedFallback si omis */
  teasedFallback?: React.ReactNode;
}

export function FeatureGate({
  feature,
  children,
  hiddenFallback = null,
  lockedFallback,
  teasedFallback,
}: FeatureGateProps) {
  const state = useFeature(feature);

  if (state === 'hidden') return <>{hiddenFallback}</>;
  if (state === 'locked') return <>{lockedFallback ?? <DefaultLockedFallback />}</>;
  if (state === 'teased') return <>{teasedFallback ?? <DefaultTeasedFallback />}</>;
  return <>{children}</>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 12,
    backgroundColor: '#FFF8E7',
  },
  emoji: {
    fontSize: 52,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A2818',
    textAlign: 'center',
  },
  sub: {
    fontSize: 14,
    color: '#8B6F47',
    textAlign: 'center',
    lineHeight: 20,
  },
});
