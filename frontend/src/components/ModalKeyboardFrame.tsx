import React, { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import {
  EdgeInsets,
  SafeAreaInsetsContext,
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useAndroidKeyboardInset } from '../hooks/useAndroidKeyboardInset';
import { insetsWhileKeyboardOpen } from '../utils/keyboardInset';
import {
  formatModalMeasurements,
  getModalExtraLines,
  isModalMeasurementsEnabled,
  subscribeModalMeasurements,
} from '../dev/modalMeasurements';

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
      <KeyboardInsetBoundary fallbackHeight={height} inheritedInsets={inheritedInsets}>
        {children}
      </KeyboardInsetBoundary>
    </SafeAreaProvider>
  );
}

function KeyboardInsetBoundary({
  children,
  fallbackHeight,
  inheritedInsets,
}: {
  children: FrameChildren;
  fallbackHeight: number;
  inheritedInsets: EdgeInsets;
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
        <ModalMeasurementsPanel
          modalLayoutHeight={modalHeight}
          modalInsets={insets}
          inheritedInsets={inheritedInsets}
          appliedKeyboardInset={keyboardInset}
        />
      </View>
    </SafeAreaInsetsContext.Provider>
  );
}

/**
 * Diagnostic (OWNER/ADMIN/MODERATOR) : affiche, dans la vraie fenêtre Modal,
 * les valeurs qui déterminent la position des boutons du bas. Invisible tant
 * que l'interrupteur n'est pas activé depuis « Diagnostic d'affichage ».
 * Ne bloque aucun toucher (pointerEvents="none").
 */
function ModalMeasurementsPanel({
  modalLayoutHeight,
  modalInsets,
  inheritedInsets,
  appliedKeyboardInset,
}: {
  modalLayoutHeight: number | null;
  modalInsets: EdgeInsets;
  inheritedInsets: EdgeInsets;
  appliedKeyboardInset: number;
}) {
  const enabled = useSyncExternalStore(
    subscribeModalMeasurements,
    isModalMeasurementsEnabled,
    isModalMeasurementsEnabled,
  );
  const extraLines = useSyncExternalStore(
    subscribeModalMeasurements,
    getModalExtraLines,
    getModalExtraLines,
  );
  const [keyboardTopY, setKeyboardTopY] = useState<number | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) =>
      setKeyboardTopY(e.endCoordinates.screenY),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTopY(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [enabled]);

  if (!enabled) return null;

  const baseLines = formatModalMeasurements({
    modalLayoutHeight,
    modalInsets: { top: modalInsets.top, bottom: modalInsets.bottom },
    inheritedInsets: { top: inheritedInsets.top, bottom: inheritedInsets.bottom },
    statusBarHeight: StatusBar.currentHeight ?? null,
    screenHeight: Dimensions.get('screen').height,
    keyboardTopY,
    appliedKeyboardInset,
  });
  const lines = [...baseLines, ...extraLines];

  return (
    <View pointerEvents="none" style={panelStyles.panel}>
      {lines.map((line) => (
        <Text key={line} style={panelStyles.line}>
          {line}
        </Text>
      ))}
    </View>
  );
}

const panelStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 8,
    right: 8,
    top: '45%',
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(20, 10, 5, 0.82)',
    zIndex: 1000,
    elevation: 1000,
  },
  line: { color: '#FFFFFF', fontSize: 11, lineHeight: 15 },
});
