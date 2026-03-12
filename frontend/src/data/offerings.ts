// Système complet d'offrandes et pouvoirs - JeuTaime

export interface Offering {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  category: 'boisson' | 'nourriture' | 'symbolique' | 'humour';
  effect?: string;
  cancelledBy?: string[];
}

export interface Power {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  duration: number; // en minutes
  type: 'transformation' | 'effect' | 'weather';
  cancelledBy?: string[];
  salonOnly?: string; // salon spécifique
}

// 🍹 BOISSONS
export const boissons: Offering[] = [
  { id: 'tournee', emoji: '🍻', name: 'Tournée générale', cost: 200, category: 'boisson' },
  { id: 'cafe', emoji: '☕', name: 'Café', cost: 20, category: 'boisson' },
  { id: 'chocolat_chaud', emoji: '🍫', name: 'Chocolat chaud', cost: 25, category: 'boisson' },
  { id: 'the', emoji: '🍵', name: 'Thé', cost: 20, category: 'boisson' },
  { id: 'eau', emoji: '💧', name: 'Verre d\'eau', cost: 5, category: 'boisson' },
  { id: 'cocktail', emoji: '🍸', name: 'Cocktail', cost: 50, category: 'boisson' },
  { id: 'mojito', emoji: '🍹', name: 'Mojito', cost: 60, category: 'boisson' },
  { id: 'martini', emoji: '🍸', name: 'Martini', cost: 55, category: 'boisson' },
  { id: 'champagne', emoji: '🍾', name: 'Champagne', cost: 150, category: 'boisson' },
  { id: 'vin', emoji: '🍷', name: 'Vin', cost: 45, category: 'boisson' },
  { id: 'biere', emoji: '🍺', name: 'Bière', cost: 30, category: 'boisson' },
  { id: 'rhum', emoji: '🥃', name: 'Rhum', cost: 40, category: 'boisson' },
  { id: 'whisky', emoji: '🥃', name: 'Whisky', cost: 50, category: 'boisson' },
  { id: 'vomito', emoji: '🤮', name: 'Cocktail Vomito', cost: 100, category: 'humour', effect: 'vomit', cancelledBy: ['eau', 'cafe'] },
];

// 🍔 NOURRITURE
export const nourriture: Offering[] = [
  { id: 'croissant', emoji: '🥐', name: 'Croissant', cost: 25, category: 'nourriture' },
  { id: 'macaron', emoji: '🧁', name: 'Macaron', cost: 30, category: 'nourriture' },
  { id: 'chocolat', emoji: '🍫', name: 'Chocolat', cost: 35, category: 'nourriture' },
  { id: 'gateau', emoji: '🍰', name: 'Part de gâteau', cost: 45, category: 'nourriture' },
  { id: 'hamburger', emoji: '🍔', name: 'Hamburger', cost: 40, category: 'nourriture' },
  { id: 'sushis', emoji: '🍣', name: 'Sushis', cost: 60, category: 'nourriture' },
  { id: 'frites', emoji: '🍟', name: 'Frites', cost: 25, category: 'nourriture' },
  { id: 'fraises', emoji: '🍓', name: 'Fraises', cost: 35, category: 'nourriture' },
  { id: 'salade_fruits', emoji: '🥗', name: 'Salade de fruits', cost: 40, category: 'nourriture' },
  { id: 'glace', emoji: '🍦', name: 'Glace', cost: 30, category: 'nourriture' },
  { id: 'bonbons', emoji: '🍬', name: 'Bonbons', cost: 20, category: 'nourriture' },
];

// 💌 SYMBOLIQUE
export const symbolique: Offering[] = [
  { id: 'rose', emoji: '🌹', name: 'Rose', cost: 50, category: 'symbolique' },
  { id: 'fleur', emoji: '🌸', name: 'Fleur', cost: 40, category: 'symbolique' },
  { id: 'bouquet', emoji: '💐', name: 'Bouquet', cost: 120, category: 'symbolique' },
  { id: 'coeur', emoji: '❤️', name: 'Cœur', cost: 30, category: 'symbolique' },
  { id: 'lettre', emoji: '💌', name: 'Lettre', cost: 25, category: 'symbolique' },
  { id: 'diamant', emoji: '💎', name: 'Diamant', cost: 200, category: 'symbolique' },
  { id: 'etoile', emoji: '⭐', name: 'Étoile', cost: 45, category: 'symbolique' },
  { id: 'lune', emoji: '🌙', name: 'Lune', cost: 55, category: 'symbolique' },
];

// 🪄 POUVOIRS - Transformations
export const transformations: Power[] = [
  { id: 'grenouille', emoji: '🐸', name: 'Transformer en grenouille', cost: 100, duration: 60, type: 'transformation', cancelledBy: ['baiser'] },
  { id: 'ane', emoji: '🫏', name: 'Transformer en âne', cost: 80, duration: 60, type: 'transformation' },
  { id: 'fantome', emoji: '👻', name: 'Transformer en fantôme', cost: 120, duration: 60, type: 'transformation', cancelledBy: ['soleil'] },
  { id: 'pirate', emoji: '🏴‍☠️', name: 'Transformer en pirate', cost: 90, duration: 60, type: 'transformation' },
  { id: 'statue', emoji: '🗿', name: 'Transformer en statue', cost: 110, duration: 30, type: 'transformation', cancelledBy: ['applaudissements'] },
  { id: 'poule', emoji: '🐔', name: 'Transformer en poule', cost: 70, duration: 60, type: 'transformation', cancelledBy: ['grain'] },
  { id: 'invisibilite', emoji: '🫥', name: 'Invisibilité', cost: 150, duration: 30, type: 'transformation' },
];

// Annulateurs
export const cancellers: Power[] = [
  { id: 'baiser', emoji: '💋', name: 'Baiser', cost: 50, duration: 0, type: 'effect' },
  { id: 'soleil', emoji: '☀️', name: 'Rayon de soleil', cost: 40, duration: 0, type: 'weather' },
  { id: 'applaudissements', emoji: '👏', name: 'Applaudissements', cost: 30, duration: 0, type: 'effect' },
  { id: 'grain', emoji: '🌽', name: 'Grain', cost: 20, duration: 0, type: 'effect' },
];

// ✨ EFFETS VISUELS
export const effects: Power[] = [
  { id: 'aura', emoji: '✨', name: 'Aura brillante', cost: 60, duration: 120, type: 'effect' },
  { id: 'etincelles', emoji: '💫', name: 'Étincelles', cost: 50, duration: 90, type: 'effect' },
  { id: 'fumee', emoji: '💨', name: 'Nuage de fumée', cost: 40, duration: 60, type: 'effect' },
  { id: 'halo', emoji: '🔆', name: 'Halo lumineux', cost: 70, duration: 120, type: 'effect' },
  { id: 'ombre', emoji: '🌑', name: 'Ombre mystérieuse', cost: 55, duration: 90, type: 'effect' },
  { id: 'etoiles', emoji: '🌟', name: 'Pluie d\'étoiles', cost: 80, duration: 60, type: 'effect' },
  { id: 'confettis', emoji: '🎊', name: 'Confettis', cost: 45, duration: 30, type: 'effect' },
  { id: 'petales', emoji: '🌸', name: 'Pétales de rose', cost: 65, duration: 90, type: 'effect' },
  { id: 'pluie', emoji: '🌧️', name: 'Pluie sur avatar', cost: 50, duration: 60, type: 'weather', cancelledBy: ['soleil'] },
];

// 🎸 SALON MÉTAL - Spécifiques
export const metalOfferings: Offering[] = [
  { id: 'biere_pression', emoji: '🍺', name: 'Bière pression', cost: 35, category: 'boisson' },
  { id: 'double_biere', emoji: '🍻', name: 'Double bière', cost: 60, category: 'boisson' },
  { id: 'whisky_rock', emoji: '🥃', name: 'Whisky rock', cost: 55, category: 'boisson' },
  { id: 'shot_tequila', emoji: '🥃', name: 'Shot de tequila', cost: 40, category: 'boisson' },
  { id: 'rhum_noir', emoji: '🥃', name: 'Rhum noir', cost: 50, category: 'boisson' },
  { id: 'energy_drink', emoji: '⚡', name: 'Energy drink', cost: 30, category: 'boisson' },
  { id: 'eau_plate', emoji: '💧', name: 'Eau plate (blasphème)', cost: 5, category: 'humour' },
  { id: 'hotdog', emoji: '🌭', name: 'Hot-dog', cost: 30, category: 'nourriture' },
  { id: 'nachos', emoji: '🧀', name: 'Nachos', cost: 35, category: 'nourriture' },
  { id: 'wings', emoji: '🍗', name: 'Wings', cost: 40, category: 'nourriture' },
];

export const metalPowers: Power[] = [
  { id: 'chat_noir', emoji: '🐈‍⬛', name: 'Chat noir maléfique', cost: 100, duration: 60, type: 'transformation', salonOnly: 'metal' },
  { id: 'licorne', emoji: '🦄', name: 'Transformer en licorne', cost: 120, duration: 60, type: 'transformation', salonOnly: 'metal' },
  { id: 'aura_feu', emoji: '🔥', name: 'Aura de feu', cost: 80, duration: 90, type: 'effect', salonOnly: 'metal' },
  { id: 'eclairs', emoji: '⚡', name: 'Éclairs', cost: 70, duration: 60, type: 'effect', salonOnly: 'metal' },
  { id: 'guitare', emoji: '🎸', name: 'Guitare cassée', cost: 150, duration: 30, type: 'effect', salonOnly: 'metal' },
];

// Toutes les offrandes
export const allOfferings = [...boissons, ...nourriture, ...symbolique];
export const allPowers = [...transformations, ...cancellers, ...effects];
