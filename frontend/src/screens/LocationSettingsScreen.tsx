import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { apiFetch } from '../api/client';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

export default function LocationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/profiles/me')
      .then((res) => {
        setCity(res?.data?.city ?? '');
        setPostalCode(res?.data?.postalCode ?? '');
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger ta localisation.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const cleanCity = city.trim();
    const cleanPostalCode = postalCode.trim();

    if (!cleanCity) {
      Alert.alert('Ville requise', 'Indique au moins ta ville.');
      return;
    }

    try {
      setSaving(true);
      await apiFetch('/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({
          city: cleanCity,
          ...(cleanPostalCode ? { postalCode: cleanPostalCode } : {}),
        }),
      });
      Alert.alert('Localisation enregistrée', 'Ta ville a bien été mise à jour.');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.screen, styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>MON PROFIL</Text>
          <Text style={styles.title}>Localisation</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.content}>
        <Text style={styles.intro}>
          JeuTaime utilise ta ville pour contextualiser les profils. Aucune position GPS précise n’est enregistrée ici.
        </Text>

        <View style={styles.card}>
          <Text style={styles.label}>Ville</Text>
          <TextInput
            style={styles.input}
            value={city}
            onChangeText={setCity}
            placeholder="Ex. Lille"
            placeholderTextColor={APP_COLORS.muted}
            autoCapitalize="words"
            maxLength={100}
          />

          <Text style={[styles.label, styles.secondLabel]}>Code postal</Text>
          <TextInput
            style={styles.input}
            value={postalCode}
            onChangeText={setPostalCode}
            placeholder="Ex. 59000"
            placeholderTextColor={APP_COLORS.muted}
            keyboardType="number-pad"
            maxLength={10}
          />
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>🔒</Text>
          <Text style={styles.noteText}>
            Pas de coordonnées GPS, pas de rue ni d’adresse exacte : seulement les informations nécessaires au profil.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, saving && styles.saveButtonDisabled]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.82}
        >
          {saving ? (
            <ActivityIndicator color={APP_COLORS.white} />
          ) : (
            <Text style={styles.saveButtonText}>Enregistrer</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: APP_SPACING.sm,
    backgroundColor: APP_COLORS.paper,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
  },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: 8 },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted, marginBottom: 2 },
  title: { fontSize: 21, fontWeight: '900', color: APP_COLORS.ink },
  content: { padding: APP_SPACING.md },
  intro: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, marginBottom: APP_SPACING.lg },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  label: { fontSize: 12, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 7 },
  secondLabel: { marginTop: APP_SPACING.md },
  input: {
    minHeight: 48,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paperSoft,
    paddingHorizontal: 14,
    fontSize: 15,
    color: APP_COLORS.ink,
  },
  noteCard: {
    flexDirection: 'row',
    marginTop: APP_SPACING.md,
    marginBottom: APP_SPACING.lg,
    padding: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  noteIcon: { fontSize: 18, marginRight: 10 },
  noteText: { flex: 1, fontSize: 11, lineHeight: 17, color: APP_COLORS.muted },
  saveButton: {
    minHeight: 52,
    borderRadius: APP_RADIUS.lg,
    backgroundColor: APP_COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    ...(APP_SHADOWS.card ?? {}),
  },
  saveButtonDisabled: { opacity: 0.55 },
  saveButtonText: { fontSize: 15, fontWeight: '800', color: APP_COLORS.white },
});
