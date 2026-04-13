// ─── ARRIÈRE-PLANS DISPONIBLES ─────────────────────────────────────────────────

export interface Background {
  id: string;
  name: string;
  color: string;      // couleur de fond principale
  dark: boolean;      // true = texte blanc recommandé
  preview: string;    // couleur de l'aperçu (légèrement plus saturée)
}

export const BACKGROUNDS: Background[] = [
  // ── Clairs
  { id: 'cream',    name: 'Crème',         color: '#FFF8E7', dark: false, preview: '#F5E9C9' },
  { id: 'white',    name: 'Blanc pur',     color: '#FFFFFF', dark: false, preview: '#F0F0F0' },
  { id: 'blush',    name: 'Rose poudré',   color: '#FFF0F3', dark: false, preview: '#FFD6DE' },
  { id: 'lavender', name: 'Lavande',       color: '#F3F0FF', dark: false, preview: '#DDD4FF' },
  { id: 'mint',     name: 'Menthe',        color: '#F0FFF8', dark: false, preview: '#C3F0DC' },
  { id: 'sand',     name: 'Sable',         color: '#FDF6EC', dark: false, preview: '#F0DDB8' },
  { id: 'sky',      name: 'Ciel',          color: '#EFF6FF', dark: false, preview: '#BFDBFE' },
  { id: 'peach',    name: 'Pêche',         color: '#FFF4EE', dark: false, preview: '#FECBA1' },
  // ── Sombres
  { id: 'dusk',     name: 'Crépuscule',    color: '#1E1B2E', dark: true,  preview: '#2D2848' },
  { id: 'navy',     name: 'Marine',        color: '#0D1B2A', dark: true,  preview: '#1A3A5C' },
  { id: 'forest',   name: 'Forêt',         color: '#0F1F15', dark: true,  preview: '#1A3D25' },
  { id: 'charcoal', name: 'Ardoise',       color: '#1C1C1E', dark: true,  preview: '#3A3A3C' },
];

export const DEFAULT_BG = '#FFF8E7';

// ─── ÉCRANS CONFIGURABLES ─────────────────────────────────────────────────────

export interface ScreenConfig {
  id: string;
  name: string;
  icon: string;
}

export const CONFIGURABLE_SCREENS: ScreenConfig[] = [
  { id: 'home',           name: 'Accueil',        icon: '⭐' },
  { id: 'profiles',       name: 'Découverte',     icon: '🔍' },
  { id: 'social',         name: 'Social',         icon: '🌐' },
  { id: 'letters',        name: 'Lettres',        icon: '💌' },
  { id: 'journal',        name: 'Journal',        icon: '📰' },
  { id: 'settings',       name: 'Paramètres',     icon: '⚙️' },
  { id: 'salons',         name: 'Salons',         icon: '👥' },
  { id: 'salon',          name: 'Salon actif',    icon: '💬' },
  { id: 'profile_detail', name: 'Profil détaillé', icon: '👤' },
];
