// Images de fond des salons (aquarelles). Map salonId -> asset local.
// JPG optimisés (~450 Ko, largeur 1200px) pour un chargement rapide, y compris
// sur le web. resizeMode="cover" à l'affichage → s'adapte portrait ET paysage.
import type { ImageSourcePropType } from 'react-native';

export const SALON_BACKGROUND_IMAGES: Record<string, ImageSourcePropType> = {
  piscine: require('../../assets/images/salons/piscine.jpg'),
  cafe_paris: require('../../assets/images/salons/cafe_paris.jpg'),
  pirates: require('../../assets/images/salons/pirates.jpg'),
  theatre: require('../../assets/images/salons/theatre.jpg'),
  cocktails: require('../../assets/images/salons/cocktails.jpg'),
  metal: require('../../assets/images/salons/metal.jpg'),
  psy: require('../../assets/images/salons/psy.jpg'),
};

export function getSalonBackgroundImage(
  salonId: string | undefined | null,
): ImageSourcePropType | undefined {
  if (!salonId) return undefined;
  return SALON_BACKGROUND_IMAGES[salonId];
}

// Bannières LARGES dédiées aux cartes de la liste (ratio ~3:1, ex. 1200x400).
// Déposer les fichiers dans assets/images/salons/banners/ puis ajouter leur
// require() ici. Tant qu'une bannière manque, la carte retombe sur l'aquarelle
// portrait via getSalonCardImage().
export const SALON_BANNER_IMAGES: Record<string, ImageSourcePropType> = {
  piscine: require('../../assets/images/salons/banners/piscine.jpg'),
  cafe_paris: require('../../assets/images/salons/banners/cafe_paris.jpg'),
  pirates: require('../../assets/images/salons/banners/pirates.jpg'),
  theatre: require('../../assets/images/salons/banners/theatre.jpg'),
  cocktails: require('../../assets/images/salons/banners/cocktails.jpg'),
  metal: require('../../assets/images/salons/banners/metal.jpg'),
  psy: require('../../assets/images/salons/banners/psy.jpg'),
};

// Image à utiliser pour la CARTE d'un salon : bannière large si dispo,
// sinon l'aquarelle portrait en repli.
export function getSalonCardImage(
  salonId: string | undefined | null,
): ImageSourcePropType | undefined {
  if (!salonId) return undefined;
  return SALON_BANNER_IMAGES[salonId] ?? SALON_BACKGROUND_IMAGES[salonId];
}
