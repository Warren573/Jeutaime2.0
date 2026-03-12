// Données des salons JeuTaime

export interface SalonParticipant {
  id: string;
  name: string;
  gender: 'M' | 'F';
  age: number;
  online: boolean;
  transformation?: string; // emoji de transformation active
  effects?: string[]; // effets visuels actifs
  offerings?: { emoji: string; from: string; timestamp: number }[]; // grille d'offrandes reçues
}

export interface Salon {
  id: string;
  icon: string;
  name: string;
  desc: string;
  type: 'standard' | 'cafe_paris' | 'metal';
  gradient: [string, string];
  maxParticipants: number;
  participants: SalonParticipant[];
}

export const salonsData: Salon[] = [
  {
    id: 'romantique',
    icon: '🍷',
    name: 'Romantique',
    desc: 'Ambiance douce et séduction',
    type: 'standard',
    gradient: ['#E91E63', '#9C27B0'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Sophie', gender: 'F', age: 28, online: true, offerings: [] },
      { id: 'p2', name: 'Emma', gender: 'F', age: 26, online: true, offerings: [] },
      { id: 'p3', name: 'Lucas', gender: 'M', age: 30, online: true, offerings: [] },
    ],
  },
  {
    id: 'humour',
    icon: '😂',
    name: 'Humour',
    desc: 'Blagues et rires garantis',
    type: 'standard',
    gradient: ['#FF9800', '#F57C00'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Kevin', gender: 'M', age: 27, online: true, offerings: [] },
      { id: 'p2', name: 'Léa', gender: 'F', age: 25, online: true, offerings: [] },
    ],
  },
  {
    id: 'aventure',
    icon: '🗡️',
    name: 'Aventure',
    desc: 'Pour les âmes intrépides',
    type: 'standard',
    gradient: ['#4CAF50', '#2E7D32'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Alex', gender: 'M', age: 29, online: true, offerings: [] },
      { id: 'p2', name: 'Marine', gender: 'F', age: 24, online: false, offerings: [] },
    ],
  },
  {
    id: 'mystere',
    icon: '🔮',
    name: 'Mystère',
    desc: 'Secrets et énigmes',
    type: 'standard',
    gradient: ['#673AB7', '#512DA8'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Clara', gender: 'F', age: 27, online: true, offerings: [] },
      { id: 'p2', name: 'Thomas', gender: 'M', age: 31, online: true, offerings: [] },
    ],
  },
  {
    id: 'metal',
    icon: '🎸',
    name: 'Métal',
    desc: 'Rock & Metal attitude',
    type: 'metal',
    gradient: ['#424242', '#212121'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Maxime', gender: 'M', age: 29, online: true, offerings: [] },
      { id: 'p2', name: 'Laura', gender: 'F', age: 27, online: true, offerings: [] },
    ],
  },
  {
    id: 'psy',
    icon: '🛋️',
    name: 'Psy',
    desc: 'Discussions profondes',
    type: 'standard',
    gradient: ['#00BCD4', '#0097A7'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Julie', gender: 'F', age: 30, online: true, offerings: [] },
      { id: 'p2', name: 'Antoine', gender: 'M', age: 28, online: true, offerings: [] },
    ],
  },
  {
    id: 'hebdo',
    icon: '⭐',
    name: 'Hebdomadaire',
    desc: 'Thème de la semaine',
    type: 'standard',
    gradient: ['#FFD700', '#FFA000'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Camille', gender: 'F', age: 26, online: true, offerings: [] },
    ],
  },
  {
    id: 'cafe_paris',
    icon: '☕',
    name: 'Café de Paris',
    desc: '4 joueurs face à face',
    type: 'cafe_paris',
    gradient: ['#8D6E63', '#5D4037'],
    maxParticipants: 4,
    participants: [
      { id: 'p1', name: 'Sophie', gender: 'F', age: 28, online: true, offerings: [] },
      { id: 'p2', name: 'Emma', gender: 'F', age: 26, online: true, offerings: [] },
      { id: 'p3', name: 'Alex', gender: 'M', age: 30, online: true, offerings: [] },
    ],
  },
];
