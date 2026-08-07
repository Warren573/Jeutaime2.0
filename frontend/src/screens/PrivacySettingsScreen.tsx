import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { getUserSettings, updateUserSettings, type UserSettingsDTO } from '../api/userSettings';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<UserSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<keyof UserSettingsDTO | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setSettings(await getUserSettings());
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger les réglages.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: 'showInDiscovery' | 'locationShared', value: boolean) => {
    if (!settings || savingKey) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSavingKey(key);
    try {
      setSettings(await updateUserSettings({ [key]: value }));
    } catch (err) {
      setSettings(previous);
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Modification impossible.');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>CONFIDENTIALITÉ</Text>
          <Text style={styles.title}>Visibilité du profil</Text>
          <Text style={styles.subtitle}>Choisis ce que JeuTaime peut montrer dans la découverte.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading || !settings ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Apparaître dans la découverte</Text>
                <Text style={styles.rowDescription}>
                  Désactive ce réglage pour ne plus être proposé aux autres profils.
                </Text>
              </View>
              <Switch
                value={settings.showInDiscovery}
                onValueChange={(value) => void toggle('showInDiscovery', value)}
                disabled={savingKey !== null}
              />
            </View>

            <View style={styles.divider} />

            <View style={styles.row}>
              <View style={styles.rowText}>
                <Text style={styles.rowTitle}>Partager ma localisation</Text>
                <Text style={styles.rowDescription}>
                  Autorise l’utilisation de ta ville comme information de proximité. Aucune position GPS précise n’est stockée ici.
                </Text>
              </View>
              <Switch
                value={settings.locationShared}
                onValueChange={(value) => void toggle('locationShared', value)}
                disabled={savingKey !== null}
              />
            </View>
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={styles.infoText}>
              Ces réglages sont enregistrés sur ton compte et restent appliqués lorsque tu changes d’appareil.
            </Text>
          </View>
        </ScrollView>
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
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: APP_SPACING.md },
  rowText: { flex: 1, paddingRight: APP_SPACING.md },
  rowTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  rowDescription: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted, marginTop: 4 },
  divider: { height: 1, backgroundColor: APP_COLORS.border },
  infoCard: {
    flexDirection: 'row',
    marginTop: APP_SPACING.md,
    padding: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoIcon: { fontSize: 22, marginRight: 10 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
});
