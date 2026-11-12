import React, { useState } from 'react';
import { Modal, Text, View } from 'react-native';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { resetAdminTwoFactor } from '../../api/admin';
import { APP_COLORS } from '../../theme/appTheme';
import {
  SecurityButton,
  SecurityCard,
  SecurityField,
  SecurityText,
  confirmAction,
  showInfo,
} from '../../components/security/SecurityScaffold';

export interface ResetTwoFactorTarget {
  id: string;
  email: string;
  pseudo?: string | null;
}

/**
 * Réinitialisation de la double authentification d'un ADMIN par l'OWNER.
 * Vérification renforcée : mot de passe ET code de l'OWNER, adresse du compte
 * retapée, motif obligatoire, puis dernière confirmation. L'action est tracée
 * dans le journal d'audit côté serveur.
 */
export default function ResetTwoFactorPanel(props: {
  target: ResetTwoFactorTarget;
  onClose: () => void;
  onDone: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { target } = props;
  const [reason, setReason] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [typedEmail, setTypedEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const emailMatches = typedEmail.trim().toLowerCase() === target.email.toLowerCase();
  const canSubmit = reason.trim().length >= 3 && password.length > 0 && code.trim().length >= 6 && emailMatches && !busy;
  const label = target.pseudo ? `${target.pseudo} (${target.email})` : target.email;

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      await resetAdminTwoFactor(target.id, {
        password,
        code: code.trim(),
        reason: reason.trim(),
        confirmEmail: typedEmail.trim(),
      });
      showInfo(
        'Double authentification réinitialisée',
        `Les sessions de ${target.email} ont été fermées et l’administrateur a été prévenu. Il devra la reconfigurer à sa prochaine connexion.`,
        props.onDone,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Réinitialisation impossible.');
    } finally {
      setBusy(false);
    }
  };

  const askConfirmation = () =>
    confirmAction(
      'Dernière confirmation',
      `Réinitialiser la double authentification de ${label} ? Ses sessions seront fermées immédiatement. Cette action est enregistrée dans le journal d’audit.`,
      'Réinitialiser',
      () => void submit(),
    );

  return (
    <Modal visible animationType="slide" transparent onRequestClose={props.onClose}>
      <KeyboardAvoidingView style={styles.backdrop} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[styles.sheet, { paddingTop: insets.top + 8 }]}>
          <ScrollView
            contentContainerStyle={{ padding: 16, paddingBottom: 32 + insets.bottom }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Réinitialiser la double authentification</Text>
            <Text style={styles.target}>{label}</Text>

            <SecurityCard title="Ce qui va se passer">
              <SecurityText>• Sa double authentification est effacée, ainsi que ses codes de secours.</SecurityText>
              <SecurityText>• Tous ses appareils sont déconnectés.</SecurityText>
              <SecurityText>• Son rôle et ses données ne changent pas.</SecurityText>
              <SecurityText>• Il est prévenu, et doit la reconfigurer à sa prochaine connexion. Si le délai est dépassé, l’administration reste bloquée pour lui jusque-là.</SecurityText>
              <SecurityText>• Ton nom, la date et ton motif sont inscrits au journal d’audit.</SecurityText>
            </SecurityCard>

            <SecurityCard title="Vérification de ton identité">
              <SecurityField label="Motif (obligatoire)" value={reason} onChangeText={setReason} autoCapitalize="sentences" />
              <SecurityField label="Ton mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
              <SecurityField
                label="Ton code de vérification (ou un code de secours)"
                value={code}
                onChangeText={setCode}
                autoCapitalize="characters"
              />
              <SecurityField
                label={`Retape l’adresse du compte : ${target.email}`}
                value={typedEmail}
                onChangeText={setTypedEmail}
                keyboardType="email-address"
              />
              {typedEmail.length > 0 && !emailMatches ? (
                <SecurityText tone="error">Cette adresse ne correspond pas à celle du compte.</SecurityText>
              ) : null}
              {error ? <SecurityText tone="error">{error}</SecurityText> : null}
              <SecurityButton tone="danger" label="Réinitialiser" onPress={askConfirmation} disabled={!canSubmit} loading={busy} />
              <SecurityButton tone="secondary" label="Annuler" onPress={props.onClose} disabled={busy} />
            </SecurityCard>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { maxHeight: '94%', backgroundColor: APP_COLORS.background, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 20, fontWeight: '900', color: APP_COLORS.ink, textAlign: 'center' },
  target: { fontSize: 13, color: APP_COLORS.muted, textAlign: 'center', marginTop: 4, marginBottom: 12 },
});
