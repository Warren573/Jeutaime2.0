import React, { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardEvent,
  Modal,
  PixelRatio,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { useStore } from '../store/useStore';
import { getResponsiveScale } from '../utils/responsive';
import { computeKeyboardOverlap } from '../utils/keyboardInset';
import { APP_COLORS } from '../theme/appTheme';
import { ModalKeyboardFrame } from '../components/ModalKeyboardFrame';
import {
  isModalMeasurementsEnabled,
  setModalMeasurementsEnabled,
  subscribeModalMeasurements,
} from '../dev/modalMeasurements';

/**
 * Diagnostic d'affichage (lecture seule, aucun appel réseau, aucune écriture).
 *
 * Objectif : relever sur les appareils de référence (Galaxy A16, iPhone 16e)
 * les valeurs réelles qui conditionnent la mise en page avant toute correction :
 * dimensions, marges système, coefficient de mise à l'échelle global
 * (app/_layout.tsx), taille de police système et comportement du clavier.
 *
 * Cet écran n'est PAS exclu de la mise à l'échelle globale : il mesure donc
 * exactement les conditions des écrans ordinaires (connexion, inscription…).
 */

const fmt = (n: number | null | undefined, digits = 1) =>
  n === null || n === undefined || Number.isNaN(n) ? '—' : Number(n.toFixed(digits)).toString();

type KeyboardSample = {
  height: number;
  screenY: number;
  windowHeightAtShow: number;
  inputBottomInWindow: number | null;
};

export default function DisplayDiagnosticsScreen() {
  const router = useRouter();
  const role = useStore((s) => s.currentUser?.role);
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();
  const screen = Dimensions.get('screen');
  const responsive = getResponsiveScale(window.width, window.height);

  const rootRef = useRef<View>(null);
  const inputRef = useRef<View>(null);
  const [rootLayout, setRootLayout] = useState<{ w: number; h: number } | null>(null);
  const [rootInWindow, setRootInWindow] = useState<{ w: number; h: number } | null>(null);
  const [windowHeightNoKeyboard, setWindowHeightNoKeyboard] = useState<number>(window.height);
  const [keyboard, setKeyboard] = useState<KeyboardSample | null>(null);
  const [modalTestOpen, setModalTestOpen] = useState(false);
  const modalMeasurementsOn = useSyncExternalStore(
    subscribeModalMeasurements,
    isModalMeasurementsEnabled,
    isModalMeasurementsEnabled,
  );
  // Hauteur du clavier actuellement ouvert (0 si fermé) : sert uniquement à
  // prolonger la zone de défilement pour que toutes les mesures restent lisibles.
  const [openKeyboardHeight, setOpenKeyboardHeight] = useState(0);

  const isStaff = role === 'OWNER' || role === 'ADMIN' || role === 'MODERATOR';

  const measureRoot = useCallback(() => {
    rootRef.current?.measureInWindow((_x, _y, w, h) => setRootInWindow({ w, h }));
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      const windowHeightAtShow = Dimensions.get('window').height;
      setOpenKeyboardHeight(e.endCoordinates.height);
      inputRef.current?.measureInWindow((_x, y, _w, h) => {
        setKeyboard({
          height: e.endCoordinates.height,
          screenY: e.endCoordinates.screenY,
          windowHeightAtShow,
          inputBottomInWindow: y + h,
        });
      });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => {
      setOpenKeyboardHeight(0);
      setWindowHeightNoKeyboard(Dimensions.get('window').height);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  if (!isStaff) {
    return (
      <View style={[styles.root, { paddingTop: insets.top + 16 }]}>
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.muted}>{"Écran réservé à l'administration."}</Text>
      </View>
    );
  }

  const rows: [string, string][] = [
    ['Plateforme', `${Platform.OS} ${String(Platform.Version)}`],
    ['Fenêtre (dp/pt)', `${fmt(window.width)} × ${fmt(window.height)}`],
    ['Écran (dp/pt)', `${fmt(screen.width)} × ${fmt(screen.height)}`],
    ['Densité (PixelRatio)', fmt(PixelRatio.get(), 3)],
    ['Police système (fontScale)', fmt(PixelRatio.getFontScale(), 3)],
    ['Marges sûres haut / bas', `${fmt(insets.top)} / ${fmt(insets.bottom)}`],
    ['Marges sûres gauche / droite', `${fmt(insets.left)} / ${fmt(insets.right)}`],
    ['StatusBar.currentHeight (Android)', fmt(StatusBar.currentHeight ?? null)],
    ['Échelle globale (référence 390×844)', fmt(responsive.scale, 4)],
    ['Échelle largeur / hauteur', `${fmt(responsive.widthScale, 4)} / ${fmt(responsive.heightScale, 4)}`],
    ['Zone logique mise à l\'échelle', `${fmt(responsive.logicalWidth)} × ${fmt(responsive.logicalHeight)}`],
    ['Cet écran : mise en page (onLayout)', rootLayout ? `${fmt(rootLayout.w)} × ${fmt(rootLayout.h)}` : '—'],
    ['Cet écran : à l\'affichage (measureInWindow)', rootInWindow ? `${fmt(rootInWindow.w)} × ${fmt(rootInWindow.h)}` : '—'],
    ['Clavier ouvert maintenant', openKeyboardHeight > 0 ? 'oui' : 'non'],
    ['Hauteur fenêtre sans clavier', fmt(windowHeightNoKeyboard)],
    ['Clavier : hauteur', keyboard ? fmt(keyboard.height) : 'toucher le champ ci-dessus'],
    ['Clavier : bord haut (screenY)', keyboard ? fmt(keyboard.screenY) : '—'],
    ['Hauteur fenêtre clavier ouvert', keyboard ? fmt(keyboard.windowHeightAtShow) : '—'],
    ['Bas du champ (fenêtre)', keyboard ? fmt(keyboard.inputBottomInWindow) : '—'],
    [
      'Compensation clavier à la racine (Android)',
      keyboard && Platform.OS === 'android'
        ? fmt(computeKeyboardOverlap(keyboard.windowHeightAtShow, keyboard.screenY))
        : Platform.OS === 'android' ? '—' : 'sans objet',
    ],
  ];

  return (
    <View
      ref={rootRef}
      style={styles.root}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setRootLayout({ w: width, h: height });
        measureRoot();
      }}
    >
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 12,
          // Clavier ouvert : la zone défilable est prolongée de la hauteur du clavier
          // pour que la dernière mesure puisse remonter au-dessus de celui-ci.
          paddingBottom: insets.bottom + 24 + openKeyboardHeight,
          paddingHorizontal: 16,
        }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
      >
        <AppBackButton onPress={() => router.back()} />
        <Text style={styles.title}>{"Diagnostic d'affichage"}</Text>
        <Text style={styles.muted}>
          {"Lecture seule. Faites une capture d'écran clavier fermé, puis touchez le champ et faites une seconde capture clavier ouvert (faites défiler pour voir toutes les mesures)."}
        </Text>

        <View ref={inputRef} collapsable={false} style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            placeholder="Touchez ici pour ouvrir le clavier"
            placeholderTextColor={APP_COLORS.muted}
            onFocus={measureRoot}
          />
        </View>

        <TouchableOpacity style={styles.modalTestBtn} onPress={() => setModalTestOpen(true)}>
          <Text style={styles.modalTestBtnText}>Tester le clavier dans une fenêtre Modal</Text>
        </TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>
            {"Afficher les mesures dans les fenêtres Modal (lettres, bouteilles). Désactivé au prochain redémarrage."}
          </Text>
          <Switch value={modalMeasurementsOn} onValueChange={setModalMeasurementsEnabled} />
        </View>

        <View style={styles.card}>
          {rows.map(([label, value]) => (
            <View key={label} style={styles.row}>
              <Text style={styles.label}>{label}</Text>
              <Text style={styles.value}>{value}</Text>
            </View>
          ))}
        </View>

      </ScrollView>

      <Modal visible={modalTestOpen} animationType="slide" onRequestClose={() => setModalTestOpen(false)}>
        <ModalKeyboardFrame>
          {(modalInsets) => (
            <ModalKeyboardTest insetsTop={modalInsets.top} insetsBottom={modalInsets.bottom} onClose={() => setModalTestOpen(false)} />
          )}
        </ModalKeyboardFrame>
      </Modal>
    </View>
  );
}

/**
 * Test dans une fenêtre Modal (même mécanisme que la rédaction des lettres et
 * la réponse aux bouteilles). Le champ est volontairement EN BAS : s'il reste
 * visible au-dessus du clavier, le cadre ModalKeyboardFrame fonctionne.
 */
function ModalKeyboardTest({
  insetsTop,
  insetsBottom,
  onClose,
}: {
  insetsTop: number;
  insetsBottom: number;
  onClose: () => void;
}) {
  const [events, setEvents] = useState(0);
  const [last, setLast] = useState<{ height: number; screenY: number } | null>(null);
  const [usable, setUsable] = useState<{ w: number; h: number } | null>(null);

  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', (e: KeyboardEvent) => {
      setEvents((n) => n + 1);
      setLast({ height: e.endCoordinates.height, screenY: e.endCoordinates.screenY });
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setLast(null));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);

  const rows: [string, string][] = [
    ['Événements « clavier ouvert » reçus', String(events)],
    ['Clavier : hauteur', last ? fmt(last.height) : '—'],
    ['Clavier : bord haut (screenY)', last ? fmt(last.screenY) : '—'],
    ['Zone utile de la Modal (onLayout)', usable ? `${fmt(usable.w)} × ${fmt(usable.h)}` : '—'],
    ['Marges sûres haut / bas (Modal)', `${fmt(insetsTop)} / ${fmt(insetsBottom)}`],
  ];

  return (
    <View
      style={[styles.root, { paddingTop: insetsTop + 12, paddingBottom: Math.max(insetsBottom, 8), paddingHorizontal: 16 }]}
      onLayout={(e) => setUsable({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
    >
      <AppBackButton onPress={onClose} label="Fermer" />
      <Text style={styles.title}>{'Clavier dans une fenêtre Modal'}</Text>
      <Text style={styles.muted}>
        {"Touchez le champ en bas. Il doit rester visible au-dessus du clavier. Faites une capture clavier ouvert."}
      </Text>
      <View style={styles.card}>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={styles.label}>{label}</Text>
            <Text style={styles.value}>{value}</Text>
          </View>
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <TextInput
        style={styles.input}
        placeholder="Champ en bas de la Modal"
        placeholderTextColor={APP_COLORS.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: APP_COLORS.background },
  title: { fontSize: 20, fontWeight: '700', color: APP_COLORS.ink, marginTop: 12, marginBottom: 4 },
  muted: { fontSize: 13, color: APP_COLORS.muted, marginBottom: 12 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderColor: APP_COLORS.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 7,
    borderBottomColor: APP_COLORS.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  label: { flex: 1, fontSize: 13, color: APP_COLORS.text },
  value: { fontSize: 13, fontWeight: '700', color: APP_COLORS.ink, textAlign: 'right' },
  inputWrap: { marginBottom: 12 },
  modalTestBtn: {
    marginBottom: 12,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: APP_COLORS.burgundy,
  },
  modalTestBtnText: { color: APP_COLORS.white, fontSize: 14, fontWeight: '700' },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  switchLabel: { flex: 1, fontSize: 13, color: APP_COLORS.text },
  input: {
    borderColor: APP_COLORS.borderStrong,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: APP_COLORS.ink,
    backgroundColor: APP_COLORS.white,
  },
});
