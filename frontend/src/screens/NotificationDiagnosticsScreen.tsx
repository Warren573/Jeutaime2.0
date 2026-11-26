import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { AppBackButton } from '../components/AppBackButton';
import { getPushStatus, getPushTestResult, requestPushTest, type PushStatusDto, type PushTestDto } from '../api/notifications';
import {
  describeExpoStatus,
  describePermission,
  describeServerState,
  tokenSuffix,
  type Finding,
  type PermissionLike,
} from '../data/pushDiagnostics';
import { APP_COLORS, APP_RADIUS, APP_SPACING } from '../theme/appTheme';

const ICON: Record<Finding['severity'], string> = { ok: '✓', warn: '⚠', error: '✕' };
const TINT: Record<Finding['severity'], string> = { ok: '#2F7D4F', warn: '#B8741A', error: '#9B2C2C' };

function Lines({ findings }: { findings: Finding[] }) {
  return (
    <View>
      {findings.map((f, i) => (
        <View key={i} style={styles.line}>
          <Text style={[styles.lineIcon, { color: TINT[f.severity] }]}>{ICON[f.severity]}</Text>
          <Text style={styles.lineText}>{f.text}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Diagnostic des notifications : seul l'iPhone sait si iOS affiche réellement les notifications. Cet écran lit les
 * autorisations iOS, le jeton de CET appareil, l'état côté serveur, et propose deux tests visibles (local et serveur).
 */
export default function NotificationDiagnosticsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [permission, setPermission] = useState<PermissionLike | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [server, setServer] = useState<PushStatusDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [localTestAt, setLocalTestAt] = useState<number | null>(null);
  const [serverTestAt, setServerTestAt] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<PushTestDto | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setPermission((await Notifications.getPermissionsAsync()) as unknown as PermissionLike);
    } catch {
      setPermission(null);
    }
    try {
      const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
      setToken(projectId ? (await Notifications.getExpoPushTokenAsync({ projectId })).data : null);
    } catch {
      setToken(null);
    }
    try {
      setServer(await getPushStatus());
    } catch {
      setServer(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
    // Retour depuis les réglages d'iOS : relire l'autorisation (une seule fois, pas de sondage).
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void refresh(); });
    return () => sub.remove();
  }, [refresh]);

  const report = describePermission(permission);
  const suffix = tokenSuffix(token);
  const serverFindings = describeServerState(suffix, server);

  async function authorize() {
    try {
      await Notifications.requestPermissionsAsync();
    } finally {
      void refresh();
    }
  }

  async function localTest() {
    try {
      await Notifications.scheduleNotificationAsync({
        content: { title: 'JeuTaime', body: 'Test local : cette notification vient de l’iPhone lui-même.', data: { type: 'PUSH_TEST' } },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 10 },
      });
      setLocalTestAt(Date.now());
    } catch (e) {
      Alert.alert('Test impossible', e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  async function serverTest() {
    if (busy) return;
    setBusy(true);
    try {
      await requestPushTest(10);
      setServerTestAt(Date.now());
      setTestResult(null);
    } catch (e) {
      Alert.alert('Test impossible', e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  }

  async function readResult() {
    try {
      setTestResult(await getPushTestResult());
    } catch (e) {
      Alert.alert('Lecture impossible', e instanceof Error ? e.message : 'Erreur inconnue');
    }
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>NOTIFICATIONS</Text>
          <Text style={styles.title}>Diagnostic</Text>
          <Text style={styles.subtitle}>Pourquoi une notification s’affiche — ou non — sur cet iPhone.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading && !permission ? (
        <View style={styles.center}><ActivityIndicator size="large" color={APP_COLORS.burgundy} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>1 · Autorisations iOS</Text>
            <Lines findings={report.findings} />
            {Platform.OS === 'ios' && report.verdict === 'undetermined' ? (
              <TouchableOpacity style={styles.button} onPress={() => void authorize()}><Text style={styles.buttonText}>Autoriser les notifications</Text></TouchableOpacity>
            ) : null}
            {Platform.OS === 'ios' && report.verdict !== 'ok' ? (
              <TouchableOpacity style={styles.buttonSecondary} onPress={() => void Linking.openSettings()}>
                <Text style={styles.buttonSecondaryText}>Ouvrir les réglages iOS de JeuTaime</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>2 · Cet appareil et ton compte</Text>
            <Text style={styles.small}>Jeton de cet appareil : {suffix ? `…${suffix}` : 'aucun'}</Text>
            <Lines findings={serverFindings} />
            {server?.devices.map((d, i) => (
              <Text key={i} style={styles.small}>Appareil enregistré : {d.platform} …{d.suffix} · mis à jour {new Date(d.updatedAt).toLocaleString('fr-FR')}</Text>
            ))}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>3 · Test sur l’iPhone</Text>
            <Text style={styles.small}>
              Touche un bouton, puis FERME complètement JeuTaime et VERROUILLE l’iPhone avant 10 secondes. Une notification doit apparaître sur l’écran verrouillé.
            </Text>
            <TouchableOpacity style={styles.button} onPress={() => void localTest()}>
              <Text style={styles.buttonText}>Test local (iPhone seul, sans internet)</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, busy && styles.buttonDisabled]} onPress={() => void serverTest()} disabled={busy}>
              <Text style={styles.buttonText}>Test push complet (serveur → Expo → Apple → iPhone)</Text>
            </TouchableOpacity>
            {localTestAt ? <Text style={styles.small}>Test local programmé à {new Date(localTestAt).toLocaleTimeString('fr-FR')} (dans 10 s).</Text> : null}
            {serverTestAt ? <Text style={styles.small}>Test push demandé à {new Date(serverTestAt).toLocaleTimeString('fr-FR')} (envoi dans 10 s).</Text> : null}
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>4 · Lecture des résultats</Text>
            <Text style={styles.small}>
              Local reçu mais push non reçu : le problème est entre Apple et l’iPhone (ou l’appareil enregistré). Local non reçu : iOS bloque l’affichage (voir 1).
            </Text>
            <TouchableOpacity style={styles.buttonSecondary} onPress={() => void readResult()}>
              <Text style={styles.buttonSecondaryText}>Voir le résultat du test push</Text>
            </TouchableOpacity>
            {testResult ? (
              <View style={{ marginTop: 8 }}>
                {testResult.state === 'none' ? <Text style={styles.small}>Aucun test demandé.</Text> : null}
                {testResult.state === 'pending' ? <Text style={styles.small}>Envoi en attente…</Text> : null}
                {testResult.result?.skipped ? <Text style={styles.small}>Non envoyé : {testResult.result.skipped}.</Text> : null}
                {testResult.result?.tickets.map((t, i) => (
                  <Text key={i} style={styles.small}>
                    Expo : {describeExpoStatus(t.status)} · remise à Apple : {describeExpoStatus(testResult.receipts[i] ?? 'pas encore disponible')}
                  </Text>
                ))}
              </View>
            ) : null}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: APP_COLORS.background },
  header: { minHeight: 88, flexDirection: 'row', alignItems: 'center', paddingHorizontal: APP_SPACING.md, paddingVertical: APP_SPACING.sm, borderBottomWidth: 1, borderBottomColor: APP_COLORS.border, backgroundColor: APP_COLORS.paper },
  headerText: { flex: 1, alignItems: 'center', paddingHorizontal: APP_SPACING.sm },
  headerSpacer: { width: 52 },
  kicker: { fontSize: 9, fontWeight: '800', letterSpacing: 2, color: APP_COLORS.muted },
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: APP_SPACING.md, gap: APP_SPACING.md },
  card: { backgroundColor: APP_COLORS.paper, borderRadius: APP_RADIUS.lg, borderWidth: 1, borderColor: APP_COLORS.border, padding: APP_SPACING.md },
  cardTitle: { fontSize: 15, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 8 },
  line: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  lineIcon: { width: 16, fontSize: 14, fontWeight: '900' },
  lineText: { flex: 1, fontSize: 13, lineHeight: 18, color: APP_COLORS.ink },
  small: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted, marginTop: 4 },
  button: { marginTop: 12, backgroundColor: APP_COLORS.burgundy, borderRadius: APP_RADIUS.md, paddingVertical: 12, paddingHorizontal: 14, alignItems: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#FFF8E7', fontSize: 13, fontWeight: '800', textAlign: 'center' },
  buttonSecondary: { marginTop: 10, borderWidth: 1, borderColor: APP_COLORS.burgundy, borderRadius: APP_RADIUS.md, paddingVertical: 11, paddingHorizontal: 14, alignItems: 'center' },
  buttonSecondaryText: { color: APP_COLORS.burgundy, fontSize: 13, fontWeight: '800', textAlign: 'center' },
});
