// ============================================
// PET ENGINE - Gestion des animaux virtuels
// ============================================

import { Pet, PetOwnership, PetStats, PetRarity } from '../shared/types';

// ==================== CONFIGURATION ====================

// Dégradation des stats par heure
export const STAT_DECAY_PER_HOUR = {
  hunger: 5,
  happiness: 3,
  energy: 4,
  cleanliness: 2,
};

// Seuils critiques
export const CRITICAL_THRESHOLDS = {
  hunger: 20,
  happiness: 30,
  energy: 25,
  cleanliness: 40,
};

// Récompenses par action
export const PET_REWARDS = {
  feed: { xp: 2, coins: 5, hungerBoost: 40, happinessBoost: 10 },
  play: { xp: 3, coins: 8, happinessBoost: 30, energyCost: 15 },
  clean: { xp: 2, coins: 5, cleanlinessBoost: 100, happinessBoost: 15 },
  sleep: { xp: 2, coins: 5, energyBoost: 100 },
  dailyBonus: { xp: 20, coins: 50 },
};

// Couleurs par rareté
export const RARITY_COLORS: Record<PetRarity, string> = {
  commun: '#4CAF50',
  peu_commun: '#2196F3',
  rare: '#9C27B0',
  legendaire: '#FFD700',
};

export const RARITY_NAMES: Record<PetRarity, string> = {
  commun: 'Commun',
  peu_commun: 'Peu Commun',
  rare: 'Rare',
  legendaire: 'Légendaire',
};

// ==================== CATALOGUE DES ANIMAUX ====================

export const PETS_CATALOG: Pet[] = [
  {
    id: 'hamster',
    name: 'Hamster',
    emoji: '🐹',
    rarity: 'commun',
    cost: 300,
    personality: 'Mignon et actif, court dans sa roue toute la nuit',
    favoriteFood: 'Graines',
    favoriteEmoji: '🌰',
    stages: ['🐹', '🐹', '🐹'],
  },
  {
    id: 'rabbit',
    name: 'Lapin',
    emoji: '🐰',
    rarity: 'commun',
    cost: 400,
    personality: 'Doux et timide, adore les câlins',
    favoriteFood: 'Carotte',
    favoriteEmoji: '🥕',
    stages: ['🐰', '🐇', '🐇'],
  },
  {
    id: 'cat',
    name: 'Chat',
    emoji: '🐱',
    rarity: 'commun',
    cost: 450,
    personality: 'Indépendant mais affectueux, maître du ronronnement',
    favoriteFood: 'Poisson',
    favoriteEmoji: '🐟',
    stages: ['🐱', '🐈', '🐈‍⬛'],
    specialPower: { id: 'night_vision', name: 'Vision nocturne', emoji: '🔮', description: 'Voit tout dans le noir' },
  },
  {
    id: 'dog',
    name: 'Chien',
    emoji: '🐶',
    rarity: 'commun',
    cost: 500,
    personality: 'Toujours joyeux et adore jouer, fidèle compagnon',
    favoriteFood: 'Os',
    favoriteEmoji: '🦴',
    stages: ['🐶', '🐕', '🐕‍🦺'],
    specialPower: { id: 'emotion_detect', name: 'Détection d\'émotions', emoji: '🎯', description: 'Ressent l\'humeur des autres' },
  },
  {
    id: 'fox',
    name: 'Renard',
    emoji: '🦊',
    rarity: 'peu_commun',
    cost: 600,
    personality: 'Rusé et agile, curieux et aime explorer',
    favoriteFood: 'Baies',
    favoriteEmoji: '🍇',
    stages: ['🦊', '🦊', '🦊'],
  },
  {
    id: 'penguin',
    name: 'Pingouin',
    emoji: '🐧',
    rarity: 'peu_commun',
    cost: 700,
    personality: 'Élégant et joueur, adore nager et glisser',
    favoriteFood: 'Poisson',
    favoriteEmoji: '🐟',
    stages: ['🐧', '🐧', '🐧'],
  },
  {
    id: 'iguana',
    name: 'Iguane',
    emoji: '🦎',
    rarity: 'peu_commun',
    cost: 800,
    personality: 'Exotique et calme, aime bronzer au soleil',
    favoriteFood: 'Salade',
    favoriteEmoji: '🥬',
    stages: ['🦎', '🦎', '🦎'],
  },
  {
    id: 'panda',
    name: 'Panda',
    emoji: '🐼',
    rarity: 'rare',
    cost: 1500,
    personality: 'Rare et adorable, mange du bambou et fait des acrobaties',
    favoriteFood: 'Bambou',
    favoriteEmoji: '🎋',
    stages: ['🐼', '🐼', '🐼'],
  },
  {
    id: 'unicorn',
    name: 'Licorne',
    emoji: '🦄',
    rarity: 'legendaire',
    cost: 3000,
    personality: 'Magique et brillante, répand des paillettes partout',
    favoriteFood: 'Étoiles',
    favoriteEmoji: '⭐',
    stages: ['🦄', '🦄', '🦄'],
    specialPower: { id: 'rainbow', name: 'Arc-en-ciel', emoji: '🌈', description: 'Crée des arcs-en-ciel magiques' },
  },
  {
    id: 'dragon',
    name: 'Dragon',
    emoji: '🐉',
    rarity: 'legendaire',
    cost: 5000,
    personality: 'Mythique et puissant, crache du feu et vole',
    favoriteFood: 'Flammes',
    favoriteEmoji: '🔥',
    stages: ['🐲', '🐉', '🐉'],
    specialPower: { id: 'fire_breath', name: 'Souffle de feu', emoji: '🔥', description: 'Crache des flammes impressionnantes' },
  },
];

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Dégrade les stats en fonction du temps passé
 */
export function degradeStats(stats: PetStats, hoursPassed: number): PetStats {
  return {
    hunger: Math.max(0, stats.hunger - STAT_DECAY_PER_HOUR.hunger * hoursPassed),
    happiness: Math.max(0, stats.happiness - STAT_DECAY_PER_HOUR.happiness * hoursPassed),
    energy: Math.max(0, stats.energy - STAT_DECAY_PER_HOUR.energy * hoursPassed),
    cleanliness: Math.max(0, stats.cleanliness - STAT_DECAY_PER_HOUR.cleanliness * hoursPassed),
    lastUpdated: Date.now(),
  };
}

/**
 * Nourrit l'animal
 */
export function feed(ownership: PetOwnership): {
  ownership: PetOwnership;
  rewards: { xp: number; coins: number };
} {
  const rewards = PET_REWARDS.feed;
  const newStats: PetStats = {
    ...ownership.stats,
    hunger: Math.min(100, ownership.stats.hunger + rewards.hungerBoost),
    happiness: Math.min(100, ownership.stats.happiness + rewards.happinessBoost),
    lastUpdated: Date.now(),
  };

  return {
    ownership: {
      ...ownership,
      stats: newStats,
      xp: ownership.xp + rewards.xp,
    },
    rewards: { xp: rewards.xp, coins: rewards.coins },
  };
}

/**
 * Joue avec l'animal
 */
export function play(ownership: PetOwnership): {
  ownership: PetOwnership;
  rewards: { xp: number; coins: number };
} {
  const rewards = PET_REWARDS.play;
  const newStats: PetStats = {
    ...ownership.stats,
    happiness: Math.min(100, ownership.stats.happiness + rewards.happinessBoost),
    energy: Math.max(0, ownership.stats.energy - rewards.energyCost),
    lastUpdated: Date.now(),
  };

  return {
    ownership: {
      ...ownership,
      stats: newStats,
      xp: ownership.xp + rewards.xp,
    },
    rewards: { xp: rewards.xp, coins: rewards.coins },
  };
}

/**
 * Nettoie l'animal
 */
export function clean(ownership: PetOwnership): {
  ownership: PetOwnership;
  rewards: { xp: number; coins: number };
} {
  const rewards = PET_REWARDS.clean;
  const newStats: PetStats = {
    ...ownership.stats,
    cleanliness: Math.min(100, ownership.stats.cleanliness + rewards.cleanlinessBoost),
    happiness: Math.min(100, ownership.stats.happiness + rewards.happinessBoost),
    lastUpdated: Date.now(),
  };

  return {
    ownership: {
      ...ownership,
      stats: newStats,
      xp: ownership.xp + rewards.xp,
    },
    rewards: { xp: rewards.xp, coins: rewards.coins },
  };
}

/**
 * Fait dormir l'animal
 */
export function sleep(ownership: PetOwnership): {
  ownership: PetOwnership;
  rewards: { xp: number; coins: number };
} {
  const rewards = PET_REWARDS.sleep;
  const newStats: PetStats = {
    ...ownership.stats,
    energy: Math.min(100, ownership.stats.energy + rewards.energyBoost),
    lastUpdated: Date.now(),
  };

  return {
    ownership: {
      ...ownership,
      stats: newStats,
      xp: ownership.xp + rewards.xp,
    },
    rewards: { xp: rewards.xp, coins: rewards.coins },
  };
}

/**
 * Vérifie si le bonus quotidien peut être réclamé
 */
export function canClaimDailyBonus(stats: PetStats): boolean {
  return (
    stats.hunger >= 80 &&
    stats.happiness >= 80 &&
    stats.energy >= 80 &&
    stats.cleanliness >= 80
  );
}

/**
 * Réclame le bonus quotidien
 */
export function claimDailyBonus(ownership: PetOwnership): {
  ownership: PetOwnership;
  rewards: { xp: number; coins: number };
} | null {
  if (!canClaimDailyBonus(ownership.stats)) {
    return null;
  }

  const rewards = PET_REWARDS.dailyBonus;
  return {
    ownership: {
      ...ownership,
      xp: ownership.xp + rewards.xp,
    },
    rewards: { xp: rewards.xp, coins: rewards.coins },
  };
}

/**
 * Incarne l'animal
 */
export function incarnate(ownership: PetOwnership): PetOwnership {
  return { ...ownership, isIncarnated: true };
}

/**
 * Désincarne l'animal
 */
export function unincarnate(ownership: PetOwnership): PetOwnership {
  return { ...ownership, isIncarnated: false };
}

/**
 * Obtient la couleur d'une stat selon sa valeur
 */
export function getStatColor(value: number): 'green' | 'orange' | 'red' {
  if (value >= 60) return 'green';
  if (value >= 30) return 'orange';
  return 'red';
}

/**
 * Vérifie si une stat est critique
 */
export function isStatCritical(stats: PetStats): boolean {
  return (
    stats.hunger < CRITICAL_THRESHOLDS.hunger ||
    stats.happiness < CRITICAL_THRESHOLDS.happiness ||
    stats.energy < CRITICAL_THRESHOLDS.energy ||
    stats.cleanliness < CRITICAL_THRESHOLDS.cleanliness
  );
}

/**
 * Crée un nouveau PetOwnership
 */
export function createPetOwnership(odId: string, pet: Pet): PetOwnership {
  return {
    id: `pet_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    odId,
    petId: pet.id,
    petName: pet.name,
    petEmoji: pet.emoji,
    adoptedAt: Date.now(),
    stats: {
      hunger: 100,
      happiness: 100,
      energy: 100,
      cleanliness: 100,
      lastUpdated: Date.now(),
    },
    isIncarnated: true,
    xp: 0,
    level: 1,
  };
}

/**
 * Obtient un animal par son ID
 */
export function getPetById(petId: string): Pet | undefined {
  return PETS_CATALOG.find(p => p.id === petId);
}

/**
 * Obtient les animaux triés par prix
 */
export function getPetsSortedByPrice(): Pet[] {
  return [...PETS_CATALOG].sort((a, b) => a.cost - b.cost);
}

/**
 * Obtient les animaux par rareté
 */
export function getPetsByRarity(rarity: PetRarity): Pet[] {
  return PETS_CATALOG.filter(p => p.rarity === rarity);
}
