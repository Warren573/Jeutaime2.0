import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackButton } from '../components/AppBackButton';
import { deactivateAccount } from '../api/accountLifecycle';
import { useStore } from '../store/useStore';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function DeactivateAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useStore(s => s.logout);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const performDeactivate = async () => {
    if (!password.trim() || submitting) return;
    setSubmitting(true);
    try {
      await deactivateAccount(password);
      await logout();
      router.replace('/login');
    } catch (err) {
      Alert.alert(
        'Impossible de désactiver le compte',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeactivate = () => {
    if (!password.trim()) {
      Alert.alert('Mot de passe requis', 'Entre ton mot de passe pour confirmer la désactivation.');
      return;
    }

    const message =
      'Ton profil sera masqué de la découverte et tes sessions seront fermées. Une prochaine connexion avec ton email et ton mot de passe réactivera automatiquement le compte.';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        void performDeactivate();
      }
      return;
    }

    Alert.alert(
      'Désactiver mon compte ?',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Désactiver', style: 'destructive', onPress: () => void performDeactivate() },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>MON COMPTE</Text>
          <Text style={styles.title}>Désactiver mon compte</Text>
          <Text style={styles.subtitle}>Une pause réversible, sans supprimer tes données.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>⏸️</Text>
          <View style={styles.warningBody}>
            <Text style={styles.warningTitle}>Ce qui se passe</Text>
            <Text style={styles.warningText}>• ton profil disparaît de la découverte ;</Text>
            <Text style={styles.warningText}>• tes sessions ouvertes sont révoquées ;</Text>
            <Text style={styles.warningText}>• tes données, lettres, matchs et pièces sont conservés ;</Text>
            <Text style={styles.warningText}>• une connexion ultérieure réactive automatiquement ton compte.</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Mot de passe actuel</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Ton mot de passe"
            placeholderTextColor={APP_COLORS.muted}
            style={styles.input}
            editable={!submitting}
          />
          <Text style={styles.helper}>
            Il est demandé uniquement pour confirmer que la désactivation vient bien de toi.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.deactivateBtn, (!password.trim() || submitting) && styles.deactivateBtnDisabled]}
          onPress={confirmDeactivate}
          disabled={!password.trim() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.deactivateText}>Désactiver mon compte</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Cette action est différente de la suppression définitive du compte.
        </Text>
      </ScrollView>
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
  title: { fontSize: 21, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 17, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  warningIcon: { fontSize: 28, marginRight: 12 },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 15, fontWeight: '900', color: APP_COLORS.ink, marginBottom: 8 },
  warningText: { fontSize: 12, lineHeight: 19, color: APP_COLORS.muted, marginBottom: 3 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  label: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.background,
    borderRadius: APP_RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: APP_COLORS.ink,
  },
  helper: { fontSize: 11, lineHeight: 16, color: APP_COLORS.muted, marginTop: 8 },
  deactivateBtn: {
    marginTop: APP_SPACING.lg,
    borderRadius: APP_RADIUS.md,
    backgroundColor: '#B23A3A',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  deactivateBtnDisabled: { opacity: 0.45 },
  deactivateText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  footerNote: { marginTop: 14, fontSize: 11, lineHeight: 16, textAlign: 'center', color: APP_COLORS.muted },
});
