/**
 * Offrandes, pouvoirs et effets visuels — JeuTaime
 * ─────────────────────────────────────────────────────────────────────────────
 * Champs clés :
 *  durationMs        → durée de l'effet visible sur l'avatar
 *  breakConditionId  → powerId qui brise une transformation (pouvoirs seulement)
 *  breakHint         → texte affiché sous l'avatar transformé
 *  stackPriority     → z-order si plusieurs effets coexistent (plus élevé = par-dessus)
 *  category (effet)  → 'offering' | 'transformation' | 'visual_effect'
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Offering {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  category: 'boisson' | 'nourriture' | 'symbolique' | 'humour';
  durationMs: number;       // durée d'affichage du badge sur l'avatar
  stackPriority: number;    // 1 = discret, 5 = très visible
  effect?: string;
  cancelledBy?: string[];
}

export interface Power {
  id: string;
  emoji: string;
  name: string;
  cost: number;
  duration: number;         // en secondes
  durationMs?: number;      // calculé automatiquement
  type: 'transformation' | 'visual_effect' | 'weather';
  breakConditionId?: string; // powerId qui brise cet effet
  breakHint?: string;       // affiché sous l'avatar ("Un bisou pour libérer 💋")
  cancelledBy?: string[];
  cancels?: string[];       // power ids que CE pouvoir annule
  stackPriority?: number;
  salonOnly?: string;
}

// ─── BOISSONS ─────────────────────────────────────────────────────────────────

export const boissons: Offering[] = [
  { id: 'tournee',       emoji: '🍻', name: 'Tournée générale',  cost: 200, category: 'boisson',    durationMs: 8000,  stackPriority: 4 },
  { id: 'cafe',          emoji: '☕', name: 'Café',              cost:  20, category: 'boisson',    durationMs: 5000,  stackPriority: 1 },
  { id: 'espresso',      emoji: '☕', name: 'Espresso',          cost:  25, category: 'boisson',    durationMs: 4000,  stackPriority: 1 },
  { id: 'chocolat_chaud',emoji: '🍫', name: 'Chocolat chaud',    cost:  25, category: 'boisson',    durationMs: 5000,  stackPriority: 1 },
  { id: 'the',           emoji: '🍵', name: 'Thé',               cost:  20, category: 'boisson',    durationMs: 4500,  stackPriority: 1 },
  { id: 'eau',           emoji: '💧', name: "Verre d'eau",       cost:   5, category: 'boisson',    durationMs: 3000,  stackPriority: 1 },
  { id: 'cocktail',      emoji: '🍸', name: 'Cocktail',          cost:  50, category: 'boisson',    durationMs: 6000,  stackPriority: 2 },
  { id: 'mojito',        emoji: '🍹', name: 'Mojito',            cost:  60, category: 'boisson',    durationMs: 6500,  stackPriority: 2 },
  { id: 'martini',       emoji: '🍸', name: 'Martini',           cost:  55, category: 'boisson',    durationMs: 6000,  stackPriority: 2 },
  { id: 'champagne',     emoji: '🍾', name: 'Coupe de champagne',cost: 150, category: 'boisson',    durationMs: 10000, stackPriority: 4 },
  { id: 'vin',           emoji: '🍷', name: 'Verre de vin',      cost:  45, category: 'boisson',    durationMs: 6000,  stackPriority: 2 },
  { id: 'biere',         emoji: '🍺', name: 'Bière',             cost:  30, category: 'boisson',    durationMs: 5000,  stackPriority: 2 },
  { id: 'rhum',          emoji: '🥃', name: 'Rhum',              cost:  40, category: 'boisson',    durationMs: 5500,  stackPriority: 2 },
  { id: 'whisky',        emoji: '🥃', name: 'Whisky',            cost:  50, category: 'boisson',    durationMs: 6000,  stackPriority: 3 },
  {
    id: 'vomito', emoji: '🤮', name: 'Cocktail Vomito',
    cost: 100, category: 'humour', durationMs: 8000, stackPriority: 3,
    effect: 'vomit', cancelledBy: ['eau', 'cafe'],
  },
];

// ─── NOURRITURE ───────────────────────────────────────────────────────────────

export const nourriture: Offering[] = [
  { id: 'croissant',    emoji: '🥐', name: 'Croissant',       cost:  25, category: 'nourriture', durationMs: 4000,  stackPriority: 1 },
  { id: 'macaron',      emoji: '🧁', name: 'Macaron',         cost:  30, category: 'nourriture', durationMs: 4500,  stackPriority: 2 },
  { id: 'chocolat',     emoji: '🍫', name: 'Chocolat',        cost:  35, category: 'nourriture', durationMs: 4500,  stackPriority: 2 },
  { id: 'gateau',       emoji: '🍰', name: 'Part de gâteau',  cost:  45, category: 'nourriture', durationMs: 6000,  stackPriority: 3 },
  { id: 'hamburger',    emoji: '🍔', name: 'Hamburger',       cost:  40, category: 'nourriture', durationMs: 5000,  stackPriority: 2 },
  { id: 'sushis',       emoji: '🍣', name: 'Sushis',          cost:  60, category: 'nourriture', durationMs: 6000,  stackPriority: 3 },
  { id: 'frites',       emoji: '🍟', name: 'Frites',          cost:  25, category: 'nourriture', durationMs: 4000,  stackPriority: 1 },
  { id: 'fraises',      emoji: '🍓', name: 'Fraises',         cost:  35, category: 'nourriture', durationMs: 5000,  stackPriority: 2 },
  { id: 'salade_fruits',emoji: '🥗', name: 'Salade de fruits',cost:  40, category: 'nourriture', durationMs: 5000,  stackPriority: 2 },
  { id: 'glace',        emoji: '🍦', name: 'Glace',           cost:  30, category: 'nourriture', durationMs: 4500,  stackPriority: 2 },
  { id: 'bonbons',      emoji: '🍬', name: 'Bonbons',         cost:  20, category: 'nourriture', durationMs: 5000,  stackPriority: 2 },
];

// ─── SYMBOLIQUE ───────────────────────────────────────────────────────────────

export const symbolique: Offering[] = [
  { id: 'rose',    emoji: '🌹', name: 'Rose',     cost:  50, category: 'symbolique', durationMs: 12000, stackPriority: 5 },
  { id: 'fleur',   emoji: '🌸', name: 'Fleur',    cost:  40, category: 'symbolique', durationMs: 9000,  stackPriority: 4 },
  { id: 'bouquet', emoji: '💐', name: 'Bouquet',  cost: 120, category: 'symbolique', durationMs: 14000, stackPriority: 5 },
  { id: 'coeur',   emoji: '❤️', name: 'Cœur',     cost:  30, category: 'symbolique', durationMs: 8000,  stackPriority: 4 },
  { id: 'lettre',  emoji: '💌', name: 'Lettre',   cost:  25, category: 'symbolique', durationMs: 7000,  stackPriority: 3 },
  { id: 'diamant', emoji: '💎', name: 'Diamant',  cost: 200, category: 'symbolique', durationMs: 15000, stackPriority: 5 },
  { id: 'etoile',  emoji: '⭐', name: 'Étoile',   cost:  45, category: 'symbolique', durationMs: 8000,  stackPriority: 3 },
  { id: 'lune',    emoji: '🌙', name: 'Lune',     cost:  55, category: 'symbolique', durationMs: 9000,  stackPriority: 4 },
];

// ─── TRANSFORMATIONS ─────────────────────────────────────────────────────────

export const transformations: Power[] = [
  {
    id: 'grenouille', emoji: '🐸', name: 'Transformer en grenouille',
    cost: 100, duration: 60, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_kiss',
    breakHint: 'Un bisou pour libérer 💋',
    cancelledBy: ['break_kiss'],
  },
  {
    id: 'ane', emoji: '🫏', name: 'Transformer en âne',
    cost: 80, duration: 60, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_compliment',
    breakHint: 'Un compliment sincère 👏',
  },
  {
    id: 'fantome', emoji: '👻', name: 'Transformer en fantôme',
    cost: 120, duration: 60, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_water',
    breakHint: "De l'eau pour chasser 💧",
    cancelledBy: ['soleil', 'break_water'],
  },
  {
    id: 'pirate', emoji: '🏴‍☠️', name: 'Transformer en pirate',
    cost: 90, duration: 60, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_dance',
    breakHint: 'Dansez pour briser le sort 💃',
  },
  {
    id: 'statue', emoji: '🗿', name: 'Transformer en statue',
    cost: 110, duration: 30, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_compliment',
    breakHint: '3 compliments pour réanimer 👏',
  },
  {
    id: 'poule', emoji: '🐔', name: 'Transformer en poule',
    cost: 70, duration: 60, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_laugh',
    breakHint: '5 rires collectifs 😂',
  },
  {
    id: 'invisibilite', emoji: '🫥', name: 'Invisibilité',
    cost: 150, duration: 30, type: 'transformation', stackPriority: 10,
    breakConditionId: 'break_laugh',
    breakHint: 'Un grand rire collectif 😂',
  },
  {
    id: 'rockstar', emoji: '🎸', name: 'Transformer en rockstar',
    cost: 130, duration: 45, type: 'transformation', stackPriority: 9,
    breakConditionId: 'break_music',
    breakHint: 'Une autre guitare 🎸',
  },
];

// ─── ANNULATEURS (break conditions) ──────────────────────────────────────────

export const cancellers: Power[] = [
  {
    id: 'break_kiss', emoji: '💋', name: 'Bisou',
    cost: 50, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['grenouille'],
  },
  {
    id: 'soleil', emoji: '☀️', name: 'Rayon de soleil',
    cost: 40, duration: 0, type: 'weather', stackPriority: 1,
    cancels: ['fantome', 'pluie'],
  },
  {
    id: 'break_compliment', emoji: '👏', name: 'Compliment',
    cost: 30, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['ane', 'statue'],
  },
  {
    id: 'break_laugh', emoji: '😂', name: 'Grand rire',
    cost: 25, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['poule', 'invisibilite'],
  },
  {
    id: 'break_dance', emoji: '💃', name: 'Danse',
    cost: 35, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['pirate'],
  },
  {
    id: 'break_water', emoji: '💧', name: "Verre d'eau",
    cost: 20, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['fantome'],
  },
  {
    id: 'break_music', emoji: '🎵', name: 'Musique',
    cost: 30, duration: 0, type: 'visual_effect', stackPriority: 1,
    cancels: ['rockstar'],
  },
];

// ─── EFFETS VISUELS ───────────────────────────────────────────────────────────

export const effects: Power[] = [
  { id: 'aura',          emoji: '✨', name: 'Aura brillante',         cost:  60, duration: 120, type: 'visual_effect', stackPriority: 1 },
  { id: 'etincelles',    emoji: '💫', name: 'Étincelles',             cost:  50, duration:  90, type: 'visual_effect', stackPriority: 2 },
  { id: 'fumee',         emoji: '💨', name: 'Nuage de fumée',         cost:  40, duration:  60, type: 'visual_effect', stackPriority: 3 },
  { id: 'halo',          emoji: '🔆', name: 'Halo lumineux',          cost:  70, duration: 120, type: 'visual_effect', stackPriority: 2 },
  { id: 'ombre',         emoji: '🌑', name: 'Ombre mystérieuse',      cost:  55, duration:  90, type: 'visual_effect', stackPriority: 1 },
  { id: 'pluie_etoiles', emoji: '🌟', name: "Pluie d'étoiles",        cost:  80, duration:  60, type: 'visual_effect', stackPriority: 2 },
  { id: 'etoiles_filantes', emoji: '🌠', name: "Étoiles filantes",   cost:  90, duration:  80, type: 'visual_effect', stackPriority: 3 },
  { id: 'confettis',     emoji: '🎊', name: 'Confettis',              cost:  45, duration:  30, type: 'visual_effect', stackPriority: 2 },
  { id: 'petales',       emoji: '🌸', name: 'Pétales de rose',        cost:  65, duration:  90, type: 'visual_effect', stackPriority: 2 },
  {
    id: 'pluie', emoji: '🌧️', name: 'Pluie sur avatar',
    cost: 50, duration: 60, type: 'weather', stackPriority: 3,
    cancelledBy: ['soleil'], breakConditionId: 'soleil', breakHint: 'Un rayon de soleil ☀️',
  },
];

// ─── Salon Métal ──────────────────────────────────────────────────────────────

export const metalOfferings: Offering[] = [
  { id: 'biere_pression', emoji: '🍺', name: 'Bière pression',            cost: 35, category: 'boisson',    durationMs: 5000, stackPriority: 2 },
  { id: 'double_biere',   emoji: '🍻', name: 'Double bière',              cost: 60, category: 'boisson',    durationMs: 7000, stackPriority: 3 },
  { id: 'whisky_rock',    emoji: '🥃', name: 'Whisky rock',               cost: 55, category: 'boisson',    durationMs: 6000, stackPriority: 3 },
  { id: 'shot_tequila',   emoji: '🥃', name: 'Shot de tequila',           cost: 40, category: 'boisson',    durationMs: 4000, stackPriority: 2 },
  { id: 'rhum_noir',      emoji: '🥃', name: 'Rhum noir',                 cost: 50, category: 'boisson',    durationMs: 5500, stackPriority: 2 },
  { id: 'energy_drink',   emoji: '⚡', name: 'Energy drink',              cost: 30, category: 'boisson',    durationMs: 4000, stackPriority: 2 },
  { id: 'eau_plate_metal',emoji: '💧', name: 'Eau plate (blasphème)',      cost:  5, category: 'humour',     durationMs: 3000, stackPriority: 1 },
  { id: 'hotdog',         emoji: '🌭', name: 'Hot-dog',                   cost: 30, category: 'nourriture', durationMs: 4000, stackPriority: 1 },
  { id: 'nachos',         emoji: '🧀', name: 'Nachos',                    cost: 35, category: 'nourriture', durationMs: 4500, stackPriority: 1 },
  { id: 'wings',          emoji: '🍗', name: 'Wings',                     cost: 40, category: 'nourriture', durationMs: 5000, stackPriority: 2 },
];

export const metalPowers: Power[] = [
  {
    id: 'chat_noir', emoji: '🐈‍⬛', name: 'Chat noir maléfique',
    cost: 100, duration: 60, type: 'transformation', stackPriority: 10,
    salonOnly: 'metal',
    breakConditionId: 'break_rainbow', breakHint: 'Un arc-en-ciel 🌈',
  },
  {
    id: 'licorne', emoji: '🦄', name: 'Transformer en licorne',
    cost: 120, duration: 60, type: 'transformation', stackPriority: 9,
    salonOnly: 'metal',
    breakHint: 'La réalité reprend son cours ⏱️',
  },
  { id: 'aura_feu', emoji: '🔥', name: 'Aura de feu',      cost:  80, duration: 90, type: 'visual_effect', stackPriority: 3, salonOnly: 'metal' },
  { id: 'eclairs',  emoji: '⚡', name: 'Éclairs',          cost:  70, duration: 60, type: 'visual_effect', stackPriority: 3, salonOnly: 'metal' },
  { id: 'guitare',  emoji: '🎸', name: 'Guitare cassée',   cost: 150, duration: 30, type: 'visual_effect', stackPriority: 2, salonOnly: 'metal' },
];

// ─── Exports regroupés ────────────────────────────────────────────────────────

export const allOfferings = [...boissons, ...nourriture, ...symbolique];
export const allPowers    = [...transformations, ...cancellers, ...effects];

/** Durée en ms d'un pouvoir (duration est en secondes dans le type legacy) */
export function getPowerDurationMs(p: Power): number {
  if (p.durationMs) return p.durationMs;
  return p.duration * 1000;
}
