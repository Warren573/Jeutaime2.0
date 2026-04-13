// ============================================
// REVEAL ENGINE - Révélation progressive des photos
// ============================================

import { RevealState, RevealMilestone } from '../shared/types';

// ==================== CONFIGURATION ====================

// Seuils de révélation par nombre de lettres
export const REVEAL_THRESHOLDS = {
  // Pour le profil dans la liste des lettres
  letterThread: {
    hidden: 0,
    blurred: 10,
    revealed: 20,
  },
  // Pour les photos individuelles dans découverte
  photos: {
    photo1: 10,
    photo2: 20,
    photo3: 30,
  },
};

// Niveaux de flou (0 = net, 1 = flou total)
export const BLUR_LEVELS = {
  hidden: 1,      // 100% flou
  blurred: 0.5,   // 50% flou
  revealed: 0,    // Pas de flou
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Obtient l'état de révélation basé sur le nombre de lettres
 */
export function getRevealState(
  letterCount: number,
  isPremiumViewer: boolean = false
): RevealState {
  // Premium voit tout immédiatement
  if (isPremiumViewer) {
    return 'revealed';
  }
  
  const thresholds = REVEAL_THRESHOLDS.letterThread;
  
  if (letterCount >= thresholds.revealed) {
    return 'revealed';
  } else if (letterCount >= thresholds.blurred) {
    return 'blurred';
  }
  
  return 'hidden';
}

/**
 * Vérifie si une photo spécifique doit être montrée
 */
export function shouldShowPhoto(
  letterCount: number,
  photoIndex: number,
  isPremium: boolean = false
): boolean {
  if (isPremium) return true;
  
  const thresholds = REVEAL_THRESHOLDS.photos;
  
  switch (photoIndex) {
    case 0:
      return letterCount >= thresholds.photo1;
    case 1:
      return letterCount >= thresholds.photo2;
    case 2:
      return letterCount >= thresholds.photo3;
    default:
      return letterCount >= thresholds.photo3;
  }
}

/**
 * Obtient le niveau de flou (0-1) basé sur le nombre de lettres
 */
export function getBlurLevel(
  letterCount: number,
  isPremium: boolean = false
): number {
  if (isPremium) return BLUR_LEVELS.revealed;
  
  const state = getRevealState(letterCount, false);
  return BLUR_LEVELS[state];
}

/**
 * Obtient le prochain milestone de révélation
 */
export function getNextMilestone(
  letterCount: number,
  isPremium: boolean = false
): RevealMilestone | null {
  if (isPremium) return null; // Tout est déjà révélé
  
  const thresholds = REVEAL_THRESHOLDS.letterThread;
  
  if (letterCount < thresholds.blurred) {
    return {
      letterCount: thresholds.blurred,
      state: 'blurred',
      description: 'Photo légèrement floue visible',
    };
  }
  
  if (letterCount < thresholds.revealed) {
    return {
      letterCount: thresholds.revealed,
      state: 'revealed',
      description: 'Photo nette révélée',
    };
  }
  
  return null; // Tout est révélé
}

/**
 * Vérifie si le profil complet est visible
 */
export function canSeeFullProfile(
  letterCount: number,
  isPremium: boolean = false
): boolean {
  if (isPremium) return true;
  return letterCount >= REVEAL_THRESHOLDS.letterThread.revealed;
}

/**
 * Obtient le nombre de lettres restantes pour la prochaine révélation
 */
export function getLettersUntilNextReveal(
  letterCount: number,
  isPremium: boolean = false
): number {
  const milestone = getNextMilestone(letterCount, isPremium);
  if (!milestone) return 0;
  return Math.max(0, milestone.letterCount - letterCount);
}

/**
 * Obtient le pourcentage de progression vers la révélation complète
 */
export function getRevealProgress(
  letterCount: number,
  isPremium: boolean = false
): number {
  if (isPremium) return 100;
  
  const maxRequired = REVEAL_THRESHOLDS.letterThread.revealed;
  return Math.min(100, (letterCount / maxRequired) * 100);
}

/**
 * Obtient les milestones de photos individuelles
 */
export function getPhotoMilestones(): { photoIndex: number; required: number }[] {
  const thresholds = REVEAL_THRESHOLDS.photos;
  return [
    { photoIndex: 0, required: thresholds.photo1 },
    { photoIndex: 1, required: thresholds.photo2 },
    { photoIndex: 2, required: thresholds.photo3 },
  ];
}

/**
 * Obtient le texte descriptif de l'état de révélation
 */
export function getRevealStateText(
  letterCount: number,
  isPremium: boolean = false
): string {
  const state = getRevealState(letterCount, isPremium);
  const remaining = getLettersUntilNextReveal(letterCount, isPremium);
  
  switch (state) {
    case 'hidden':
      return `🔒 ${remaining} lettres pour apercevoir`;
    case 'blurred':
      return `🔓 ${remaining} lettres pour révéler`;
    case 'revealed':
      return '✨ Photo révélée';
    default:
      return '';
  }
}
