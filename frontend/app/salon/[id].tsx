import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouteGuard } from '../../src/components/FeatureGate';
import SalonScreen from '../../src/screens/SalonScreen';

// Expo Router catches rendering errors here instead of leaving an empty page.
// Keep the message readable on web and native, and offer a way to retry.
export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  React.useEffect(() => {
    console.error('[SALON_SCREEN_RENDER_ERROR]', error);
  }, [error]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Impossible d'afficher le salon</Text>
      <Text style={styles.description}>
        Une erreur s'est produite pendant l'ouverture du salon. Vous pouvez réessayer.
      </Text>
      {<Text selectable style={styles.debug}>Détail technique : {String(error?.message || error)}</Text>}
      <TouchableOpacity onPress={retry} style={styles.button}>
        <Text style={styles.buttonText}>Réessayer</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SalonPage() {
  const state = useRouteGuard('salons', '/(tabs)/social');
  if (state === 'hidden') return null;
  return <SalonScreen />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFF8E7', alignItems: 'center', justifyContent: 'center', padding: 24 },
  title: { color: '#432A20', fontSize: 21, fontWeight: '800', textAlign: 'center', marginBottom: 12 },
  description: { color: '#6D5142', fontSize: 15, lineHeight: 22, textAlign: 'center', marginBottom: 18 },
  debug: { color: '#9D2E35', marginBottom: 18, textAlign: 'center' },
  button: { backgroundColor: '#8B2E3C', paddingHorizontal: 24, paddingVertical: 13, borderRadius: 12 },
  buttonText: { color: '#FFF', fontWeight: '700' },
});
