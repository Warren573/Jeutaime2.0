// Bannières illustrées des cartes de l'écran Social (même principe que les
// salons : une illustration peinte sert de fond de carte, avec le texte
// par-dessus). Tant qu'une bannière manque, la carte retombe sur le dégradé
// défini dans SocialScreen (repli automatique via getSocialCardImage()).
//
// Format conseillé (identique aux bannières de salon) :
//   - ratio ~3:1 (la carte est large et courte), ex. 1200 × 400 px
//   - JPG qualité ~85, viser < 400 Ko
//   - garde le côté GAUCHE un peu sobre/sombre : le texte (titre + description)
//     y est superposé en blanc, avec un léger voile déjà appliqué par l'app.
//
// Nommage : un fichier par carte, selon l'id de la section —
//   salons.jpg, adoption.jpg, cards.jpg, story.jpg, bottle.jpg
// à déposer dans assets/images/social/ puis décommenter le require() ci-dessous.
import type { ImageSourcePropType } from 'react-native';

export const SOCIAL_CARD_IMAGES: Record<string, ImageSourcePropType> = {
  // salons: require('../../assets/images/social/salons.jpg'),
  // adoption: require('../../assets/images/social/adoption.jpg'),
  // cards: require('../../assets/images/social/cards.jpg'),
  // story: require('../../assets/images/social/story.jpg'),
  // bottle: require('../../assets/images/social/bottle.jpg'),
};

export function getSocialCardImage(
  id: string | undefined | null,
): ImageSourcePropType | undefined {
  if (!id) return undefined;
  return SOCIAL_CARD_IMAGES[id];
}
