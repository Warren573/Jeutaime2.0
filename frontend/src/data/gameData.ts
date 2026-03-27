// Système de points, titres et badges

export interface Title {
  level: number;
  name: string;
  minPoints: number;
  emoji: string;
}

export const titles: Title[] = [
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

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  description: string;
  condition: string;
}

export const badges: Badge[] = [
  { id: 'first_match', name: 'Premier Match', emoji: '💕', description: 'Obtenir son premier match', condition: 'matches >= 1' },
  { id: 'popular', name: 'Populaire', emoji: '🌟', description: '10 matchs obtenus', condition: 'matches >= 10' },
  { id: 'letter_writer', name: 'Épistolier', emoji: '✉️', description: 'Envoyer 10 lettres', condition: 'lettersSent >= 10' },
  { id: 'story_teller', name: 'Conteur', emoji: '📖', description: 'Participer à une histoire', condition: 'storiesParticipated >= 1' },
  { id: 'story_master', name: 'Maître Conteur', emoji: '📚', description: 'Compléter 5 histoires', condition: 'storiesCompleted >= 5' },
  { id: 'generous', name: 'Généreux', emoji: '🎁', description: 'Envoyer 20 offrandes', condition: 'offeringsSent >= 20' },
  { id: 'wizard', name: 'Sorcier', emoji: '🧙', description: 'Utiliser 10 pouvoirs magiques', condition: 'magicUsed >= 10' },
  { id: 'gamer', name: 'Joueur', emoji: '🎮', description: 'Gagner 5 activités', condition: 'gamesWon >= 5' },
  { id: 'social', name: 'Social', emoji: '🗣️', description: 'Visiter tous les salons', condition: 'salonsVisited >= 7' },
  { id: 'veteran', name: 'Vétéran', emoji: '🏆', description: '30 jours sur l\'app', condition: 'daysActive >= 30' },
];

export type AnimalRarity = 'commun' | 'peu_commun' | 'rare' | 'legendaire';

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  rarity: AnimalRarity;
  personality: string;
  favoriteFood: string;
  favoriteEmoji: string;
  stages: string[];
}

export const animals: Animal[] = [
  { 
    id: 'dog', 
    name: 'Chien', 
    emoji: '🐕', 
    cost: 500, 
    rarity: 'commun',
    personality: 'Toujours joyeux et adore jouer',
    favoriteFood: 'Os',
    favoriteEmoji: '🦴',
    stages: ['🐶', '🐕', '🐕‍🦺'] 
  },
  { 
    id: 'rabbit', 
    name: 'Lapin', 
    emoji: '🐰', 
    cost: 400, 
    rarity: 'commun',
    personality: 'Doux et timide',
    favoriteFood: 'Carotte',
    favoriteEmoji: '🥕',
    stages: ['🐰', '🐇', '🐇'] 
  },
  { 
    id: 'hamster', 
    name: 'Hamster', 
    emoji: '🐹', 
    cost: 300, 
    rarity: 'commun',
    personality: 'Mignon et actif, court dans sa roue toute la nuit',
    favoriteFood: 'Graines',
    favoriteEmoji: '🌰',
    stages: ['🐹', '🐹', '🐹'] 
  },
  { 
    id: 'panda', 
    name: 'Panda', 
    emoji: '🐼', 
    cost: 1500, 
    rarity: 'rare',
    personality: 'Rare et adorable, mange du bambou et fait des acrobaties',
    favoriteFood: 'Bambou',
    favoriteEmoji: '🎋',
    stages: ['🐼', '🐼', '🐼'] 
  },
  { 
    id: 'unicorn', 
    name: 'Licorne', 
    emoji: '🦄', 
    cost: 3000, 
    rarity: 'legendaire',
    personality: 'Légendaire et magique, répand des paillettes et fait des arcs-en-ciel',
    favoriteFood: 'Étoiles',
    favoriteEmoji: '⭐',
    stages: ['🦄', '🦄', '🦄'] 
  },
  { 
    id: 'iguana', 
    name: 'Iguane', 
    emoji: '🦎', 
    cost: 800, 
    rarity: 'peu_commun',
    personality: 'Exotique et calme, aime bronzer au soleil et grimper',
    favoriteFood: 'Salade',
    favoriteEmoji: '🥗',
    stages: ['🦎', '🦎', '🦎'] 
  },
  { 
    id: 'penguin', 
    name: 'Pingouin', 
    emoji: '🐧', 
    cost: 700, 
    rarity: 'peu_commun',
    personality: 'Élégant et joueur, adore nager et glisser sur la glace',
    favoriteFood: 'Poisson',
    favoriteEmoji: '🐟',
    stages: ['🐧', '🐧', '🐧'] 
  },
  { 
    id: 'fox', 
    name: 'Renard', 
    emoji: '🦊', 
    cost: 600, 
    rarity: 'peu_commun',
    personality: 'Rusé et agile, curieux et aime explorer',
    favoriteFood: 'Baies',
    favoriteEmoji: '🍇',
    stages: ['🦊', '🦊', '🦊'] 
  },
  { 
    id: 'dragon', 
    name: 'Dragon', 
    emoji: '🐉', 
    cost: 5000, 
    rarity: 'legendaire',
    personality: 'Mythique et puissant, crache du feu et vole dans le ciel',
    favoriteFood: 'Flammes',
    favoriteEmoji: '🔥',
    stages: ['🐲', '🐉', '🐉'] 
  },
];

export const rarityColors = {
  commun: '#4CAF50',
  peu_commun: '#2196F3',
  rare: '#9C27B0',
  legendaire: '#FFD700',
};

export const rarityNames = {
  commun: 'Commun',
  peu_commun: 'Peu Commun',
  rare: 'Rare',
  legendaire: 'Légendaire',
};

export const pointsConfig = {
  sendLetter: 10,
  receiveLetter: 5,
  getMatch: 25,
  sendOffering: 5,
  participateStory: 5,
  completeStory: 50,
  winGame: 15,
  dailyLogin: 10,
};

// Activités disponibles
export interface MiniGame {
  id: string;
  name: string;
  emoji: string;
  description: string;
  reward: number;
  difficulty: 'facile' | 'moyen' | 'difficile';
}

export const miniGames: MiniGame[] = [
  { id: 'story',     name: "Continue l'Histoire", emoji: '📖', description: 'Créez une histoire à plusieurs', reward: 50,  difficulty: 'facile' },
  { id: 'cards',     name: 'Jeu de Cartes',        emoji: '🎴', description: 'Révélez et gagnez!',             reward: 100, difficulty: 'moyen' },
  { id: 'bottle',    name: 'Bouteille à la Mer',   emoji: '🍾', description: 'Envoyez un message à l\'inconnu', reward: 30,  difficulty: 'facile' },
  { id: 'adoption',  name: 'Adoption',             emoji: '🐾', description: 'Adoptez et prenez soin d\'un animal', reward: 60, difficulty: 'moyen' },
  { id: 'classement',name: 'Classement',           emoji: '🏆', description: 'Découvrez votre rang',           reward: 20,  difficulty: 'facile' },
];
