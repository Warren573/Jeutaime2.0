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
import { changePassword } from '../api/accountSecurity';
import { useStore } from '../store/useStore';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function PasswordSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useStore((s) => s.logout);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const validNewPassword =
    newPassword.length >= 8 &&
    newPassword.length <= 72 &&
    /[a-z]/.test(newPassword) &&
    /[A-Z]/.test(newPassword) &&
    /\d/.test(newPassword);
  const canSubmit =
    currentPassword.length > 0 &&
    validNewPassword &&
    newPassword === confirmPassword &&
    !saving;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      setSaving(true);
      await changePassword({ currentPassword, newPassword });
      Alert.alert(
        'Mot de passe modifié',
        'Tes autres sessions ont été déconnectées. Reconnecte-toi avec ton nouveau mot de passe.',
        [
          {
            text: 'Se reconnecter',
            onPress: () => {
              void logout().catch(() => {});
              router.replace('/login');
            },
          },
        ],
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
          <Text style={styles.kicker}>SÉCURITÉ</Text>
          <Text style={styles.title}>Mot de passe</Text>
          <Text style={styles.subtitle}>Modifie ton mot de passe de connexion.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.label}>Mot de passe actuel</Text>
          <TextInput
            style={styles.input}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <Text style={styles.label}>Confirmer le nouveau mot de passe</Text>
          <TextInput
            style={styles.input}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />

          <View style={styles.rulesBox}>
            <Text style={styles.rulesTitle}>Le nouveau mot de passe doit contenir :</Text>
            <Text style={styles.rule}>• 8 caractères minimum</Text>
            <Text style={styles.rule}>• une majuscule</Text>
            <Text style={styles.rule}>• une minuscule</Text>
            <Text style={styles.rule}>• un chiffre</Text>
          </View>

          {confirmPassword.length > 0 && newPassword !== confirmPassword ? (
            <Text style={styles.validationError}>Les deux nouveaux mots de passe ne correspondent pas.</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.saveBtn, !canSubmit && styles.saveBtnDisabled]}
            onPress={() => void submit()}
            disabled={!canSubmit}
          >
            {saving ? (
              <ActivityIndicator color={APP_COLORS.white} />
            ) : (
              <Text style={styles.saveText}>Modifier le mot de passe</Text>
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
  rulesBox: {
    backgroundColor: APP_COLORS.paperSoft,
    borderRadius: APP_RADIUS.md,
    padding: APP_SPACING.sm,
    marginTop: APP_SPACING.md,
  },
  rulesTitle: { fontSize: 12, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 5 },
  rule: { fontSize: 12, color: APP_COLORS.muted, lineHeight: 18 },
  validationError: { fontSize: 12, color: APP_COLORS.danger, marginTop: 10 },
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
