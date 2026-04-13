// Données statiques de l'application JeuTaime

export interface Participant {
  name: string;
  gender: 'M' | 'F';
  age: number;
  online: boolean;
}

export interface MagicAction {
  name: string;
  emoji: string;
  secondEmoji?: string;
  animation: string;
  message: string;
  message2?: string;
}

export interface Salon {
  id: number;
  icon: string;
  name: string;
  desc: string;
  gradient: string[];
  magicAction: MagicAction;
  participants: Participant[];
}

export const salons: Salon[] = [
  {
    id: 1,
    icon: '🏊',
    name: 'Piscine',
    desc: '2H/2F - Ambiance aquatique',
    gradient: ['#4FC3F7', '#0288D1'],
    magicAction: {
      name: 'Faire une bombe',
      emoji: '💦',
      animation: 'splash',
      message: 'SPLASH! Tu as éclaboussé tout le monde! 🌊'
    },
    participants: [
      { name: 'Sophie', gender: 'F', age: 28, online: true },
      { name: 'Emma', gender: 'F', age: 26, online: true },
      { name: 'Alexandre', gender: 'M', age: 32, online: true }
    ]
  },
  {
    id: 2,
    icon: '☕',
    name: 'Café de Paris',
    desc: '2H/2F - Ambiance parisienne',
    gradient: ['#D7CCC8', '#8D6E63'],
    magicAction: {
      name: 'Offrir un café',
      emoji: '☕',
      animation: 'coffee',
      message: 'Tu as offert un délicieux café! ☕✨'
    },
    participants: [
      { name: 'Léa', gender: 'F', age: 25, online: true },
      { name: 'Clara', gender: 'F', age: 27, online: true },
      { name: 'Jules', gender: 'M', age: 28, online: true }
    ]
  },
  {
    id: 3,
    icon: '🏴‍☠️',
    name: 'Île des pirates',
    desc: '2H/2F - Aventures maritimes',
    gradient: ['#FFD54F', '#5D4037'],
    magicAction: {
      name: 'Chercher un trésor',
      emoji: '💎',
      animation: 'treasure',
      message: 'Trésor trouvé! +50 pièces! 💰✨'
    },
    participants: [
      { name: 'Océane', gender: 'F', age: 29, online: true },
      { name: 'Marine', gender: 'F', age: 24, online: false },
      { name: 'Lucas', gender: 'M', age: 30, online: true }
    ]
  },
  {
    id: 4,
    icon: '🎭',
    name: 'Théâtre',
    desc: '2H/2F - Spectacles et rires',
    gradient: ['#CE93D8', '#7B1FA2'],
    magicAction: {
      name: 'Transformation',
      emoji: '🐸',
      secondEmoji: '💋',
      animation: 'frog',
      message: 'Transformé en crapaud! 🐸',
      message2: 'Le charme est rompu! 💋✨'
    },
    participants: [
      { name: 'Zoé', gender: 'F', age: 26, online: true },
      { name: 'Valérie', gender: 'F', age: 31, online: true },
      { name: 'Kevin', gender: 'M', age: 27, online: true }
    ]
  },
  {
    id: 5,
    icon: '🍸',
    name: 'Bar à cocktails',
    desc: '2H/2F - Mixologie & saveurs',
    gradient: ['#F48FB1', '#C2185B'],
    magicAction: {
      name: 'Servir un cocktail',
      emoji: '🍸',
      animation: 'cocktail',
      message: 'Cocktail magique servi! 💖'
    },
    participants: [
      { name: 'Amélia', gender: 'F', age: 30, online: true },
      { name: 'Victoria', gender: 'F', age: 28, online: true },
      { name: 'Xavier', gender: 'M', age: 35, online: false }
    ]
  },
  {
    id: 6,
    icon: '🤘',
    name: 'Métal',
    desc: '2H/2F - Rock & Metal',
    gradient: ['#424242', '#000000'],
    magicAction: {
      name: 'Solo de guitare',
      emoji: '🎸',
      animation: 'guitar',
      message: 'Solo dévastateur! 🎸🔥'
    },
    participants: [
      { name: 'Maxime', gender: 'M', age: 29, online: true },
      { name: 'Laura', gender: 'F', age: 27, online: true },
      { name: 'Thomas', gender: 'M', age: 31, online: false }
    ]
  }
];

export const gifts = [
  { id: 'rose', emoji: '🌹', name: 'Rose', cost: 50, color: '#E91E63' },
  { id: 'philtre', emoji: '🧪', name: 'Philtre', cost: 100, color: '#9C27B0' },
  { id: 'bouquet', emoji: '💐', name: 'Bouquet', cost: 150, color: '#FF4081' },
  { id: 'champagne', emoji: '🍾', name: 'Champagne', cost: 200, color: '#FFD700' },
  { id: 'chocolat', emoji: '🍫', name: 'Chocolat', cost: 75, color: '#8D6E63' },
  { id: 'coeur', emoji: '❤️', name: 'Coeur', cost: 25, color: '#F44336' },
];

export const magicPowers = [
  { id: 'invisibility', emoji: '👻', name: 'Invisibilité', cost: 100, duration: 60 },
  { id: 'glow', emoji: '✨', name: 'Aura brillante', cost: 75, duration: 120 },
  { id: 'crown', emoji: '👑', name: 'Couronne dorée', cost: 150, duration: 300 },
  { id: 'heart', emoji: '💕', name: 'Pluie de coeurs', cost: 50, duration: 30 },
];
