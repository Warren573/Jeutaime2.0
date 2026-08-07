import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import {
  exportMyPersonalData,
  getMyAccountData,
  type MyAccountDataDTO,
} from '../api/accountData';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

function DataRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

export default function PersonalDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<MyAccountDataDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setData(await getMyAccountData());
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger tes données.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const handleExport = useCallback(async () => {
    if (exporting) return;
    try {
      setExporting(true);
      const exported = await exportMyPersonalData();
      const json = JSON.stringify(exported, null, 2);
      await Share.share({
        title: 'Export de mes données JeuTaime',
        message: json,
      });
    } catch (err) {
      Alert.alert(
        'Export impossible',
        err instanceof Error ? err.message : 'Impossible de générer ton export pour le moment.',
      );
    } finally {
      setExporting(false);
    }
  }, [exporting]);

  const profile = (data?.profile ?? {}) as Record<string, unknown>;
  const settings = (data?.settings ?? {}) as Record<string, unknown>;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>MON COMPTE</Text>
          <Text style={styles.title}>Données personnelles</Text>
          <Text style={styles.subtitle}>Consulte et récupère les données enregistrées sur ton compte.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading || !data ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>COMPTE</Text>
          <View style={styles.card}>
            <DataRow label="Email" value={data.email} />
            <DataRow label="Créé le" value={new Date(data.createdAt).toLocaleDateString('fr-FR')} />
            <DataRow label="Dernière connexion" value={data.lastLoginAt ? new Date(data.lastLoginAt).toLocaleString('fr-FR') : 'Non renseignée'} />
            <DataRow label="Abonnement" value={data.premiumTier} />
          </View>

          <Text style={styles.sectionTitle}>PROFIL</Text>
          <View style={styles.card}>
            <DataRow label="Pseudo" value={String(profile.pseudo ?? 'Non renseigné')} />
            <DataRow label="Ville" value={String(profile.city ?? 'Non renseignée')} />
            <DataRow label="Genre" value={String(profile.gender ?? 'Non renseigné')} />
            <DataRow label="Date de naissance" value={profile.birthDate ? new Date(String(profile.birthDate)).toLocaleDateString('fr-FR') : 'Non renseignée'} />
          </View>

          <Text style={styles.sectionTitle}>RÉGLAGES</Text>
          <View style={styles.card}>
            <DataRow label="Visible dans la découverte" value={settings.showInDiscovery === false ? 'Non' : 'Oui'} />
            <DataRow label="Localisation partagée" value={settings.locationShared === true ? 'Oui' : 'Non'} />
            <DataRow label="Sons" value={settings.soundEnabled === false ? 'Désactivés' : 'Activés'} />
            <DataRow label="Notifications push" value={settings.notifPush === false ? 'Désactivées' : 'Activées'} />
          </View>

          <Text style={styles.sectionTitle}>ÉCONOMIE</Text>
          <View style={styles.card}>
            <DataRow label="Pièces" value={String(data.wallet?.coins ?? 0)} />
          </View>

          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>📦</Text>
            <View style={styles.infoBody}>
              <Text style={styles.infoTitle}>Export de tes données</Text>
              <Text style={styles.infoText}>
                L’export JSON regroupe les données de ton compte accessibles à l’utilisateur. Les mots de passe, jetons de connexion et informations techniques internes ne sont jamais inclus.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.exportBtn, exporting && styles.exportBtnDisabled]}
            onPress={() => void handleExport()}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator color={APP_COLORS.white} />
            ) : (
              <Text style={styles.exportText}>Exporter mes données</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.refreshBtn} onPress={() => void load()}>
            <Text style={styles.refreshText}>Actualiser</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
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
  title: { fontSize: 22, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2, textAlign: 'center' },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
    color: APP_COLORS.muted,
    marginTop: 4,
    marginBottom: 8,
  },
  card: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    paddingHorizontal: APP_SPACING.md,
    marginBottom: APP_SPACING.md,
    ...(APP_SHADOWS.card ?? {}),
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: APP_COLORS.border,
  },
  rowLabel: { flex: 1, fontSize: 12, color: APP_COLORS.muted },
  rowValue: { flex: 1, fontSize: 12, color: APP_COLORS.ink, fontWeight: '700', textAlign: 'right' },
  infoCard: {
    flexDirection: 'row',
    padding: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  infoIcon: { fontSize: 22, marginRight: 10 },
  infoBody: { flex: 1 },
  infoTitle: { fontSize: 13, fontWeight: '800', color: APP_COLORS.ink, marginBottom: 4 },
  infoText: { fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  exportBtn: {
    minHeight: 50,
    marginTop: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    backgroundColor: APP_COLORS.burgundy,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  exportBtnDisabled: { opacity: 0.55 },
  exportText: { color: APP_COLORS.white, fontWeight: '800', fontSize: 13 },
  refreshBtn: {
    alignSelf: 'center',
    marginTop: APP_SPACING.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.burgundy,
  },
  refreshText: { color: APP_COLORS.burgundy, fontWeight: '800', fontSize: 12 },
});
