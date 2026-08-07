import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import {
  getMatchingPreferences,
  saveMatchingPreferences,
  type InterestedInValue,
  type LookingForValue,
} from '../api/matchingPreferences';
import {
  APP_COLORS,
  APP_RADIUS,
  APP_SHADOWS,
  APP_SPACING,
} from '../theme/appTheme';

const INTERESTED_IN_OPTIONS: Array<{ value: InterestedInValue; label: string; icon: string }> = [
  { value: 'HOMME', label: 'Hommes', icon: '♂️' },
  { value: 'FEMME', label: 'Femmes', icon: '♀️' },
  { value: 'AUTRE', label: 'Autres identités', icon: '✨' },
];

const LOOKING_FOR_OPTIONS: Array<{ value: LookingForValue; label: string; description: string }> = [
  { value: 'AMITIE', label: 'Des affinités, d’abord', description: 'Créer du lien sans pression.' },
  { value: 'DISCUSSION', label: 'Discuter', description: 'Échanger et voir où cela mène.' },
  { value: 'FLIRT', label: 'Rien de trop sérieux', description: 'Une rencontre légère et spontanée.' },
  { value: 'RELATION', label: 'Voir ce qui se passe', description: 'Ouvert·e à une vraie rencontre.' },
  { value: 'SERIEUX', label: 'Une relation sérieuse', description: 'Construire quelque chose de durable.' },
];

export default function MatchingPreferencesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [interestedIn, setInterestedIn] = useState<InterestedInValue[]>([]);
  const [lookingFor, setLookingFor] = useState<LookingForValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMatchingPreferences()
      .then((data) => {
        setInterestedIn(data.interestedIn);
        setLookingFor(data.lookingFor);
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger tes préférences.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterestedIn = (value: InterestedInValue) => {
    setInterestedIn((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleLookingFor = (value: LookingForValue) => {
    setLookingFor((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleSave = async () => {
    if (saving) return;
    if (interestedIn.length === 0) {
      Alert.alert('À compléter', 'Choisis au moins un type de profil qui t’intéresse.');
      return;
    }
    if (lookingFor.length === 0) {
      Alert.alert('À compléter', 'Choisis au moins une intention de rencontre.');
      return;
    }

    try {
      setSaving(true);
      await saveMatchingPreferences({ interestedIn, lookingFor });
      Alert.alert('Préférences enregistrées', 'Tes préférences de rencontre ont été mises à jour.');
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
          <Text style={styles.title}>Préférences de rencontre</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Ces choix servent à mieux comprendre ce que tu recherches. Ils restent modifiables à tout moment.
        </Text>

        <Text style={styles.sectionTitle}>QUI T’INTÉRESSE ?</Text>
        <View style={styles.card}>
          {INTERESTED_IN_OPTIONS.map((option, index) => {
            const selected = interestedIn.includes(option.value);
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionRow, index < INTERESTED_IN_OPTIONS.length - 1 && styles.optionBorder]}
                onPress={() => toggleInterestedIn(option.value)}
                activeOpacity={0.75}
              >
                <Text style={styles.optionIcon}>{option.icon}</Text>
                <Text style={styles.optionLabel}>{option.label}</Text>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <Text style={styles.sectionTitle}>CE QUE TU RECHERCHES</Text>
        <View style={styles.card}>
          {LOOKING_FOR_OPTIONS.map((option, index) => {
            const selected = lookingFor.includes(option.value);
            return (
              <TouchableOpacity
                key={option.value}
                style={[styles.optionRow, styles.optionRowTall, index < LOOKING_FOR_OPTIONS.length - 1 && styles.optionBorder]}
                onPress={() => toggleLookingFor(option.value)}
                activeOpacity={0.75}
              >
                <View style={styles.optionCopy}>
                  <Text style={styles.optionLabel}>{option.label}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <View style={[styles.checkbox, selected && styles.checkboxSelected]}>
                  {selected ? <Text style={styles.checkboxMark}>✓</Text> : null}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.noteCard}>
          <Text style={styles.noteIcon}>ℹ️</Text>
          <Text style={styles.noteText}>
            Les filtres d’âge ou de ville ne sont pas enregistrés ici pour l’instant : le backend ne les stocke pas encore comme préférences permanentes.
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
            <Text style={styles.saveButtonText}>Enregistrer mes préférences</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  title: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 48 },
  intro: { fontSize: 13, lineHeight: 20, color: APP_COLORS.muted, marginBottom: APP_SPACING.lg },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: APP_COLORS.muted,
    marginBottom: APP_SPACING.sm,
  },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    overflow: 'hidden',
    marginBottom: APP_SPACING.lg,
    ...(APP_SHADOWS.card ?? {}),
  },
  optionRow: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: APP_SPACING.md,
    paddingVertical: 12,
  },
  optionRowTall: { minHeight: 72 },
  optionBorder: { borderBottomWidth: 1, borderBottomColor: APP_COLORS.paperSoft },
  optionIcon: { width: 34, fontSize: 21 },
  optionCopy: { flex: 1, paddingRight: 12 },
  optionLabel: { flex: 1, fontSize: 14, fontWeight: '700', color: APP_COLORS.ink },
  optionDescription: { fontSize: 11, lineHeight: 16, color: APP_COLORS.muted, marginTop: 3 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: APP_COLORS.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: { backgroundColor: APP_COLORS.burgundy, borderColor: APP_COLORS.burgundy },
  checkboxMark: { fontSize: 13, fontWeight: '900', color: APP_COLORS.white },
  noteCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.lg,
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
