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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * États UX :
 *
 *   locked  → feature existante, verrouillée (premium, niveau…)
 *             Rendu : 🔒  "ACCÈS RESTREINT"  + hint pour débloquer
 *
 *   teased  → feature annoncée, pas encore disponible
 *             Rendu : ✨  "EN PRÉPARATION"   + message d'anticipation
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

// ─── Props partagées ──────────────────────────────────────────────────────────

export interface FallbackProps {
  /** Titre principal — remplace le défaut si fourni */
  title?: string;
  /** Description — remplace le défaut si fourni */
  description?: string;
}

// ─── LockedFallback ───────────────────────────────────────────────────────────

/**
 * Fallback plein-écran pour une feature **locked**.
 *
 * Cas d'usage : la feature existe mais l'utilisateur n'y a pas accès
 * (abonnement Premium requis, niveau insuffisant, etc.).
 *
 * Usage direct :
 *   if (state === 'locked') return <LockedFallback />;
 *   if (state === 'locked') return <LockedFallback title="Profils Premium" description="..." />;
 */
export function LockedFallback({ title, description }: FallbackProps = {}) {
  return (
    <View style={s.center}>
      <Text style={s.icon}>🔒</Text>
      <View style={s.rule} />
      <Text style={s.kicker}>ACCÈS RESTREINT</Text>
      <Text style={s.heading}>{title ?? 'Fonctionnalité verrouillée'}</Text>
      <Text style={s.body}>
        {description ?? 'Passe à Premium pour débloquer cette section.'}
      </Text>
    </View>
  );
}

// ─── TeasedFallback ───────────────────────────────────────────────────────────

/**
 * Fallback plein-écran pour une feature **teased**.
 *
 * Cas d'usage : la feature n'existe pas encore — elle est annoncée
 * pour une prochaine mise à jour.
 *
 * Usage direct :
 *   if (state === 'teased') return <TeasedFallback />;
 *   if (state === 'teased') return <TeasedFallback title="Journal intime" description="..." />;
 */
export function TeasedFallback({ title, description }: FallbackProps = {}) {
  return (
    <View style={s.center}>
      <Text style={s.icon}>✨</Text>
      <View style={s.rule} />
      <Text style={s.kicker}>EN PRÉPARATION</Text>
      <Text style={s.heading}>{title ?? 'Bientôt disponible'}</Text>
      <Text style={s.body}>
        {description ?? 'Cette section arrive dans une prochaine mise à jour.'}
      </Text>
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
  /** Rendu si locked — LockedFallback si omis */
  lockedFallback?: React.ReactNode;
  /** Rendu si teased — TeasedFallback si omis */
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
  if (state === 'locked') return <>{lockedFallback ?? <LockedFallback />}</>;
  if (state === 'teased') return <>{teasedFallback ?? <TeasedFallback />}</>;
  return <>{children}</>;
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    gap: 10,
    backgroundColor: '#FFF8E7',
  },
  icon: {
    fontSize: 52,
    marginBottom: 4,
  },
  rule: {
    width: 48,
    height: 1,
    backgroundColor: '#C4A882',
    marginVertical: 6,
  },
  kicker: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    color: '#B8956A',
  },
  heading: {
    fontSize: 20,
    fontWeight: '800',
    color: '#2C1A0E',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  body: {
    fontSize: 14,
    color: '#8B6F47',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 2,
  },
});
