import { useEffect, useState } from 'react';
import { Keyboard, KeyboardEvent, Platform } from 'react-native';
import { computeKeyboardOverlap } from '../utils/keyboardInset';

/**
 * Android uniquement : hauteur (dp) de la fenêtre recouverte par le clavier.
 *
 * Utilisé une seule fois, à la racine (app/_layout.tsx), pour rétablir le
 * comportement « la zone de l'application se réduit au-dessus du clavier »
 * que tous les écrans supposent, et qu'edge-to-edge a supprimé.
 * Renvoie toujours 0 sur iOS et sur le web (comportement inchangé).
 */
export function useAndroidKeyboardInset(windowHeight: number): number {
  const [keyboardTopY, setKeyboardTopY] = useState<number | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setKeyboardTopY(e.endCoordinates.screenY);
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardTopY(null);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (Platform.OS !== 'android') return 0;
  return computeKeyboardOverlap(windowHeight, keyboardTopY);
}
