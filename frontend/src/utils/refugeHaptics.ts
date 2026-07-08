import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const isNative = Platform.OS !== 'web';

function safely(fn: () => Promise<void>): void {
  if (!isNative) return;
  fn().catch(() => {
    // Silencieux : l'appareil peut ne pas supporter les haptics
  });
}

/** Tap léger : navigation, changement de sélection (carrousel, dots, options). */
export function triggerRefugeSelection(): void {
  safely(() => Haptics.selectionAsync());
}

/** Impact léger : confirmation d'un choix (CTA secondaire). */
export function triggerRefugeLight(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}

/** Impact moyen : engagement final (adoption confirmée). */
export function triggerRefugeCommit(): void {
  safely(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium));
}
