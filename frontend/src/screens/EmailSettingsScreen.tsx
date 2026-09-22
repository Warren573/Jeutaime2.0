import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { changeEmail } from '../api/accountSecurity';
import { useStore } from '../store/useStore';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function EmailSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const currentEmail = useStore((s) => s.currentUser?.email ?? '');
  const logout = useStore((s) => s.logout);
  const [newEmail, setNewEmail] = useState(currentEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const cleanEmail = newEmail.trim().toLowerCase();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail);
  const canSubmit =
    emailValid &&
    cleanEmail !== currentEmail.trim().toLowerCase() &&
    currentPassword.length > 0 &&
    !saving;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      await changeEmail({ currentPassword, newEmail: cleanEmail });
      Alert.alert(
        'Adresse e-mail modifiée',
        'Ton adresse de connexion a été mise à jour. Reconnecte-toi avec la nouvelle adresse.',
        [{
          text: 'Se reconnecter',
          onPress: () => {
            void logout().catch(() => {});
            router.replace('/login');
          },
        }],
      );
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Modification impossible.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>COMPTE</Text>
          <Text style={styles.title}>E-mail</Text>
          <Text style={styles.subtitle}>Modifie ton adresse de connexion.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Adresse e-mail</Text>
          <TextInput
            style={styles.input}
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
          />

          <Text style={styles.label}>Mot de passe actuel</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.note}>
            Pour sécuriser ton compte, toutes les sessions seront fermées après le changement.
          </Text>

          <TouchableOpacity
            style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
            onPress={() => void submit()}
            disabled={!canSubmit}
          >
            {saving ? (
              <ActivityIndicator color={APP_COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Modifier mon e-mail</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2 },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  label: { fontSize: 12, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 6, marginTop: 8 },
  input: {
    minHeight: 48,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.backgroundWarm,
    paddingHorizontal: 14,
    color: APP_COLORS.ink,
    fontSize: 15,
  },
  note: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted, marginTop: APP_SPACING.md },
  saveBtn: {
    minHeight: 50,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: APP_SPACING.lg,
  },
  saveBtnDisabled: { opacity: 0.45 },
  saveText: { color: APP_COLORS.white, fontWeight: '800', fontSize: 15 },
});
