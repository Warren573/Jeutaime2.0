import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { requestPasswordReset } from '../../api/auth';
import {
  SecurityButton,
  SecurityCard,
  SecurityField,
  SecurityScaffold,
  SecurityText,
} from '../../components/security/SecurityScaffold';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const clean = email.trim().toLowerCase();

  const submit = async () => {
    if (!EMAIL_RE.test(clean) || loading) return;
    setLoading(true);
    setError(null);
    try {
      setDone(await requestPasswordReset(clean));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Demande impossible. Réessaie dans un instant.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SecurityScaffold title="Mot de passe oublié" onBack={() => router.back()}>
      <SecurityCard>
        {done ? (
          <>
            <SecurityText tone="success">{done}</SecurityText>
            <SecurityText>
              Ouvre le lien reçu (valable 30 minutes). Pense à regarder dans les courriers indésirables.
            </SecurityText>
            <SecurityButton label="Revenir à la connexion" onPress={() => router.replace('/login')} />
          </>
        ) : (
          <>
            <SecurityText>
              Indique l’adresse e-mail de ton compte. Tu recevras un lien pour choisir un nouveau mot de passe.
            </SecurityText>
            <SecurityField
              label="Adresse e-mail"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={() => void submit()}
            />
            {error ? <SecurityText tone="error">{error}</SecurityText> : null}
            <SecurityButton
              label="Envoyer le lien"
              onPress={() => void submit()}
              disabled={!EMAIL_RE.test(clean)}
              loading={loading}
            />
          </>
        )}
      </SecurityCard>
    </SecurityScaffold>
  );
}
