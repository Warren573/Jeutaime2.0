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
import { deleteAccountPermanently } from '../api/accountLifecycle';
import { useStore } from '../store/useStore';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

export default function DeleteAccountScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useStore(s => s.logout);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canDelete = password.trim().length > 0 && confirmation.trim() === 'SUPPRIMER' && !submitting;

  const performDelete = async () => {
    if (!canDelete) return;
    setSubmitting(true);
    try {
      await deleteAccountPermanently(password);
      await logout();
      router.replace('/login');
    } catch (err) {
      Alert.alert(
        'Suppression impossible',
        err instanceof Error ? err.message : 'Une erreur est survenue.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = () => {
    if (!canDelete) return;
    const message =
      'Cette action est définitive. Ton compte, ton profil, tes lettres, tes matchs, tes pièces et tes photos seront supprimés.';

    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(message)) {
        void performDelete();
      }
      return;
    }

    Alert.alert(
      'Supprimer définitivement ?',
      message,
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Supprimer', style: 'destructive', onPress: () => void performDelete() },
      ],
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>ZONE SENSIBLE</Text>
          <Text style={styles.title}>Supprimer mon compte</Text>
          <Text style={styles.subtitle}>Cette action est définitive et ne peut pas être annulée.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
          <Text style={styles.warningIcon}>🗑️</Text>
          <View style={styles.warningBody}>
            <Text style={styles.warningTitle}>Ce qui sera supprimé</Text>
            <Text style={styles.warningText}>• ton compte et ton profil ;</Text>
            <Text style={styles.warningText}>• tes lettres et tes matchs ;</Text>
            <Text style={styles.warningText}>• ton portefeuille et son historique ;</Text>
            <Text style={styles.warningText}>• tes offrandes et interactions liées ;</Text>
            <Text style={styles.warningText}>• tes photos enregistrées, y compris les fichiers physiques ;</Text>
            <Text style={styles.warningText}>• les autres données directement rattachées à ton compte.</Text>
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

          <Text style={[styles.label, styles.secondLabel]}>Confirmation</Text>
          <Text style={styles.helper}>Écris exactement SUPPRIMER pour déverrouiller le bouton.</Text>
          <TextInput
            value={confirmation}
            onChangeText={setConfirmation}
            autoCapitalize="characters"
            autoCorrect={false}
            placeholder="SUPPRIMER"
            placeholderTextColor={APP_COLORS.muted}
            style={styles.input}
            editable={!submitting}
          />
        </View>

        <TouchableOpacity
          style={[styles.deleteBtn, !canDelete && styles.deleteBtnDisabled]}
          onPress={confirmDelete}
          disabled={!canDelete}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.deleteText}>Supprimer définitivement</Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Si tu veux seulement faire une pause, utilise plutôt « Désactiver mon compte ».
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
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: '#B23A3A' },
  title: { fontSize: 21, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, lineHeight: 17, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: '#FFF4F4',
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: '#E6B8B8',
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  warningIcon: { fontSize: 28, marginRight: 12 },
  warningBody: { flex: 1 },
  warningTitle: { fontSize: 15, fontWeight: '900', color: '#8F2F2F', marginBottom: 8 },
  warningText: { fontSize: 12, lineHeight: 19, color: '#7A4A4A', marginBottom: 3 },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  label: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 8 },
  secondLabel: { marginTop: 16 },
  helper: { fontSize: 11, lineHeight: 16, color: APP_COLORS.muted, marginBottom: 8 },
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
  deleteBtn: {
    marginTop: APP_SPACING.lg,
    borderRadius: APP_RADIUS.md,
    backgroundColor: '#B23A3A',
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  deleteBtnDisabled: { opacity: 0.35 },
  deleteText: { color: '#FFF', fontSize: 14, fontWeight: '900' },
  footerNote: { marginTop: 14, fontSize: 11, lineHeight: 16, textAlign: 'center', color: APP_COLORS.muted },
});
