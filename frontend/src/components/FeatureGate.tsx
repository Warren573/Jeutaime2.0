/**
 * JeuTaime — Système d'accès aux features
 *
 * Trois patterns disponibles selon le contexte :
 *
 * ① useFeature(key)
 *    Hook — pour les écrans complexes avec plusieurs états conditionnels.
 *    Exemple : ProfilesScreen (guard manuel + fallback custom dans le style de l'écran)
 *
 *    const featureState = useFeature('profiles');
 *    if (featureState === 'hidden')  return <MesStyles />;
 *    if (featureState === 'locked')  return <MesStyles />;
 *    // ... contenu normal
 *
 * ② <FeatureGate feature="key">
 *    Composant — pour les écrans/blocs simples, tout-ou-rien.
 *    Fallbacks génériques par défaut, surchargeables par props.
 *
 *    <FeatureGate feature="premium">
 *      <PremiumContent />
 *    </FeatureGate>
 *
 * ③ isVisible() / isUnlocked() depuis features.ts
 *    Helpers inline — pour filtrer des éléments dans une liste ou des onglets.
 *    Exemple : SocialScreen (cards), LettersScreen (tabs), CustomTabBar
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FEATURES, FeatureState } from '../config/features';

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Retourne l'état courant d'une feature.
 * Retourne "unlocked" si la clé est inconnue (fail-open par défaut).
 */
export function useFeature(key: string): FeatureState {
  return (FEATURES[key] as FeatureState) ?? 'unlocked';
}

// ─── Fallbacks par défaut ─────────────────────────────────────────────────────
// Design neutre compatible avec toute l'app.
// Les écrans avec un style spécifique (ex: journal papier) passent leur propre fallback.

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

// ─── FeatureGate ──────────────────────────────────────────────────────────────

interface FeatureGateProps {
  /** Clé de la feature dans FEATURES */
  feature: string;
  /** Contenu rendu si unlocked */
  children: React.ReactNode;
  /** Rendu si hidden — null par défaut (rien n'apparaît) */
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
