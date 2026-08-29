import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { getMyReports, type UserReportDTO, type ReportStatus } from '../api/userReports';

const STATUS_LABEL: Record<ReportStatus, string> = { OPEN: 'Ouvert', REVIEWING: "En cours d'examen", ACTIONED: 'Traité', DISMISSED: 'Classé' };
const REASON_LABEL: Record<UserReportDTO['reason'], string> = { HARASSMENT: 'Harcèlement', SPAM: 'Spam', FAKE: 'Faux profil', INAPPROPRIATE_CONTENT: 'Contenu inapproprié', MINOR: 'Mineur', OTHER: 'Autre' };

export default function UserReportsScreen() {
  const router = useRouter();
  const [reports, setReports] = useState<UserReportDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try { setLoading(true); setReports(await getMyReports()); }
    catch (err) { Alert.alert('Erreur', err instanceof Error ? err.message : 'Impossible de charger les signalements.'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  if (loading) return <Text>Chargement...</Text>;
  return <ScrollView>
    <Text>Signalements</Text>
    <Text>Cet historique affiche le statut du dossier sans révéler les actions internes prises sur l'autre compte.</Text>
    {reports.length === 0 && <Text>Aucun signalement.</Text>}
    {reports.map((report) => <View key={report.id}>
      <Text>Motif : {REASON_LABEL[report.reason]}</Text><Text>Statut : {STATUS_LABEL[report.status]}</Text>
      <Text>Envoyé le {new Date(report.createdAt).toLocaleDateString('fr-FR')}</Text>
      {report.details ? <Text>Détails : {report.details}</Text> : null}
      {report.resolvedAt ? <Text>Dernière mise à jour : {new Date(report.resolvedAt).toLocaleDateString('fr-FR')}</Text> : null}
    </View>)}
    <Button title="Actualiser" onPress={() => void load()} /><Button title="Retour" onPress={() => router.back()} />
  </ScrollView>;
}
