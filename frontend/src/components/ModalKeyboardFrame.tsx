import React, { useMemo, useState } from 'react';
import { Platform, View, useWindowDimensions } from 'react-native';
import {
  EdgeInsets,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAndroidKeyboardInset } from '../hooks/useAndroidKeyboardInset';
import { insetsWhileKeyboardOpen } from '../utils/keyboardInset';

/**
 * Cadre à placer comme premier enfant d'une <Modal> contenant un champ de saisie.
 *
 * Pourquoi : sur Android, React Native 0.81 force chaque Modal en edge-to-edge
 * (ReactModalHostView.kt : navigationBarTranslucent forcé quand edge-to-edge est
 * actif). La fenêtre de la Modal n'est donc plus réduite par le clavier
 * (SOFT_INPUT_ADJUST_RESIZE sans effet), et la correction globale de
 * app/_layout.tsx ne s'applique pas : une Modal est une fenêtre native séparée.
 *
 * Ce cadre applique, à l'intérieur de la Modal, exactement la même règle que la
 * racine (OTA 2.0.0-ota.15) :
 *   - marges sûres mesurées pour la fenêtre de la Modal elle-même
 *     (SafeAreaProvider imbriqué) au lieu d'être héritées de l'écran principal ;
 *   - zone utile réduite du recouvrement du clavier ;
 *   - marge du bas à 0 tant que le clavier est ouvert (pas de double compensation).
 *
 * iOS et web : renvoie ses enfants tels quels (arbre de rendu inchangé).
 */
type FrameChildren = React.ReactNode | ((insets: EdgeInsets) => React.ReactNode);

const ZERO_INSETS: EdgeInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Si `children` est une fonction, elle reçoit les marges sûres en vigueur à
 * l'intérieur du cadre (celles de la fenêtre de la Modal sur Android ; sur iOS
 * et web, exactement le contexte existant, comme avant).
 */
function renderChildren(children: FrameChildren) {
  if (typeof children !== 'function') return children;
  return (
    <SafeAreaInsetsContext.Consumer>
      {(insets) => children(insets ?? ZERO_INSETS)}
    </SafeAreaInsetsContext.Consumer>
  );
}

export function ModalKeyboardFrame({ children }: { children: FrameChildren }) {
  if (Platform.OS !== 'android') {
    return <>{renderChildren(children)}</>;
  }
  return <AndroidModalKeyboardFrame>{children}</AndroidModalKeyboardFrame>;
}

function AndroidModalKeyboardFrame({ children }: { children: FrameChildren }) {
  const inheritedInsets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  return (
    <SafeAreaProvider
      style={{ flex: 1 }}
      // Valeurs de départ pour le premier rendu ; remplacées dès la mesure
      // native de la fenêtre de la Modal.
      initialMetrics={{ insets: inheritedInsets, frame: { x: 0, y: 0, width, height } }}
    >
      <KeyboardInsetBoundary fallbackHeight={height}>{children}</KeyboardInsetBoundary>
    </SafeAreaProvider>
  );
}

function KeyboardInsetBoundary({
  children,
  fallbackHeight,
}: {
  children: FrameChildren;
  fallbackHeight: number;
}) {
  // Hauteur réelle de la fenêtre de la Modal (en edge-to-edge : l'écran entier).
  const [modalHeight, setModalHeight] = useState<number | null>(null);
  const keyboardInset = useAndroidKeyboardInset(modalHeight ?? fallbackHeight);
  const insets = useSafeAreaInsets();
  const contentInsets = useMemo(
    () => insetsWhileKeyboardOpen(insets, keyboardInset),
    [insets, keyboardInset],
  );

  return (
    <SafeAreaInsetsContext.Provider value={contentInsets}>
      <View
        style={{ flex: 1, paddingBottom: keyboardInset }}
        onLayout={(e) => setModalHeight(e.nativeEvent.layout.height)}
      >
        {renderChildren(children)}
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}
