import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { getUserSettings, updateUserSettings } from '../api/userSettings';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function SoundsSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const settings = await getUserSettings();
      setEnabled(settings.soundEnabled);
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger ce réglage.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (value: boolean) => {
    if (saving) return;
    const previous = enabled;
    setEnabled(value);
    setSaving(true);
    try {
      const updated = await updateUserSettings({ soundEnabled: value });
      setEnabled(updated.soundEnabled);
    } catch (err) {
      setEnabled(previous);
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Modification impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>AMBIANCE</Text>
          <Text style={styles.title}>Sons</Text>
          <Text style={styles.subtitle}>Choisis si les effets sonores sont autorisés.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : (
        <View style={styles.content}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.iconWrap}>
                <Text style={styles.icon}>{enabled ? '🔊' : '🔇'}</Text>
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Effets sonores</Text>
                <Text style={styles.rowDescription}>
                  Active ou coupe les sons de l’application lorsque les écrans concernés utilisent ce réglage.
                </Text>
              </View>
              <Switch value={enabled} onValueChange={(value) => void toggle(value)} disabled={saving} />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Les vibrations ne disposent pas encore d’un réglage séparé dans le backend. Je ne les affiche donc pas comme option tant que ce comportement n’est pas réellement pris en charge.
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paper,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: APP_SPACING.md },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconWrap: {
    width: 48,
    height: 48,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  icon: { fontSize: 24 },
  rowText: { flex: 1, paddingRight: 12 },
  rowTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  rowDescription: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted, marginTop: 4 },
  infoCard: {
    marginTop: APP_SPACING.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
  },
  infoText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
});
