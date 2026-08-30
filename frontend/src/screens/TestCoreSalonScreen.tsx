import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, FlatList, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { sendSmile } from '../api/interactions';
import { getCurrentSalonSession, getSessionDetail, joinSession, leaveSession, listMessages, listSalons, performDrinkAction, performEatAction, postMessage, type ParticipantDTO, type SalonDTO, type SalonMessageDTO } from '../api/salons';
import { getOfferingsCatalog, getSalonOfferings, sendOffering, sendOfferingToSession, type OfferingCatalogItemDTO, type SalonOfferingDTO } from '../api/offerings';
import { breakSpell, castSpell, getMagiesCatalog, getSalonMagies, type MagieCatalogDTO, type MagieCatalogItemDTO, type SalonMagieDTO } from '../api/magies';

const SLUG_TO_KIND: Record<string, string> = { piscine: 'PISCINE', cafe_paris: 'CAFE_DE_PARIS', 'cafe-paris': 'CAFE_DE_PARIS', pirates: 'ILE_PIRATES', theatre: 'THEATRE', cocktails: 'BAR_COCKTAILS', metal: 'METAL', psy: 'PSY' };

export default function TestCoreSalonScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const rawId = String(params.id || 'cafe_paris');
  const kind = SLUG_TO_KIND[rawId] || SLUG_TO_KIND[rawId.replace('-', '_')] || 'CAFE_DE_PARIS';
  const currentUser = useStore((s) => s.currentUser);
  const setCurrentSalonSession = useStore((s) => s.setCurrentSalonSession);
  const clearCurrentSalonSession = useStore((s) => s.clearCurrentSalonSession);
  const loadWallet = useStore((s) => s.loadWallet);
  const [salon, setSalon] = useState<SalonDTO | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<ParticipantDTO[]>([]);
  const [messages, setMessages] = useState<SalonMessageDTO[]>([]);
  const [message, setMessage] = useState('');
  const [offerings, setOfferings] = useState<OfferingCatalogItemDTO[]>([]);
  const [salonOfferings, setSalonOfferings] = useState<SalonOfferingDTO[]>([]);
  const [magies, setMagies] = useState<MagieCatalogDTO | null>(null);
  const [salonMagies, setSalonMagies] = useState<SalonMagieDTO[]>([]);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const target = useMemo(() => participants.find((p) => p.userId === targetId) || null, [participants, targetId]);

  const refresh = useCallback(async () => {
    if (!sessionId || !salon?.id) return;
    try {
      const [detail, msgs, offs, spells] = await Promise.all([getSessionDetail(sessionId), listMessages(salon.id, 50, sessionId), getSalonOfferings(salon.id), getSalonMagies(salon.id)]);
      setParticipants(detail.participants || []);
      setMessages([...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      setSalonOfferings(offs);
      setSalonMagies(spells);
    } catch {}
  }, [sessionId, salon?.id]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const salons = await listSalons();
        const found = salons.find((s) => s.kind === kind) || null;
        if (!mounted || !found) return;
        setSalon(found);
        const current = await getCurrentSalonSession();
        let detail;
        if (current?.salonKind === kind) detail = await getSessionDetail(current.sessionId);
        else {
          if (current?.sessionId) { Alert.alert('Salon actif', 'Quitte ton salon actuel avant d’en rejoindre un autre.'); router.back(); return; }
          detail = await joinSession(kind);
        }
        if (!mounted) return;
        setSessionId(detail.id);
        setParticipants(detail.participants || []);
        setCurrentSalonSession(detail.id, kind, found.id, found.name);
        const [catalog, magicCatalog, msgs, offs, spells] = await Promise.all([getOfferingsCatalog(), getMagiesCatalog(), listMessages(found.id, 50, detail.id), getSalonOfferings(found.id), getSalonMagies(found.id)]);
        if (!mounted) return;
        setOfferings(catalog); setMagies(magicCatalog); setMessages([...msgs].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())); setSalonOfferings(offs); setSalonMagies(spells);
      } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible d’ouvrir le salon.'); }
    })();
    return () => { mounted = false; };
  }, [kind, router, setCurrentSalonSession]);

  useEffect(() => { if (!sessionId || !salon?.id) return; const id = setInterval(() => void refresh(), 3000); return () => clearInterval(id); }, [sessionId, salon?.id, refresh]);

  async function handleSendMessage() { const content = message.trim(); if (!content || !salon?.id) return; setBusy(true); try { await postMessage(salon.id, content); setMessage(''); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Message non envoyé.'); } finally { setBusy(false); } }
  async function handleLeave() { if (!sessionId) return; setBusy(true); try { await leaveSession(sessionId); clearCurrentSalonSession(); router.back(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Impossible de quitter le salon.'); } finally { setBusy(false); } }
  async function handleSmile(userId: string) { try { await sendSmile(userId); setNotice('Sourire envoyé.'); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Sourire non envoyé.'); } }
  async function handleOffering(item: OfferingCatalogItemDTO) { if (!targetId || !salon?.id) return; setBusy(true); try { await sendOffering({ offeringId: item.id, toUserId: targetId, salonId: salon.id }); await loadWallet(); setNotice(`${item.name} envoyé à ${target?.pseudo || 'la personne sélectionnée'}.`); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Offrande non envoyée.'); } finally { setBusy(false); } }
  async function handleRound(item: OfferingCatalogItemDTO) { if (!sessionId) return; setBusy(true); try { await sendOfferingToSession({ offeringId: item.id, sessionId }); await loadWallet(); setNotice(`Tournée générale : ${item.name}.`); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Tournée non envoyée.'); } finally { setBusy(false); } }
  async function handleSpell(magieId: string, name: string) { if (!targetId || !salon?.id) return; setBusy(true); try { await castSpell({ magieId, toUserId: targetId, salonId: salon.id }); await loadWallet(); setNotice(`${name} lancé sur ${target?.pseudo || 'la personne sélectionnée'}.`); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Sort non lancé.'); } finally { setBusy(false); } }
  async function handleBreakSpell(cast: SalonMagieDTO, antiSpell: MagieCatalogItemDTO) { setBusy(true); try { await breakSpell(cast.castId, antiSpell.id); await loadWallet(); setNotice(`${antiSpell.name} utilisé contre ${cast.name}.`); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Anti-sort impossible.'); } finally { setBusy(false); } }
  async function handleConsume(action: 'drink' | 'eat') { if (!sessionId) return; try { const result = action === 'drink' ? await performDrinkAction(sessionId) : await performEatAction(sessionId); setNotice(result.success ? (action === 'drink' ? 'Action boire effectuée.' : 'Action manger effectuée.') : 'Action impossible.'); await refresh(); } catch (e) { Alert.alert('Erreur', e instanceof Error ? e.message : 'Action impossible.'); } }

  return <View style={{ flex: 1 }}>
    <Text>{salon?.name || 'Salon'}</Text><Text>{salon?.description || ''}</Text>{notice ? <Text>{notice}</Text> : null}<Button title="Quitter le salon" onPress={() => void handleLeave()} disabled={busy || !sessionId} />
    <Text>Participants</Text>
    {participants.map((p) => <View key={p.userId}>
      <Text>{p.pseudo}{p.userId === currentUser?.id ? ' (moi)' : ''}</Text>
      {p.userId !== currentUser?.id ? <Button title="Voir le profil" onPress={() => router.push(`/profile/${p.userId}`)} /> : null}
      {p.userId !== currentUser?.id ? <Button title="Envoyer un sourire" onPress={() => void handleSmile(p.userId)} /> : null}
      <Button title={targetId === p.userId ? 'Cible sélectionnée' : 'Sélectionner comme cible'} onPress={() => setTargetId(p.userId)} />
      {salonOfferings.filter((o) => o.toUserId === p.userId && o.isActive).map((o) => <Text key={o.id}>Offrande active : {o.name} — étape {o.currentStage}</Text>)}
      {salonMagies.filter((m) => m.toUserId === p.userId && m.isActive).map((m) => <View key={m.castId}><Text>Sort actif : {m.name} — jusqu’au {new Date(m.expiresAt).toLocaleTimeString('fr-FR')}</Text>{(magies?.antiSpells || []).map((anti) => <Button key={anti.id} title={`Utiliser ${anti.name}`} onPress={() => void handleBreakSpell(m, anti)} disabled={busy} />)}</View>)}
    </View>)}
    <Text>Actions</Text><Button title="Boire" onPress={() => void handleConsume('drink')} /><Button title="Manger" onPress={() => void handleConsume('eat')} />
    <Text>Offrandes</Text>{offerings.map((item) => <View key={item.id}><Text>{item.name} — {item.cost} pièces</Text><Button title="Envoyer à la cible" onPress={() => void handleOffering(item)} disabled={!targetId || busy} /><Button title="Tournée générale" onPress={() => void handleRound(item)} disabled={!sessionId || busy} /></View>)}
    <Text>Magie</Text>{(magies?.spells || []).map((item) => <View key={item.id}><Text>{item.name} — {item.cost} pièces — {item.durationSec}s</Text><Button title="Lancer sur la cible" onPress={() => void handleSpell(item.id, item.name)} disabled={!targetId || busy} /></View>)}
    <Text>Anti-sorts disponibles</Text>{(magies?.antiSpells || []).map((item) => <Text key={item.id}>{item.name} — {item.cost} pièces</Text>)}
    <Text>Messages</Text><FlatList data={messages} keyExtractor={(item) => item.id} renderItem={({ item }) => <Text>{item.pseudo}: {item.content}</Text>} />
    <TextInput value={message} onChangeText={setMessage} placeholder="Écrire un message" multiline /><Button title={busy ? 'Envoi...' : 'Envoyer'} onPress={() => void handleSendMessage()} disabled={busy || !message.trim()} />
  </View>;
}
