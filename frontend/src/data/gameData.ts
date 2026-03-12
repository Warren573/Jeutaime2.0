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
  { id: 'gamer', name: 'Joueur', emoji: '🎮', description: 'Gagner 5 mini-jeux', condition: 'gamesWon >= 5' },
  { id: 'social', name: 'Social', emoji: '🗣️', description: 'Visiter tous les salons', condition: 'salonsVisited >= 7' },
  { id: 'veteran', name: 'Vétéran', emoji: '🏆', description: '30 jours sur l\'app', condition: 'daysActive >= 30' },
];

export interface Animal {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  stages: string[];
}

export const animals: Animal[] = [
  { id: 'cat', name: 'Chat', emoji: '🐱', cost: 200, stages: ['🐱', '😺', '😸'] },
  { id: 'dog', name: 'Chien', emoji: '🐶', cost: 200, stages: ['🐶', '🐕', '🦮'] },
  { id: 'rabbit', name: 'Lapin', emoji: '🐰', cost: 150, stages: ['🐰', '🐇', '🐇'] },
  { id: 'hamster', name: 'Hamster', emoji: '🐹', cost: 100, stages: ['🐹', '🐹', '🐹'] },
  { id: 'bird', name: 'Oiseau', emoji: '🐦', cost: 150, stages: ['🐦', '🐤', '🦜'] },
  { id: 'fox', name: 'Renard', emoji: '🦊', cost: 300, stages: ['🦊', '🦊', '🦊'] },
];

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
