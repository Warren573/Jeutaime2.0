import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { resetPassword } from '../../api/auth';
import {
  PASSWORD_RULES,
  SecurityButton,
  SecurityCard,
  SecurityField,
  SecurityScaffold,
  SecurityText,
  isStrongPassword,
} from '../../components/security/SecurityScaffold';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mismatch = confirm.length > 0 && confirm !== password;
  const canSubmit = Boolean(token) && isStrongPassword(password) && password === confirm;

  const submit = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    setError(null);
    try {
      setDone(await resetPassword(token, password));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Modification impossible.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecurityScaffold title="Nouveau mot de passe" onBack={() => router.replace('/login')}>
      <SecurityCard>
        {!token ? (
          <>
            <SecurityText tone="error">Ce lien est incomplet. Ouvre-le directement depuis l’e-mail reçu.</SecurityText>
            <SecurityButton label="Faire une nouvelle demande" onPress={() => router.replace('/forgot-password')} />
          </>
        ) : done ? (
          <>
            <SecurityText tone="success">{done}</SecurityText>
            <SecurityText>Par sécurité, tous tes appareils ont été déconnectés.</SecurityText>
            <SecurityButton label="Se connecter" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <SecurityField
              label="Nouveau mot de passe"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              textContentType="newPassword"
              autoComplete="password-new"
            />
            <SecurityField
              label="Confirmer le mot de passe"
              value={confirm}
              onChangeText={setConfirm}
              secureTextEntry
              textContentType="newPassword"
            />
            <SecurityText>{PASSWORD_RULES}</SecurityText>
            {mismatch ? <SecurityText tone="error">Les deux mots de passe ne correspondent pas.</SecurityText> : null}
            {error ? <SecurityText tone="error">{error}</SecurityText> : null}
            <SecurityButton label="Enregistrer" onPress={() => void submit()} disabled={!canSubmit} loading={loading} />
            {error ? (
              <SecurityButton
                tone="secondary"
                label="Recevoir un nouveau lien"
                onPress={() => router.replace('/forgot-password')}
              />
            ) : null}
          </>
        )}
      </SecurityCard>
    </SecurityScaffold>
  );
}
