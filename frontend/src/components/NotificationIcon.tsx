import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { NotificationIconName } from '../utils/notificationsView';

/** Icônes au trait fin (même famille que la barre d'onglets) : un dessin par catégorie. */
export function NotificationIcon({ name, size = 20, color }: { name: NotificationIconName; size?: number; color: string }) {
  const common = { fill: 'none' as const, stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'letter' && (
        <>
          <Rect x="3" y="6" width="18" height="12.5" rx="1.6" {...common} />
          <Path d="M3.6 7.4 12 13.6l8.4-6.2" {...common} />
        </>
      )}
      {name === 'heart' && <Path d="M12 20.2s-7.4-4.6-7.4-10.4A4.1 4.1 0 0 1 12 7.4a4.1 4.1 0 0 1 7.4 2.4c0 5.8-7.4 10.4-7.4 10.4z" {...common} />}
      {name === 'lock' && (
        <>
          <Rect x="5" y="10.5" width="14" height="9.5" rx="2" {...common} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...common} />
          <Circle cx="12" cy="15.2" r="1.1" fill={color} />
        </>
      )}
      {name === 'gift' && (
        <>
          <Rect x="4" y="10.5" width="16" height="9.5" rx="1.2" {...common} />
          <Rect x="3" y="7.2" width="18" height="3.3" rx="1" {...common} />
          <Path d="M12 7.2V20" {...common} />
          <Path d="M12 7.2S9.8 3.6 8 5s1.3 2.2 4 2.2zM12 7.2s2.2-3.6 4-2.2-1.3 2.2-4 2.2z" {...common} />
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
      {name === 'bottle' && (
        <>
          <Path d="M10 3.2h4v2.7l1.3 2.4c.5.9.7 1.8.7 2.8V19a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-7.9c0-1 .2-1.9.7-2.8L10 5.9V3.2z" {...common} />
          <Path d="M8.4 13.4h7.2" {...common} />
        </>
      )}
      {name === 'duel' && (
        <>
          <Path d="M4 4l11 11M20 4 9 15" {...common} />
          <Path d="M12.2 17.8 17.8 12.2M6.2 12.2l5.6 5.6" {...common} />
          <Path d="M15 15l4.6 4.6M9 15l-4.6 4.6" {...common} />
        </>
      )}
      {name === 'refuge' && (
        <>
          <Path d="M3.6 11.2 12 4l8.4 7.2" {...common} />
          <Path d="M5.8 9.8V19a1 1 0 0 0 1 1h10.4a1 1 0 0 0 1-1V9.8" {...common} />
          <Path d="M12 16.4c-2-1.3-3-2.3-3-3.5a1.7 1.7 0 0 1 3-1 1.7 1.7 0 0 1 3 1c0 1.2-1 2.2-3 3.5z" {...common} />
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
