import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { AppBackButton } from '../components/AppBackButton';
import { getMyReports, type UserReportDTO, type ReportStatus } from '../api/userReports';
import { APP_COLORS, APP_RADIUS, APP_SHADOWS, APP_SPACING } from '../theme/appTheme';

const STATUS_LABEL: Record<ReportStatus, string> = {
  OPEN: 'Ouvert',
  REVIEWING: 'En cours d’examen',
  ACTIONED: 'Traité',
  DISMISSED: 'Classé',
};

const REASON_LABEL: Record<UserReportDTO['reason'], string> = {
  HARASSMENT: 'Harcèlement',
  SPAM: 'Spam',
  FAKE: 'Faux profil',
  INAPPROPRIATE_CONTENT: 'Contenu inapproprié',
  MINOR: 'Mineur',
  OTHER: 'Autre',
};

export default function UserReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<UserReportDTO[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setReports(await getMyReports());
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger les signalements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <AppBackButton onPress={() => router.back()} />
        <View style={styles.headerText}>
          <Text style={styles.kicker}>SÉCURITÉ</Text>
          <Text style={styles.title}>Signalements</Text>
          <Text style={styles.subtitle}>Retrouve les signalements que tu as envoyés.</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={APP_COLORS.burgundy} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.infoCard}>
            <Text style={styles.infoIcon}>🛡️</Text>
            <Text style={styles.infoText}>
              Pour protéger les personnes concernées et la modération, cet historique affiche le statut du dossier sans révéler les actions internes prises sur l’autre compte.
            </Text>
          </View>

          {reports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🚩</Text>
              <Text style={styles.emptyTitle}>Aucun signalement</Text>
              <Text style={styles.emptyText}>Les signalements envoyés depuis un profil apparaîtront ici.</Text>
            </View>
          ) : (
            reports.map((report) => (
              <View key={report.id} style={styles.reportCard}>
                <View style={styles.reportTopRow}>
                  <Text style={styles.reason}>{REASON_LABEL[report.reason]}</Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusText}>{STATUS_LABEL[report.status]}</Text>
                  </View>
                </View>
                <Text style={styles.date}>
                  Envoyé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}
                </Text>
                {report.details ? <Text style={styles.details}>{report.details}</Text> : null}
                {report.resolvedAt ? (
                  <Text style={styles.resolvedDate}>
                    Dernière mise à jour : {new Date(report.resolvedAt).toLocaleDateString('fr-FR')}
                  </Text>
                ) : null}
              </View>
            ))
          )}

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
  title: { fontSize: 24, fontWeight: '900', color: APP_COLORS.ink, marginTop: 2 },
  subtitle: { fontSize: 12, color: APP_COLORS.muted, marginTop: 2, textAlign: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: APP_SPACING.md, paddingBottom: 40 },
  infoCard: {
    flexDirection: 'row',
    padding: APP_SPACING.md,
    borderRadius: APP_RADIUS.md,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    backgroundColor: APP_COLORS.paperSoft,
    marginBottom: APP_SPACING.md,
  },
  infoIcon: { fontSize: 22, marginRight: 10 },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18, color: APP_COLORS.muted },
  emptyCard: {
    alignItems: 'center',
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: 32,
    ...(APP_SHADOWS.card ?? {}),
  },
  emptyIcon: { fontSize: 42, marginBottom: 10 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: APP_COLORS.ink },
  emptyText: { fontSize: 13, color: APP_COLORS.muted, textAlign: 'center', marginTop: 5 },
  reportCard: {
    backgroundColor: APP_COLORS.paper,
    borderRadius: APP_RADIUS.lg,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
    padding: APP_SPACING.md,
    marginBottom: APP_SPACING.sm,
    ...(APP_SHADOWS.card ?? {}),
  },
  reportTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reason: { flex: 1, fontSize: 15, fontWeight: '800', color: APP_COLORS.ink },
  statusBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: APP_RADIUS.pill,
    backgroundColor: APP_COLORS.paperSoft,
    borderWidth: 1,
    borderColor: APP_COLORS.border,
  },
  statusText: { fontSize: 10, fontWeight: '800', color: APP_COLORS.muted },
  date: { fontSize: 11, color: APP_COLORS.muted, marginTop: 6 },
  details: { fontSize: 13, lineHeight: 19, color: APP_COLORS.text, marginTop: 10 },
  resolvedDate: { fontSize: 10, color: APP_COLORS.muted, marginTop: 10, fontStyle: 'italic' },
  refreshBtn: {
    alignSelf: 'center',
    marginTop: APP_SPACING.md,
    borderWidth: 1,
    borderColor: APP_COLORS.burgundy,
    borderRadius: APP_RADIUS.md,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  refreshText: { color: APP_COLORS.burgundy, fontSize: 12, fontWeight: '800' },
});
