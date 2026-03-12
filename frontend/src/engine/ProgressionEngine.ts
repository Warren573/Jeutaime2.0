// ============================================
// PROGRESSION ENGINE - Points, niveaux, badges
// ============================================

import { UserProgression, UserStats, Title, Badge } from '../shared/types';

// ==================== TITRES ====================

export const TITLES: Title[] = [
  { level: 1, name: 'Curieux', minPoints: 0, emoji: '🐣' },
  { level: 2, name: 'Explorateur', minPoints: 100, emoji: '🔍' },
  { level: 3, name: 'Charmeur', minPoints: 300, emoji: '😊' },
  { level: 4, name: 'Séducteur', minPoints: 600, emoji: '😎' },
  { level: 5, name: 'Galant', minPoints: 1000, emoji: '🎩' },
  { level: 6, name: 'Enchanteur', minPoints: 1500, emoji: '✨' },
  { level: 7, name: 'Mystérieux', minPoints: 2500, emoji: '🔮' },
  { level: 8, name: 'Fascinant', minPoints: 4000, emoji: '💫' },
  { level: 9, name: 'Irrésistible', minPoints: 6000, emoji: '💎' },
  { level: 10, name: 'Légende', minPoints: 10000, emoji: '👑' },
];

// ==================== BADGES ====================

export const BADGES: Badge[] = [
  // Matchs
  { id: 'first_match', name: 'Premier Match', emoji: '💕', description: 'Obtenir son premier match', condition: 'matchesCount >= 1', rarity: 'bronze' },
  { id: 'popular', name: 'Populaire', emoji: '🌟', description: '10 matchs obtenus', condition: 'matchesCount >= 10', rarity: 'silver' },
  { id: 'superstar', name: 'Superstar', emoji: '⭐', description: '50 matchs obtenus', condition: 'matchesCount >= 50', rarity: 'gold' },
  
  // Lettres
  { id: 'letter_writer', name: 'Épistolier', emoji: '✉️', description: 'Envoyer 10 lettres', condition: 'lettersSent >= 10', rarity: 'bronze' },
  { id: 'prolific_writer', name: 'Écrivain Prolifique', emoji: '📝', description: 'Envoyer 50 lettres', condition: 'lettersSent >= 50', rarity: 'silver' },
  { id: 'master_writer', name: 'Maître des Mots', emoji: '📚', description: 'Envoyer 200 lettres', condition: 'lettersSent >= 200', rarity: 'gold' },
  
  // Histoires
  { id: 'story_teller', name: 'Conteur', emoji: '📖', description: 'Participer à une histoire', condition: 'storiesParticipated >= 1', rarity: 'bronze' },
  { id: 'story_master', name: 'Maître Conteur', emoji: '📚', description: 'Compléter 5 histoires', condition: 'storiesCompleted >= 5', rarity: 'silver' },
  
  // Générosité
  { id: 'generous', name: 'Généreux', emoji: '🎁', description: 'Envoyer 20 offrandes', condition: 'offeringsSent >= 20', rarity: 'bronze' },
  { id: 'philanthropist', name: 'Philanthrope', emoji: '💝', description: 'Envoyer 100 offrandes', condition: 'offeringsSent >= 100', rarity: 'gold' },
  
  // Magie
  { id: 'wizard', name: 'Sorcier', emoji: '🧙', description: 'Utiliser 10 pouvoirs', condition: 'powerUsed >= 10', rarity: 'bronze' },
  { id: 'archmage', name: 'Archimage', emoji: '🔮', description: 'Utiliser 50 pouvoirs', condition: 'powerUsed >= 50', rarity: 'silver' },
  
  // Jeux
  { id: 'gamer', name: 'Joueur', emoji: '🎮', description: 'Gagner 5 mini-jeux', condition: 'gamesWon >= 5', rarity: 'bronze' },
  { id: 'champion', name: 'Champion', emoji: '🏆', description: 'Gagner 50 mini-jeux', condition: 'gamesWon >= 50', rarity: 'gold' },
  
  // Social
  { id: 'social', name: 'Social', emoji: '🗣️', description: 'Visiter tous les salons', condition: 'salonsVisited >= 7', rarity: 'silver' },
  
  // Vétéran
  { id: 'regular', name: 'Habitué', emoji: '📅', description: '7 jours actifs', condition: 'daysActive >= 7', rarity: 'bronze' },
  { id: 'veteran', name: 'Vétéran', emoji: '🎖️', description: '30 jours actifs', condition: 'daysActive >= 30', rarity: 'silver' },
  { id: 'legend', name: 'Légende Vivante', emoji: '👑', description: '100 jours actifs', condition: 'daysActive >= 100', rarity: 'platinum' },
];

// ==================== POINTS PAR ACTION ====================

export const POINTS = {
  dailyLogin: 10,
  sendLetter: 10,
  receiveLetter: 5,
  getMatch: 25,
  sendOffering: 5,
  usePower: 5,
  participateStory: 5,
  completeStory: 50,
  winGame: 15,
  visitSalon: 2,
  adoptPet: 20,
  petCare: 3,
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Ajoute des points à la progression
 */
export function addPoints(
  progression: UserProgression,
  amount: number,
  reason: string
): UserProgression {
  const newPoints = progression.points + amount;
  const { level, title, emoji } = calculateLevel(newPoints);
  
  return {
    ...progression,
    points: newPoints,
    level,
    title,
    titleEmoji: emoji,
  };
}

/**
 * Calcule le niveau et titre basé sur les points
 */
export function calculateLevel(points: number): { level: number; title: string; emoji: string } {
  // Trouver le titre correspondant aux points
  let currentTitle = TITLES[0];
  
  for (const title of TITLES) {
    if (points >= title.minPoints) {
      currentTitle = title;
    } else {
      break;
    }
  }
  
  return {
    level: currentTitle.level,
    title: currentTitle.name,
    emoji: currentTitle.emoji,
  };
}

/**
 * Obtient les infos du prochain niveau
 */
export function getNextLevelRequirement(currentPoints: number): {
  nextTitle: Title | null;
  required: number;
  remaining: number;
  progress: number;
} {
  const { level } = calculateLevel(currentPoints);
  const nextTitle = TITLES.find(t => t.level === level + 1) || null;
  const currentTitle = TITLES.find(t => t.level === level)!;
  
  if (!nextTitle) {
    return { nextTitle: null, required: 0, remaining: 0, progress: 100 };
  }
  
  const required = nextTitle.minPoints;
  const remaining = required - currentPoints;
  const rangeTotal = nextTitle.minPoints - currentTitle.minPoints;
  const rangeProgress = currentPoints - currentTitle.minPoints;
  const progress = Math.min(100, (rangeProgress / rangeTotal) * 100);
  
  return { nextTitle, required, remaining, progress };
}

/**
 * Vérifie et débloque les badges
 */
export function checkBadgeUnlock(progression: UserProgression, stats: UserStats): Badge[] {
  const newBadges: Badge[] = [];
  
  for (const badge of BADGES) {
    // Déjà débloqué ?
    if (progression.unlockedBadges.includes(badge.id)) continue;
    
    // Vérifier la condition
    const isUnlocked = evaluateBadgeCondition(badge.condition, stats);
    if (isUnlocked) {
      newBadges.push(badge);
    }
  }
  
  return newBadges;
}

/**
 * Évalue une condition de badge
 */
function evaluateBadgeCondition(condition: string, stats: UserStats): boolean {
  // Parse simple : "stat >= value"
  const match = condition.match(/(\w+)\s*>=\s*(\d+)/);
  if (!match) return false;
  
  const [, statName, valueStr] = match;
  const value = parseInt(valueStr, 10);
  const statValue = (stats as any)[statName];
  
  return typeof statValue === 'number' && statValue >= value;
}

/**
 * Débloque un badge
 */
export function unlockBadge(progression: UserProgression, badgeId: string): UserProgression {
  if (progression.unlockedBadges.includes(badgeId)) {
    return progression;
  }
  
  return {
    ...progression,
    unlockedBadges: [...progression.unlockedBadges, badgeId],
  };
}

/**
 * Met à jour les stats utilisateur
 */
export function updateStats(
  stats: UserStats,
  action: keyof UserStats,
  increment: number = 1
): UserStats {
  return {
    ...stats,
    [action]: (stats[action] || 0) + increment,
  };
}

/**
 * Crée une progression initiale
 */
export function createProgression(odId: string): UserProgression {
  const { level, title, emoji } = calculateLevel(0);
  
  return {
    odId,
    points: 0,
    level,
    title,
    titleEmoji: emoji,
    unlockedBadges: [],
    stats: {
      matchesCount: 0,
      lettersSent: 0,
      lettersReceived: 0,
      offeringsSent: 0,
      powerUsed: 0,
      gamesWon: 0,
      salonsVisited: 0,
      daysActive: 1,
      storiesParticipated: 0,
      storiesCompleted: 0,
    },
  };
}

/**
 * Obtient tous les badges avec leur état de déblocage
 */
export function getAllBadgesWithStatus(unlockedIds: string[]): (Badge & { isUnlocked: boolean })[] {
  return BADGES.map(badge => ({
    ...badge,
    isUnlocked: unlockedIds.includes(badge.id),
  }));
}
