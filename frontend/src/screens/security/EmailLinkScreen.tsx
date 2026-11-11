import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { confirmEmailChange, verifyEmail } from '../../api/auth';
import { useStore } from '../../store/useStore';
import {
  SecurityButton,
  SecurityCard,
  SecurityScaffold,
  SecurityText,
} from '../../components/security/SecurityScaffold';

/**
 * Ouverture d'un lien reçu par e-mail : confirmation de l'adresse à
 * l'inscription, ou confirmation d'une nouvelle adresse.
 */
export default function EmailLinkScreen({ mode }: { mode: 'verify' | 'change' }) {
  const router = useRouter();
  const logout = useStore((s) => s.logout);
  const isAuthenticated = useStore((s) => s.isAuthenticated);
  const params = useLocalSearchParams<{ token?: string }>();
  const token = typeof params.token === 'string' ? params.token : '';
  const [state, setState] = useState<'loading' | 'ok' | 'error'>(token ? 'loading' : 'error');
  const [message, setMessage] = useState(token ? '' : "Ce lien est incomplet. Ouvre-le directement depuis l'e-mail reçu.");
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    const call = mode === 'verify' ? verifyEmail : confirmEmailChange;
    call(token)
      .then((msg) => {
        setMessage(msg);
        setState('ok');
        // Le changement d'adresse a déconnecté tous les appareils côté serveur.
        if (mode === 'change') void logout().catch(() => {});
      })
      .catch((err) => {
        setMessage(err instanceof Error ? err.message : 'Ce lien est invalide ou a expiré.');
        setState('error');
      });
  }, [token, mode, logout]);

  const title = mode === 'verify' ? 'Confirmer mon adresse' : 'Nouvelle adresse e-mail';
  const goNext = () => router.replace(mode === 'verify' && isAuthenticated ? '/(tabs)' : '/login');

  return (
    <SecurityScaffold title={title}>
      <SecurityCard>
        {state === 'loading' ? (
          <ActivityIndicator />
        ) : (
          <>
            <SecurityText tone={state === 'ok' ? 'success' : 'error'}>{message}</SecurityText>
            {state === 'error' && mode === 'change' ? (
              <SecurityText>Ton adresse actuelle n’a pas changé. Tu peux refaire la demande depuis Réglages → E-mail.</SecurityText>
            ) : null}
            <SecurityButton label={state === 'ok' && mode === 'verify' && isAuthenticated ? 'Continuer' : 'Aller à la connexion'} onPress={goNext} />
          </>
        )}
      </SecurityCard>
    </SecurityScaffold>
  );
}
