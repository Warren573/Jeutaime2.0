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
import * as Haptics from 'expo-haptics';
import { AppBackButton } from '../components/AppBackButton';
import {
  getUserSettings,
  updateUserSettings,
  type UserSettingsDTO,
} from '../api/userSettings';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

type ToggleKey = 'notifPush' | 'notifEmail' | 'soundEnabled' | 'vibrationEnabled';

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [settings, setSettings] = useState<UserSettingsDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<ToggleKey | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setSettings(await getUserSettings());
    } catch (err) {
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Impossible de charger les notifications.',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = async (key: ToggleKey, value: boolean) => {
    if (!settings || savingKey) return;
    const previous = settings;
    setSettings({ ...settings, [key]: value });
    setSavingKey(key);

    try {
      const updated = await updateUserSettings({ [key]: value });
      setSettings(updated);

      if (key === 'vibrationEnabled' && value) {
        void Haptics.selectionAsync().catch(() => {});
      }
    } catch (err) {
      setSettings(previous);
      Alert.alert(
        'Erreur',
        err instanceof Error ? err.message : 'Modification impossible.',
      );
    } finally {
      setSavingKey(null);
    }
  };

  const rows: Array<{
    key: ToggleKey;
    title: string;
    description: string;
  }> = [
    {
      key: 'notifPush',
      title: 'Notifications push',
      description: 'Lettres, interactions et informations importantes sur ton compte.',
    },
    {
      key: 'notifEmail',
      title: 'Notifications par e-mail',
      description: 'Autorise JeuTaime à t’envoyer les e-mails liés à ton activité.',
    },
    {
      key: 'soundEnabled',
      title: 'Sons',
      description: 'Active ou coupe les sons des notifications JeuTaime.',
    },
    {
      key: 'vibrationEnabled',
      title: 'Vibrations',
      description: 'Active ou coupe les vibrations utilisées par JeuTaime.',
    },
  ];

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>NOTIFICATIONS</Text>
          <Text style={styles.title}>Notifications</Text>
          <Text style={styles.subtitle}>
            Choisis simplement ce que tu veux recevoir.
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading || !settings ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: Math.max(insets.bottom, 20) + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            {rows.map((row, index) => (
              <View key={row.key}>
                <View style={styles.row}>
                  <View style={styles.rowText}>
                    <Text style={styles.rowTitle}>{row.title}</Text>
                    <Text style={styles.rowDescription}>{row.description}</Text>
                  </View>
                  <Switch
                    value={settings[row.key]}
                    onValueChange={(value) => void toggle(row.key, value)}
                    disabled={savingKey !== null}
                  />
                </View>
                {index < rows.length - 1 ? <View style={styles.divider} /> : null}
              </View>
            ))}
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoText}>
              Ces réglages sont enregistrés sur ton compte et sont donc conservés
              lorsque tu changes de téléphone.
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
  headerText: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.sm,
  },
  headerSpacer: { width: 52 },
  kicker: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 2,
    color: APP_COLORS.muted,
  },
  title: {
    fontSize: 24,
    fontWeight: '900',
    color: APP_COLORS.ink,
    marginTop: 2,
  },
  subtitle: {
    fontSize: 12,
    color: APP_COLORS.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: APP_SPACING.md,
  },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: APP_SPACING.md,
  },
  rowText: {
    flex: 1,
    paddingRight: APP_SPACING.md,
  },
  rowTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: APP_COLORS.ink,
  },
  rowDescription: {
    fontSize: 12,
    lineHeight: 18,
    color: APP_COLORS.muted,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: APP_COLORS.border,
  },
  infoCard: {
    marginTop: APP_SPACING.md,
    padding: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoText: {
    fontSize: 12,
    lineHeight: 18,
    color: APP_COLORS.muted,
    textAlign: 'center',
  },
});
