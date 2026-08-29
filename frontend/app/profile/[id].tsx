import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Modal, Platform, ScrollView, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ProfileDetailScreen from '../../src/screens/ProfileDetailScreen';
import { getReactionStatus, sendReaction, type ReactionStatusDTO } from '../../src/api/reactions';
import { blockMatch, breakMatch, listMatches, type MatchDTO } from '../../src/api/matches';
import { blockProfile, reportUser, type ReportReason } from '../../src/api/profiles';
import { useStore } from '../../src/store/useStore';

const REPORT_REASONS: Array<{ value: ReportReason; label: string }> = [
  { value: 'HARASSMENT', label: 'Harcèlement' },
  { value: 'SPAM', label: 'Spam' },
  { value: 'FAKE', label: 'Faux profil' },
  { value: 'INAPPROPRIATE_CONTENT', label: 'Contenu inapproprié' },
  { value: 'MINOR', label: 'Mineur' },
  { value: 'OTHER', label: 'Autre' },
];

export default function ProfileRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; source?: string; bottleId?: string }>();
  const currentUser = useStore(s => s.currentUser);
  const profileId = Array.isArray(params.id) ? params.id[0] : params.id;
  const source = Array.isArray(params.source) ? params.source[0] : params.source;
  const isBottleContext = source === 'bottle';
  const isOwnProfile = !!profileId && currentUser?.id === profileId;

  const [matches, setMatches] = useState<MatchDTO[]>([]);
  const [reactionStatus, setReactionStatus] = useState<ReactionStatusDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState<ReportReason>('OTHER');
  const [reportDetails, setReportDetails] = useState('');

  useEffect(() => {
    if (!profileId || isOwnProfile) return;
    listMatches().then(setMatches).catch(() => setMatches([]));
    if (isBottleContext) getReactionStatus(profileId).then(setReactionStatus).catch(() => setReactionStatus(null));
  }, [profileId, isOwnProfile, isBottleContext]);

  const anyRelationMatch = useMemo(() => matches.find(m => m.otherUserId === profileId), [matches, profileId]);
  const relationMatch = useMemo(() => matches.find(m => m.otherUserId === profileId && (m.status === 'ACTIVE' || m.status === 'PENDING')), [matches, profileId]);
  const hasActiveRelation = relationMatch?.status === 'ACTIVE';
  const mutualSmile = reactionStatus?.mutualSmile === true;
  const smileAlreadySent = reactionStatus?.outgoingType === 'SMILE';

  const show = (title: string, message: string) => Platform.OS === 'web' && typeof globalThis.alert === 'function' ? globalThis.alert(`${title}\n\n${message}`) : Alert.alert(title, message);
  const refreshMatches = async () => setMatches(await listMatches().catch(() => []));

  const smile = async () => {
    if (!profileId || isOwnProfile || smileAlreadySent || loading) return;
    setLoading(true);
    try {
      const result = await sendReaction(profileId, 'SMILE');
      const status = await getReactionStatus(profileId).catch(() => ({ outgoingType: 'SMILE' as const, incomingType: null, mutualSmile: result.matchCreated }));
      setReactionStatus(status);
      if (status.mutualSmile) await refreshMatches();
      show('Sourire', status.mutualSmile ? 'Sourire mutuel.' : 'Sourire envoyé.');
    } catch (e: any) { show('Erreur', e?.message || "Impossible d'envoyer le sourire"); }
    finally { setLoading(false); }
  };

  const breakRelation = async () => {
    if (!relationMatch || relationMatch.status !== 'ACTIVE' || loading) return;
    if (Platform.OS === 'web' && !globalThis.confirm("Rompre l'échange ?")) return;
    setLoading(true);
    try { await breakMatch(relationMatch.id); await refreshMatches(); show('Échange', 'Échange rompu.'); }
    catch (e: any) { show('Erreur', e?.message || "Impossible de rompre l'échange"); }
    finally { setLoading(false); }
  };

  const block = async () => {
    if (!profileId || loading) return;
    if (Platform.OS === 'web' && !globalThis.confirm('Bloquer cette personne ?')) return;
    setLoading(true);
    try {
      if (relationMatch?.status === 'ACTIVE') await blockMatch(relationMatch.id); else await blockProfile(profileId);
      await refreshMatches(); show('Blocage', 'Personne bloquée.'); if (!anyRelationMatch) router.back();
    } catch (e: any) { show('Erreur', e?.message || 'Impossible de bloquer cette personne'); }
    finally { setLoading(false); }
  };

  const report = async () => {
    if (!profileId || loading) return;
    setLoading(true);
    try { await reportUser(profileId, reportReason, reportDetails.trim() || undefined); setReportOpen(false); setReportDetails(''); show('Signalement', 'Signalement envoyé.'); }
    catch (e: any) { show('Erreur', e?.message || "Impossible d'envoyer le signalement"); }
    finally { setLoading(false); }
  };

  return (
    <ScrollView>
      <ProfileDetailScreen />
      {!isOwnProfile && profileId ? <View>
        {isBottleContext && !mutualSmile && <Button title={smileAlreadySent ? 'Sourire déjà envoyé' : 'Envoyer un sourire'} onPress={smile} disabled={smileAlreadySent || loading} />}
        {isBottleContext && relationMatch && <Button title="Continuer la discussion" onPress={() => router.push('/(tabs)/letters' as never)} />}
        {hasActiveRelation && <Button title="Offrandes" onPress={() => router.push({ pathname: '/contact-offerings', params: { toUserId: profileId } } as never)} />}
        {hasActiveRelation && <Button title="Rompre l'échange" onPress={breakRelation} disabled={loading} />}
        <Button title="Bloquer" onPress={block} disabled={loading} />
        <Button title="Signaler" onPress={() => setReportOpen(true)} disabled={loading} />
      </View> : null}

      <Modal visible={reportOpen} onRequestClose={() => setReportOpen(false)}>
        <ScrollView>
          <Text>Signaler ce profil</Text>
          <Text>Motif : {REPORT_REASONS.find(r => r.value === reportReason)?.label}</Text>
          {REPORT_REASONS.map(r => <Button key={r.value} title={r.label} onPress={() => setReportReason(r.value)} />)}
          <TextInput placeholder="Détails supplémentaires (optionnel)" value={reportDetails} onChangeText={setReportDetails} multiline maxLength={1000} />
          <Button title="Envoyer le signalement" onPress={report} disabled={loading} />
          <Button title="Annuler" onPress={() => setReportOpen(false)} disabled={loading} />
        </ScrollView>
      </Modal>
    </ScrollView>
  );
}
