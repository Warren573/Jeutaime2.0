import React from 'react';
import { Image } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { hasPngIcon, type NotificationIconName, type PngIconName } from '../utils/notificationsView';

/**
 * Illustrations PNG de l'identité JeuTaime (déjà présentes dans `assets/ui-icons/`), réutilisées telles quelles.
 * `offering.png` est la version 256 px de l'illustration existante « BOUQUET DE FLEURS » (assets/images/offerings/desk).
 * `duel.png` : deux épées croisées, dessinées pour cette catégorie (aucune illustration d'épées n'existait) ;
 * le trophée (`trophy.png`) est réservé à l'élection du profil de la semaine.
 */
const PNG_ICONS: Record<PngIconName, number> = {
  letter: require('../../assets/ui-icons/book.png'),
  bottle: require('../../assets/ui-icons/bottle.png'),
  heart: require('../../assets/ui-icons/heart.png'),
  duel: require('../../assets/ui-icons/duel.png'),
  gift: require('../../assets/ui-icons/offering.png'),
  refuge: require('../../assets/ui-icons/pet.png'),
};

/** Les illustrations sont plus détaillées que des traits : un peu plus grandes dans le même cercle. */
const PNG_SCALE = 1.4;
/** Notification lue : illustration atténuée (équivalent de la teinte « muted » des icônes au trait). */
const PNG_READ_OPACITY = 0.55;

/**
 * Icône d'une catégorie : illustration PNG quand elle existe, sinon icône au trait fin (même famille que la barre
 * d'onglets). `dimmed` (notification lue) n'agit que sur les illustrations ; les icônes au trait suivent `color`.
 */
export function NotificationIcon({
  name,
  size = 20,
  color,
  dimmed = false,
}: {
  name: NotificationIconName;
  size?: number;
  color: string;
  dimmed?: boolean;
}) {
  if (hasPngIcon(name)) {
    const px = Math.round(size * PNG_SCALE);
    return (
      <Image
        source={PNG_ICONS[name]}
        style={{ width: px, height: px, opacity: dimmed ? PNG_READ_OPACITY : 1 }}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />
    );
  }
  const common = { fill: 'none' as const, stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'lock' && (
        <>
          <Rect x="5" y="10.5" width="14" height="9.5" rx="2" {...common} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...common} />
          <Circle cx="12" cy="15.2" r="1.1" fill={color} />
        </>
      )}
      {name === 'sparkle' && (
        <>
          <Path d="M12 3.5l1.9 5.1 5.1 1.9-5.1 1.9L12 17.5l-1.9-5.1L5 10.5l5.1-1.9L12 3.5z" {...common} />
          <Path d="M18.5 16.5l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z" {...common} />
        </>
      )}
      {name === 'megaphone' && (
        <>
          <Path d="M4 10v4h3.2L15.5 18V6L7.2 10H4z" {...common} />
          <Path d="M18.4 9.4a4.2 4.2 0 0 1 0 5.2" {...common} />
          <Path d="M7.2 14l1 4.4h2.2l-.8-3.7" {...common} />
        </>
      )}
      {name === 'shield' && (
        <>
          <Path d="M12 3l7 3v5.6c0 4.2-3 7.6-7 9.2-4-1.6-7-5-7-9.2V6l7-3z" {...common} />
          <Path d="M9 12.2l2.2 2.2L15.3 10" {...common} />
        </>
      )}
      {name === 'crown' && <Path d="M4 17.5 3.2 8l4.6 4.2L12 6l4.2 6.2L20.8 8 20 17.5H4zM4.5 20h15" {...common} />}
      {name === 'bell' && (
        <>
          <Path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.6 1.7H4.4L6 16.5z" {...common} />
          <Path d="M10 20.4a2.1 2.1 0 0 0 4 0" {...common} />
        </>
      )}
    </Svg>
  );
}

/** Cloche seule (en-tête du Journal). */
export function BellGlyph({ size = 17, color }: { size?: number; color: string }) {
  return <NotificationIcon name="bell" size={size} color={color} />;
}
