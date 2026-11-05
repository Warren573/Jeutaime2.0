/**
 * Style appliqué au contenu des écrans mis à l'échelle (app/_layout.tsx).
 *
 * Cause du décalage corrigé : react-native-screens applique au contenu
 * [{ flex: 1 }, contentStyle] (ScreenStackItem.tsx:77-79, 168-169). Avec
 * flex: 1, la hauteur explicite demandée par la mise à l'échelle est ignorée
 * et remplacée par celle du parent. Galaxy A17 : hauteur demandée
 * 832 / 0,9846 = 845 unités, hauteur obtenue 832 unités, soit 819,2 dp
 * affichés au lieu de 832 : il manque 12,8 dp en bas et la barre d'onglets
 * remonte d'autant (mesuré : onLayout 390×832, affiché 384×819,2).
 *
 * Android : flex: 0 → la hauteur calculée est respectée, l'écran remplit
 * exactement la zone utile (832 dp sur l'A17, ou jusqu'au clavier).
 * iOS : style inchangé (iPhone 16e : échelle 1, hauteur = parent, aucun effet).
 */
export type ScaledScreenStyle = {
  width: number;
  height: number;
  transform: { scale: number }[];
  transformOrigin: 'left top';
  flex?: 0;
};

export function scaledScreenStyle(params: {
  platform: string;
  logicalWidth: number;
  windowHeight: number;
  keyboardInset: number;
  scale: number;
}): ScaledScreenStyle {
  const { platform, logicalWidth, windowHeight, keyboardInset, scale } = params;
  const style: ScaledScreenStyle = {
    width: logicalWidth,
    // L'échelle reste celle de la fenêtre entière (pas de zoom à l'ouverture
    // du clavier) ; seule la hauteur utile diminue du recouvrement du clavier.
    height: (windowHeight - keyboardInset) / scale,
    transform: [{ scale }],
    transformOrigin: 'left top',
  };
  if (platform === 'android') {
    style.flex = 0;
  }
  return style;
}

/** Hauteur réellement affichée (dp) d'un écran mis à l'échelle. */
export function displayedScreenHeight(params: {
  platform: string;
  requestedLogicalHeight: number;
  parentLogicalHeight: number;
  scale: number;
}): number {
  const { platform, requestedLogicalHeight, parentLogicalHeight, scale } = params;
  // Sans flex: 0 (iOS, inchangé), flex: 1 impose la hauteur du parent.
  const logical = platform === 'android' ? requestedLogicalHeight : parentLogicalHeight;
  return logical * scale;
}
