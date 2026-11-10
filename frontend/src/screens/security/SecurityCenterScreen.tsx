import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  disableTwoFactor,
  enableTwoFactor,
  getLoginHistory,
  getSecurityStatus,
  listSessions,
  logoutAllDevices,
  resendEmailVerification,
  revokeSession,
  startTwoFactorSetup,
  type LoginEventDTO,
  type SecurityStatusDTO,
  type SessionDTO,
} from '../../api/accountSecurity';
import { useStore } from '../../store/useStore';
import {
  SecurityButton,
  SecurityCard,
  SecurityField,
  SecurityScaffold,
  SecurityText,
  confirmAction,
  showInfo,
  securityStyles as s,
} from '../../components/security/SecurityScaffold';

const LOGIN_REASONS: Record<string, string> = {
  INVALID_CREDENTIALS: 'mot de passe incorrect',
  TWO_FACTOR_INVALID: 'code de vérification incorrect',
  LOCKED: 'bloquée après trop de tentatives',
  BANNED: 'compte suspendu',
  PASSWORD_RESET: 'mot de passe réinitialisé',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  return `${d.toLocaleDateString('fr-FR')} à ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`;
}

const errorText = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

export default function SecurityCenterScreen() {
  const router = useRouter();
  const logout = useStore((st) => st.logout);
  const [status, setStatus] = useState<SecurityStatusDTO | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [history, setHistory] = useState<LoginEventDTO[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Double authentification
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [setup, setSetup] = useState<{ secret: string; otpauthUri: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[] | null>(null);
  const [twoFaError, setTwoFaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [st, se, hi] = await Promise.all([getSecurityStatus(), listSessions(), getLoginHistory()]);
      setStatus(st);
      setSessions(se);
      setHistory(hi);
    } catch (err) {
      setLoadError(errorText(err, 'Chargement impossible. Vérifie ta connexion.'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } finally {
      setBusy(null);
    }
  };

  const confirmLogoutAll = () =>
    confirmAction(
      'Déconnecter tous les appareils ?',
      'Tu devras te reconnecter partout, y compris sur ce téléphone. Les notifications ne seront plus envoyées à ces appareils.',
      'Tout déconnecter',
      () =>
        void run('all', async () => {
          try {
            await logoutAllDevices();
            await logout().catch(() => {});
            router.replace('/login');
          } catch (err) {
            showInfo('Erreur', errorText(err, 'Déconnexion impossible.'));
          }
        }),
    );

  const confirmRevoke = (session: SessionDTO) =>
    confirmAction(
      'Déconnecter cet appareil ?',
      `${session.device} — connecté le ${formatDate(session.createdAt)}`,
      'Déconnecter',
      () =>
        void run(session.id, async () => {
          try {
            await revokeSession(session.id);
            await load();
          } catch (err) {
            showInfo('Erreur', errorText(err, 'Déconnexion impossible.'));
          }
        }),
    );

  const resend = () =>
    void run('verify', async () => {
      try {
        const result = await resendEmailVerification();
        showInfo(
          'Adresse e-mail',
          result === 'already_verified'
            ? 'Ton adresse est déjà confirmée.'
            : "Un lien de confirmation vient d'être envoyé. Pense à regarder dans les courriers indésirables.",
        );
        await load();
      } catch (err) {
        showInfo('Erreur', errorText(err, 'Envoi impossible.'));
      }
    });

  const beginSetup = () =>
    void run('2fa', async () => {
      setTwoFaError(null);
      try {
        setSetup(await startTwoFactorSetup(password));
        setPassword('');
      } catch (err) {
        setTwoFaError(errorText(err, 'Configuration impossible.'));
      }
    });

  const confirmSetup = () =>
    void run('2fa', async () => {
      setTwoFaError(null);
      try {
        const result = await enableTwoFactor(code.trim());
        setBackupCodes(result.backupCodes);
        setSetup(null);
        setCode('');
        await load();
      } catch (err) {
        setTwoFaError(errorText(err, 'Code incorrect.'));
      }
    });

  const turnOff = () =>
    void run('2fa', async () => {
      setTwoFaError(null);
      try {
        await disableTwoFactor(password, code.trim());
        setPassword('');
        setCode('');
        await load();
        showInfo('Double authentification', 'Elle est désactivée.');
      } catch (err) {
        setTwoFaError(errorText(err, 'Désactivation impossible.'));
      }
    });

  const showTwoFactor = status && (status.available || status.enabled);

  return (
    <SecurityScaffold title="Sécurité et appareils" onBack={() => router.back()}>
      {loadError ? (
        <SecurityCard>
          <SecurityText tone="error">{loadError}</SecurityText>
          <SecurityButton tone="secondary" label="Réessayer" onPress={() => void load()} />
        </SecurityCard>
      ) : null}
      {!status && !loadError ? <ActivityIndicator /> : null}

      {status ? (
        <SecurityCard title="Adresse e-mail">
          <SecurityText tone={status.emailVerified ? 'success' : undefined}>
            {status.emailVerified ? 'Ton adresse est confirmée.' : "Ton adresse n'est pas encore confirmée."}
          </SecurityText>
          {!status.emailVerified && status.emailDelivery ? (
            <SecurityButton tone="secondary" label="Renvoyer le lien de confirmation" onPress={resend} loading={busy === 'verify'} />
          ) : null}
        </SecurityCard>
      ) : null}

      {status ? (
        <SecurityCard title="Appareils connectés">
          {sessions.length === 0 ? <SecurityText>Aucun appareil.</SecurityText> : null}
          {sessions.map((session) => (
            <View key={session.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{session.device}</Text>
                <Text style={s.rowMeta}>
                  Connecté le {formatDate(session.createdAt)} · actif le {formatDate(session.lastUsedAt)}
                </Text>
              </View>
              <TouchableOpacity
                accessibilityRole="button"
                onPress={() => confirmRevoke(session)}
                disabled={busy !== null}
              >
                <Text style={s.link}>Déconnecter</Text>
              </TouchableOpacity>
            </View>
          ))}
          <SecurityButton tone="danger" label="Déconnecter tous les appareils" onPress={confirmLogoutAll} loading={busy === 'all'} />
        </SecurityCard>
      ) : null}

      {showTwoFactor ? (
        <SecurityCard title="Double authentification">
          {backupCodes ? (
            <>
              <SecurityText tone="success">Double authentification activée.</SecurityText>
              <SecurityText>
                Note ces codes de secours et garde-les en lieu sûr. Chacun ne sert qu’une fois, et ils ne seront plus affichés.
              </SecurityText>
              {backupCodes.map((c) => (
                <Text key={c} selectable style={s.code}>
                  {c}
                </Text>
              ))}
              <SecurityButton label="J'ai noté mes codes" onPress={() => setBackupCodes(null)} />
            </>
          ) : status?.enabled ? (
            <>
              <SecurityText tone="success">
                Active · {status.backupCodesRemaining} code{status.backupCodesRemaining > 1 ? 's' : ''} de secours restant
                {status.backupCodesRemaining > 1 ? 's' : ''}
              </SecurityText>
              <SecurityField label="Mot de passe" value={password} onChangeText={setPassword} secureTextEntry />
              <SecurityField label="Code de vérification ou code de secours" value={code} onChangeText={setCode} />
              {twoFaError ? <SecurityText tone="error">{twoFaError}</SecurityText> : null}
              <SecurityButton
                tone="secondary"
                label="Désactiver"
                onPress={turnOff}
                disabled={!password || code.trim().length < 6}
                loading={busy === '2fa'}
              />
            </>
          ) : setup ? (
            <>
              <SecurityText>
                1. Ajoute JeuTaime dans ton application d’authentification, avec le bouton ci-dessous ou en saisissant cette clé :
              </SecurityText>
              <Text selectable style={s.code}>
                {setup.secret.replace(/(.{4})/g, '$1 ').trim()}
              </Text>
              <SecurityButton
                tone="secondary"
                label="Ouvrir l'application d'authentification"
                onPress={() =>
                  void Linking.openURL(setup.otpauthUri).catch(() =>
                    showInfo('Aucune application trouvée', 'Saisis la clé affichée dans ton application d’authentification.'),
                  )
                }
              />
              <SecurityText>2. Saisis le code à 6 chiffres affiché par l’application.</SecurityText>
              <SecurityField
                label="Code à 6 chiffres"
                value={code}
                onChangeText={setCode}
                keyboardType="number-pad"
                textContentType="oneTimeCode"
                maxLength={6}
              />
              {twoFaError ? <SecurityText tone="error">{twoFaError}</SecurityText> : null}
              <SecurityButton label="Activer" onPress={confirmSetup} disabled={code.trim().length !== 6} loading={busy === '2fa'} />
            </>
          ) : (
            <>
              <SecurityText>
                Protège ton compte d’administration : en plus du mot de passe, un code à 6 chiffres te sera demandé à chaque connexion.
              </SecurityText>
              <SecurityField label="Mot de passe actuel" value={password} onChangeText={setPassword} secureTextEntry />
              {twoFaError ? <SecurityText tone="error">{twoFaError}</SecurityText> : null}
              <SecurityButton label="Configurer" onPress={beginSetup} disabled={!password} loading={busy === '2fa'} />
            </>
          )}
        </SecurityCard>
      ) : null}

      {status ? (
        <SecurityCard title="Dernières connexions">
          {history.length === 0 ? <SecurityText>Aucune connexion enregistrée.</SecurityText> : null}
          {history.map((event) => (
            <View key={event.id} style={s.row}>
              <View style={{ flex: 1 }}>
                <Text style={s.rowTitle}>{event.success ? 'Connexion réussie' : 'Tentative refusée'}</Text>
                <Text style={s.rowMeta}>
                  {formatDate(event.createdAt)}
                  {event.reason && LOGIN_REASONS[event.reason] ? ` · ${LOGIN_REASONS[event.reason]}` : ''}
                </Text>
              </View>
            </View>
          ))}
          <SecurityText>Une connexion que tu ne reconnais pas ? Change ton mot de passe, puis déconnecte tous les appareils.</SecurityText>
        </SecurityCard>
      ) : null}
    </SecurityScaffold>
  );
}
