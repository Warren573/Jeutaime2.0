// Données des salons JeuTaime

export interface SalonParticipant {
  id: string;
  name: string;
  gender: 'M' | 'F';
  age: number;
  online: boolean;
  transformation?: string;
  effects?: string[];
  offerings?: { emoji: string; from: string; timestamp: number }[];
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
    id: 'piscine',
    icon: '🏊',
    name: 'Piscine',
    desc: 'Ambiance aquatique et détente',
    type: 'standard',
    gradient: ['#4FC3F7', '#0288D1'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Sophie', gender: 'F', age: 28, online: true, offerings: [] },
      { id: 'p2', name: 'Emma', gender: 'F', age: 26, online: true, offerings: [] },
      { id: 'p3', name: 'Alexandre', gender: 'M', age: 32, online: true, offerings: [] },
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
      { id: 'p1', name: 'Léa', gender: 'F', age: 25, online: true, offerings: [] },
      { id: 'p2', name: 'Clara', gender: 'F', age: 27, online: true, offerings: [] },
      { id: 'p3', name: 'Jules', gender: 'M', age: 28, online: true, offerings: [] },
    ],
  },
  {
    id: 'pirates',
    icon: '🏴‍☠️',
    name: 'Île des pirates',
    desc: 'Aventures maritimes et trésors',
    type: 'standard',
    gradient: ['#FFD54F', '#5D4037'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Océane', gender: 'F', age: 29, online: true, offerings: [] },
      { id: 'p2', name: 'Marine', gender: 'F', age: 24, online: false, offerings: [] },
      { id: 'p3', name: 'Lucas', gender: 'M', age: 30, online: true, offerings: [] },
    ],
  },
  {
    id: 'theatre',
    icon: '🎭',
    name: 'Théâtre improvisé',
    desc: 'Spectacles, rires et impro',
    type: 'standard',
    gradient: ['#CE93D8', '#7B1FA2'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Zoé', gender: 'F', age: 26, online: true, offerings: [] },
      { id: 'p2', name: 'Valérie', gender: 'F', age: 31, online: true, offerings: [] },
      { id: 'p3', name: 'Kevin', gender: 'M', age: 27, online: true, offerings: [] },
    ],
  },
  {
    id: 'cocktails',
    icon: '🍸',
    name: 'Bar à cocktails',
    desc: 'Mixologie & saveurs',
    type: 'standard',
    gradient: ['#F48FB1', '#C2185B'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Amélia', gender: 'F', age: 30, online: true, offerings: [] },
      { id: 'p2', name: 'Victoria', gender: 'F', age: 28, online: true, offerings: [] },
      { id: 'p3', name: 'Xavier', gender: 'M', age: 35, online: false, offerings: [] },
    ],
  },
  {
    id: 'metal',
    icon: '🤘',
    name: 'Métal',
    desc: 'Rock & Metal attitude',
    type: 'metal',
    gradient: ['#424242', '#212121'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Maxime', gender: 'M', age: 29, online: true, offerings: [] },
      { id: 'p2', name: 'Laura', gender: 'F', age: 27, online: true, offerings: [] },
      { id: 'p3', name: 'Thomas', gender: 'M', age: 31, online: false, offerings: [] },
    ],
  },
  {
    id: 'psy',
    icon: '🛋️',
    name: 'Cabinet du Psy',
    desc: 'Discussions profondes',
    type: 'standard',
    gradient: ['#00BCD4', '#0097A7'],
    maxParticipants: 8,
    participants: [
      { id: 'p1', name: 'Julie', gender: 'F', age: 30, online: true, offerings: [] },
      { id: 'p2', name: 'Antoine', gender: 'M', age: 28, online: true, offerings: [] },
      { id: 'p3', name: 'Camille', gender: 'F', age: 26, online: true, offerings: [] },
    ],
  },
];
