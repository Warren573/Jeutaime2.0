/**
 * Catalogue des traits disponibles + palettes de couleurs
 * ─────────────────────────────────────────────────────────────────────────────
 * Ce fichier centralise toutes les options du générateur d'avatars.
 * Chaque entrée peut être étendue avec preview, cost, rarity, etc.
 */

import {
  AccessoryStyle, BeardStyle, BrowStyle, EyeColor, EyeStyle,
  FaceShape, HairColor, HairStyle, MouthStyle, NoseStyle,
  SkinColors, SkinTone,
} from '../types/avatar';

// ─── Options lisibles (pour les pickers) ─────────────────────────────────────

export const FACE_SHAPES: { id: FaceShape; label: string }[] = [
  { id: 'round',  label: 'Rond'  },
  { id: 'oval',   label: 'Ovale' },
  { id: 'square', label: 'Carré' },
  { id: 'heart',  label: 'Cœur'  },
];

export const SKIN_TONES: { id: SkinTone; label: string }[] = [
  { id: 'fair',   label: 'Très clair' },
  { id: 'light',  label: 'Clair'      },
  { id: 'medium', label: 'Moyen'      },
  { id: 'tan',    label: 'Mat'        },
  { id: 'deep',   label: 'Foncé'      },
];

export const EYE_STYLES: { id: EyeStyle; label: string }[] = [
  { id: 'almondSoft',  label: 'Amande douce'  },
  { id: 'almondSharp', label: 'Amande vive'   },
  { id: 'relaxed',     label: 'Détendus'      },
  { id: 'intense',     label: 'Intenses'      },
  { id: 'sleepy',      label: 'Fatigués'      },
];

export const EYE_COLORS: { id: EyeColor; label: string }[] = [
  { id: 'hazel', label: 'Noisette' },
  { id: 'blue',  label: 'Bleu'     },
  { id: 'green', label: 'Vert'     },
  { id: 'brown', label: 'Brun'     },
  { id: 'dark',  label: 'Noir'     },
  { id: 'gray',  label: 'Gris'     },
];

export const BROW_STYLES: { id: BrowStyle; label: string }[] = [
  { id: 'soft',     label: 'Doux'   },
  { id: 'arched',   label: 'Arqués' },
  { id: 'straight', label: 'Droits' },
  { id: 'bold',     label: 'Épais'  },
];

export const NOSE_STYLES: { id: NoseStyle; label: string }[] = [
  { id: 'small',     label: 'Petit'    },
  { id: 'medium',    label: 'Moyen'    },
  { id: 'long',      label: 'Long'     },
  { id: 'straight',  label: 'Droit'    },
  { id: 'softRound', label: 'Arrondi'  },
];

export const MOUTH_STYLES: { id: MouthStyle; label: string }[] = [
  { id: 'softSmile',    label: 'Sourire doux'       },
  { id: 'neutral',      label: 'Neutre'             },
  { id: 'smirk',        label: 'Coin relevé'        },
  { id: 'slightlyOpen', label: 'Légèrement ouverte' },
];

export const HAIR_STYLES: { id: HairStyle; label: string }[] = [
  { id: 'bald',     label: 'Chauve'   },
  { id: 'short',    label: 'Court'    },
  { id: 'sidePart', label: 'Raie'     },
  { id: 'textured', label: 'Texturé'  },
  { id: 'curly',    label: 'Bouclé'   },
  { id: 'long',     label: 'Long'     },
  { id: 'bun',      label: 'Chignon'  },
];

export const HAIR_COLORS: { id: HairColor; label: string }[] = [
  { id: 'black',     label: 'Noir'     },
  { id: 'darkBrown', label: 'Brun foncé' },
  { id: 'brown',     label: 'Brun'     },
  { id: 'blonde',    label: 'Blond'    },
  { id: 'auburn',    label: 'Auburn'   },
  { id: 'silver',    label: 'Gris'     },
];

export const BEARD_STYLES: { id: BeardStyle; label: string }[] = [
  { id: 'none',       label: 'Aucune'        },
  { id: 'stubble',    label: '3 jours'       },
  { id: 'mustache',   label: 'Moustache'     },
  { id: 'goatee',     label: 'Bouc'          },
  { id: 'shortBeard', label: 'Barbe courte'  },
];

export const ACCESSORY_STYLES: { id: AccessoryStyle; label: string }[] = [
  { id: 'none',         label: 'Aucun'             },
  { id: 'glasses',      label: 'Lunettes'           },
  { id: 'roundGlasses', label: 'Lunettes rondes'    },
  { id: 'earring',      label: "Boucle d'oreille"   },
];

// ─── Palettes de teint ────────────────────────────────────────────────────────
// Chaque entrée : base, mid (ombres douces), shadow (ombres marquées),
// highlight (reflets), lips, lipShadow

export const SKIN_COLORS: Record<SkinTone, SkinColors> = {
  fair: {
    base:      '#F5D4C2',
    mid:       '#EBBDA8',
    shadow:    '#D49E88',
    highlight: '#FBE8DC',
    lips:      '#D4897A',
    lipShadow: '#B86A5A',
  },
  light: {
    base:      '#EEC5A2',
    mid:       '#DBA882',
    shadow:    '#C48C66',
    highlight: '#F5D8BC',
    lips:      '#C87868',
    lipShadow: '#A85848',
  },
  medium: {
    base:      '#D4935E',
    mid:       '#BC7848',
    shadow:    '#A06038',
    highlight: '#E0A878',
    lips:      '#B86858',
    lipShadow: '#8A4438',
  },
  tan: {
    base:      '#B87040',
    mid:       '#9C5A2C',
    shadow:    '#7C4018',
    highlight: '#C88858',
    lips:      '#A05848',
    lipShadow: '#783828',
  },
  deep: {
    base:      '#6B3A22',
    mid:       '#522A14',
    shadow:    '#381808',
    highlight: '#7C4A2E',
    lips:      '#7A4840',
    lipShadow: '#502828',
  },
};

// ─── Palette de couleurs de cheveux ──────────────────────────────────────────
// base : couleur principale, shadow : ombre/volume, highlight : reflet

export const HAIR_COLOR_PALETTE: Record<HairColor, {
  base: string; shadow: string; highlight: string;
}> = {
  black:     { base: '#171312', shadow: '#0A0808', highlight: '#2A2425' },
  darkBrown: { base: '#3B2618', shadow: '#231408', highlight: '#4E3525' },
  brown:     { base: '#6A4430', shadow: '#4A2E1A', highlight: '#8A6248' },
  blonde:    { base: '#CFA75A', shadow: '#A88030', highlight: '#E0C880' },
  auburn:    { base: '#8D4A35', shadow: '#682A1C', highlight: '#A86848' },
  silver:    { base: '#A2A7AF', shadow: '#78808A', highlight: '#C8CDD5' },
};

// ─── Palette de couleurs des iris ─────────────────────────────────────────────

export const EYE_COLOR_PALETTE: Record<EyeColor, {
  iris: string; outer: string; inner: string;
}> = {
  hazel: { iris: '#8B7040', outer: '#5A4020', inner: '#B09050' },
  blue:  { iris: '#4A7EC0', outer: '#2A5090', inner: '#6AA0E0' },
  green: { iris: '#5A8A45', outer: '#356A25', inner: '#7AB065' },
  brown: { iris: '#6B3820', outer: '#401808', inner: '#8A5840' },
  dark:  { iris: '#241810', outer: '#100800', inner: '#382A20' },
  gray:  { iris: '#7A8A9A', outer: '#506070', inner: '#9AAABB' },
};
