import { Platform } from 'react-native';

/**
 * Socle visuel commun de JeuTaime.
 *
 * L'objectif n'est pas d'effacer l'identité propre de chaque univers
 * (Lettres, Refuge, Bouteille, Salons…), mais d'éviter les différences
 * accidentelles de tailles, rayons, espacements et ombres.
 */
export const APP_COLORS = {
  background: '#F6F1E8',
  backgroundWarm: '#FFF8E7',
  paper: '#FEFAF0',
  paperSoft: '#F8F0E4',
  ink: '#2C1A0E',
  text: '#3A2818',
  muted: '#8B6F47',
  border: '#D9C7AD',
  borderStrong: '#B8956A',
  burgundy: '#8B2E3C',
  burgundyDark: '#6F2230',
  gold: '#B87333',
  goldSoft: '#F0D98C',
  danger: '#B33A3A',
  success: '#2E7D32',
  darkHeader: '#2C1A0E',
  white: '#FFFFFF',
} as const;

export const APP_SPACING = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const APP_RADIUS = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

export const APP_SIZES = {
  touchTarget: 44,
  buttonHeight: 48,
  buttonHeightLarge: 54,
  screenPadding: 16,
  headerHorizontal: 16,
} as const;

export const APP_TYPE = {
  caption: 11,
  small: 13,
  body: 15,
  button: 15,
  subtitle: 17,
  title: 26,
  hero: 32,
} as const;

export const APP_SHADOWS = {
  card: Platform.select({
    web: {
      boxShadow: '0 3px 10px rgba(70, 44, 24, 0.12)',
    } as any,
    default: {
      shadowColor: '#3A2818',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.12,
      shadowRadius: 8,
      elevation: 3,
    },
  }),
  elevated: Platform.select({
    web: {
      boxShadow: '0 5px 16px rgba(70, 44, 24, 0.17)',
    } as any,
    default: {
      shadowColor: '#3A2818',
      shadowOffset: { width: 0, height: 5 },
      shadowOpacity: 0.17,
      shadowRadius: 12,
      elevation: 6,
    },
  }),
} as const;

export const APP_COMPONENTS = {
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
  },
  primaryButton: {
    minHeight: APP_SIZES.buttonHeight,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.burgundy,
    paddingHorizontal: APP_SPACING.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  secondaryButton: {
    minHeight: APP_SIZES.buttonHeight,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.burgundy,
    backgroundColor: APP_COLORS.paper,
    paddingHorizontal: APP_SPACING.md,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;
