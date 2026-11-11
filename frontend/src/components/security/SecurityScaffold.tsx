import React from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppBackButton } from '../AppBackButton';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../../theme/appTheme';

/** Gabarit commun aux écrans de sécurité du compte (même style que « Mot de passe »). */
export function SecurityScaffold(props: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <KeyboardAvoidingView
      style={[styles.screen, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        {props.onBack ? <AppBackButton onPress={props.onBack} /> : <View style={styles.headerSpacer} />}
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SÉCURITÉ</Text>
          <Text style={styles.title}>{props.title}</Text>
          {props.subtitle ? <Text style={styles.subtitle}>{props.subtitle}</Text> : null}
        </View>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: 40 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {props.children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function SecurityCard(props: { title?: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      {props.title ? <Text style={styles.cardTitle}>{props.title}</Text> : null}
      {props.children}
    </View>
  );
}

export function SecurityField(props: TextInputProps & { label: string }) {
  const { label, ...input } = props;
  return (
    <>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        autoCapitalize="none"
        autoCorrect={false}
        placeholderTextColor={APP_COLORS.muted}
        {...input}
      />
    </>
  );
}

export function SecurityButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
}) {
  const tone = props.tone ?? 'primary';
  return (
    <TouchableOpacity
      accessibilityRole="button"
      style={[
        styles.button,
        tone === 'secondary' && styles.buttonSecondary,
        tone === 'danger' && styles.buttonDanger,
        (props.disabled || props.loading) && styles.buttonDisabled,
      ]}
      onPress={props.onPress}
      disabled={props.disabled || props.loading}
    >
      {props.loading ? (
        <ActivityIndicator color={tone === 'secondary' ? APP_COLORS.burgundy : APP_COLORS.white} />
      ) : (
        <Text style={[styles.buttonText, tone === 'secondary' && styles.buttonTextSecondary]}>{props.label}</Text>
      )}
    </TouchableOpacity>
  );
}

export function SecurityText(props: { children: React.ReactNode; tone?: 'muted' | 'error' | 'success' }) {
  return (
    <Text
      style={[
        styles.text,
        props.tone === 'error' && styles.textError,
        props.tone === 'success' && styles.textSuccess,
      ]}
    >
      {props.children}
    </Text>
  );
}

/** Règle de mot de passe identique à celle du serveur (auth.schemas.ts). */
export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 72 && /[a-z]/.test(value) && /[A-Z]/.test(value) && /\d/.test(value);
}

export const PASSWORD_RULES = '8 caractères minimum, avec une majuscule, une minuscule et un chiffre.';

export const securityStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: APP_COLORS.border,
    gap: 10,
  },
  rowTitle: { fontSize: 14, fontWeight: '800', color: APP_COLORS.ink },
  rowMeta: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2 },
  link: { color: APP_COLORS.burgundy, fontWeight: '800', fontSize: 13 },
  code: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    fontSize: 15,
    color: APP_COLORS.ink,
    letterSpacing: 1,
  },
});

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
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  content: { padding: APP_SPACING.md, gap: APP_SPACING.md },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  cardTitle: { fontSize: 15, fontWeight: '900', color: APP_COLORS.ink, marginBottom: 6 },
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
  button: {
    minHeight: 50,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: APP_SPACING.md,
    paddingHorizontal: APP_SPACING.md,
  },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: APP_COLORS.burgundy },
  buttonDanger: { backgroundColor: APP_COLORS.danger },
  buttonDisabled: { opacity: 0.45 },
  buttonText: { color: APP_COLORS.white, fontWeight: '800', fontSize: 15, textAlign: 'center' },
  buttonTextSecondary: { color: APP_COLORS.burgundy },
  text: { fontSize: 13, color: APP_COLORS.muted, lineHeight: 19, marginTop: 6 },
  textError: { color: APP_COLORS.danger },
  textSuccess: { color: APP_COLORS.ink, fontWeight: '700' },
});

/**
 * Confirmation et information compatibles iOS, Android et web.
 * Sur le web, Alert.alert avec boutons n'affiche rien : on utilise la boîte du navigateur,
 * comme l'écran de désactivation du compte.
 */
export function confirmAction(title: string, message: string, confirmLabel: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Annuler', style: 'cancel' },
    { text: confirmLabel, style: 'destructive', onPress: onConfirm },
  ]);
}

export function showInfo(title: string, message: string, onClose?: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
    onClose?.();
    return;
  }
  Alert.alert(title, message, [{ text: 'OK', onPress: onClose }]);
}
