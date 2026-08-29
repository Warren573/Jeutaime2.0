import React, { useState, useCallback } from 'react';
import { Button, RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useStore } from '../store/useStore';
import { getInbox, acceptBottle, refuseBottle, getSentBottles, InboxBottleDTO, SentBottleDTO } from '../api/bottles';

const STATUS: Record<string, string> = { FLOATING: 'En attente', ACCEPTED: 'Acceptée', EXPIRED: 'Expirée', REVEALED: 'Dévoilée', BROKEN: 'Rompue' };

export default function BottleInboxScreen() {
  const router = useRouter();
  const currentUser = useStore(s => s.currentUser);
  const [pending, setPending] = useState<InboxBottleDTO[]>([]);
  const [accepted, setAccepted] = useState<InboxBottleDTO[]>([]);
  const [sent, setSent] = useState<SentBottleDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    try {
      const [received, sentItems] = await Promise.all([getInbox(), getSentBottles().catch(() => [] as SentBottleDTO[])]);
      setPending(received.filter(b => b.status === 'FLOATING'));
      setAccepted(received.filter(b => b.status === 'ACCEPTED' || b.status === 'REVEALED'));
      setSent(sentItems);
    } catch (e: any) { setFeedback(e?.message || 'Impossible de charger les bouteilles.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const accept = async (id: string) => {
    setLoadingId(id); setFeedback('');
    try { await acceptBottle(id); await load(); router.push({ pathname: '/bottles-discussion', params: { bottleId: id } }); }
    catch (e: any) { setFeedback(e?.message?.includes('TAKEN') ? "Quelqu'un d'autre a accepté cette bouteille avant toi." : e?.message || "Erreur lors de l'acceptation"); await load(); }
    finally { setLoadingId(null); }
  };

  const refuse = async (id: string) => {
    setLoadingId(id); setFeedback('');
    try { await refuseBottle(id); setFeedback('Bouteille refusée.'); await load(); }
    catch (e: any) { setFeedback(e?.message || 'Erreur lors du refus'); }
    finally { setLoadingId(null); }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;

  return (
    <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}>
      <Text>Bouteilles à la mer</Text>
      <Text>Profil : {currentUser?.gender || '-'} {currentUser?.age ? `— ${currentUser.age} ans` : ''}</Text>
      <Text>Recherche : {currentUser?.interestedIn?.join(', ') || 'non renseignée'}</Text>
      {feedback ? <Text>{feedback}</Text> : null}

      <Text>À recevoir ({pending.length})</Text>
      {pending.length === 0 && <Text>Aucune bouteille pour le moment.</Text>}
      {pending.map(b => <View key={b.id}><Text>{b.message}</Text><Text>Ville : {b.senderCity || '-'}</Text><Text>Cible : {b.targetGender}</Text><Button title="Accepter" disabled={loadingId === b.id} onPress={() => accept(b.id)} /><Button title="Refuser" disabled={loadingId === b.id} onPress={() => refuse(b.id)} /></View>)}

      <Text>Conversations ({accepted.length})</Text>
      {accepted.map(b => <View key={b.id}><Text>{STATUS[b.status] || b.status}</Text><Text>{b.message}</Text><Text>Ville : {b.senderCity || '-'}</Text><Button title="Voir la discussion" onPress={() => router.push({ pathname: '/bottles-discussion', params: { bottleId: b.id } })} /></View>)}

      <Text>Mes bouteilles envoyées ({sent.length})</Text>
      {sent.length === 0 && <Text>Aucune bouteille envoyée.</Text>}
      {sent.map(b => <View key={b.id}><Text>{STATUS[b.status] || b.status}</Text><Text>{b.message}</Text><Text>Cible : {b.targetGender}, {b.ageMin}-{b.ageMax} ans</Text><Text>Destinataires : {b.recipientCount}</Text></View>)}

      <Button title="Créer une bouteille" onPress={() => router.push('/bottles-create')} />
      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
