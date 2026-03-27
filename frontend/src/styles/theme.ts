// ============================================
// THÈME JEUTAIME
// ============================================

export const colors = {
  // Couleurs principales
  primary: '#E91E63',      // Rose - Séduction
  secondary: '#DAA520',    // Or - Premium/Coins
  accent: '#9C27B0',       // Violet - Magie
  
  // Backgrounds
  background: '#FFF8E7',   // Crème chaud
  surface: '#FFFFFF',      // Blanc pur
  surfaceElevated: '#FFFEF7',
  
  // Textes
  textPrimary: '#3A2818',  // Marron foncé
  textSecondary: '#5D4037', // Marron moyen
  textMuted: '#8B6F47',    // Marron clair
  textLight: '#B8A082',    // Beige
  
  // Accents fonctionnels
  success: '#4CAF50',      // Vert
  warning: '#FF9800',      // Orange
  error: '#F44336',        // Rouge
  info: '#2196F3',         // Bleu
  
  // Bordures
  border: '#E8D5B7',       // Beige bordure
  borderLight: '#F5EFE6',  // Bordure très légère
  
  // Tab bar
  tabBar: '#5D4037',       // Marron foncé
  tabActive: '#FFD700',    // Or actif
  tabInactive: '#8B6F47',  // Marron inactif
  
  // Raretés
  rarityCommon: '#4CAF50',
  rarityUncommon: '#2196F3',
  rarityRare: '#9C27B0',
  rarityLegendary: '#FFD700',
  
  // Badges
  badgeBronze: '#CD7F32',
  badgeSilver: '#C0C0C0',
  badgeGold: '#FFD700',
  badgePlatinum: '#E5E4E2',
  
  // Overlay
  overlay: 'rgba(0,0,0,0.5)',
  overlayLight: 'rgba(0,0,0,0.3)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  round: 999,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 20,
  xxxl: 24,
  title: 28,
  hero: 32,
};

export const fontWeight = {
  normal: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
};

export const shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  xl: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
};

export const layout = {
  // Touch targets minimum
  touchMinSize: 44,
  
  // Tab bar
  tabBarHeight: 85,
  tabIconSize: 26,
  
  // Cards
  cardPadding: 16,
  cardMargin: 12,
  
  // Screen
  screenPadding: 16,
  
  // Header
  headerHeight: 56,
  
  // Avatar
  avatarSm: 40,
  avatarMd: 55,
  avatarLg: 80,
  avatarXl: 100,
  avatarHero: 120,
};

export const animation = {
  fast: 150,
  normal: 300,
  slow: 500,
};

// Thème complet exporté
export const theme = {
  colors,
  spacing,
  borderRadius,
  fontSize,
  fontWeight,
  shadows,
  layout,
  animation,
};

export type Theme = typeof theme;
export default theme;

// ============================================
// JOURNAL MODERNE ROMANTIQUE — palette officielle
// ============================================
export const journal = {
  bgMain:          '#F5F1E8',   // fond papier chaud
  bgCard:          '#FFFFFF',   // cartes
  bgSoft:          '#EAE4D8',   // zones secondaires
  textMain:        '#2B2B2B',
  textSecondary:   '#6B6B6B',
  accentPrimary:   '#8B2E3C',   // bordeaux
  accentSecondary: '#C9A96E',   // doré doux
  accentLight:     '#E8CFCF',
  borderSoft:      '#D8D2C4',
};
