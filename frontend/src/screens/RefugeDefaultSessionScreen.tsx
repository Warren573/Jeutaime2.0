import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { refugeApi, RefugeSession, isAlreadySubmittedError } from '../api/refuge-api';

const ACTIONS = ['Nourrir', 'Caresser', 'Jouer', 'Promener', 'Nettoyer', 'Reposer'];

export default function RefugeDefaultSessionScreen({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [session, setSession] = useState<RefugeSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [action1, setAction1] = useState('');
  const [action2, setAction2] = useState('');
  const [guess1, setGuess1] = useState('');
  const [guess2, setGuess2] = useState('');

  const load = useCallback(async () => {
    try {
      setError('');
      setSession(await refugeApi.getSession(sessionId));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { load(); }, [load]);

  const submitChoice = async () => {
    if (!session?.currentDay || !action1.trim() || !action2.trim()) return;
    try {
      await refugeApi.submitDailyChoice(sessionId, session.currentDay, action1.trim(), action2.trim());
      setAction1(''); setAction2(''); await load();
    } catch (e) {
      if (isAlreadySubmittedError(e, 'dailyChoice')) return load();
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Choix non envoyé');
    }
  };

  const submitGuess = async () => {
    if (!session?.currentDay || !guess1.trim() || !guess2.trim()) return;
    try {
      await refugeApi.submitGuess(sessionId, session.currentDay, guess1.trim(), guess2.trim());
      setGuess1(''); setGuess2(''); await load();
    } catch (e) {
      if (isAlreadySubmittedError(e, 'guess')) return load();
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Tentative non envoyée');
    }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error) return <View><Text>Erreur : {error}</Text><Button title="Réessayer" onPress={load} /></View>;
  if (!session) return <View><Text>Session introuvable</Text></View>;

  const role = session.adoptantId ? 'Session en cours' : 'En attente d’un adoptant';

  return (
    <ScrollView>
      <Text>Refuge</Text>
      <Text>Animal : {session.animalType}</Text>
      <Text>Sexe : {session.animalSexe}</Text>
      <Text>Âge : {session.animalAgeMonths} mois</Text>
      <Text>État : {session.status}</Text>
      <Text>{role}</Text>
      <Text>Jour : {session.currentDay ?? '-'}/7</Text>
      <Text>Cœurs : {(session.hearts ?? []).length}</Text>
      {session.timeRemaining && <Text>Temps restant : {session.timeRemaining.days} j {session.timeRemaining.hours} h</Text>}

      {(session.dailyResults ?? []).map((r) => (
        <View key={r.dayNumber}>
          <Text>Jour {r.dayNumber} — {r.status}</Text>
          {r.matchCount !== null && <Text>Correspondances : {r.matchCount}</Text>}
          <Text>{r.message}</Text>
          <Text>Pièces : {r.adopteCoinsDelta >= 0 ? '+' : ''}{r.adopteCoinsDelta} / {r.adoptantCoinsDelta >= 0 ? '+' : ''}{r.adoptantCoinsDelta}</Text>
        </View>
      ))}

      {session.todayActions && <Text>Actions du jour : {session.todayActions.action1} / {session.todayActions.action2}</Text>}
      {session.todayResult && <Text>Résultat : {session.todayResult.message} — récompense {session.todayResult.reward}</Text>}

      {!session.todaySubmitted && session.currentDay && session.currentDay <= 7 && (
        <View>
          <Text>Choix quotidien de l’Adopté</Text>
          <Text>Actions possibles : {ACTIONS.join(', ')}</Text>
          <TextInput placeholder="Action 1" value={action1} onChangeText={setAction1} />
          <TextInput placeholder="Action 2" value={action2} onChangeText={setAction2} />
          <Button title="Valider mes actions" onPress={submitChoice} />
        </View>
      )}

      {session.canAttemptToday && (
        <View>
          <Text>Tentative de l’Adoptant</Text>
          <TextInput placeholder="Action devinée 1" value={guess1} onChangeText={setGuess1} />
          <TextInput placeholder="Action devinée 2" value={guess2} onChangeText={setGuess2} />
          <Button title="Valider ma tentative" onPress={submitGuess} />
        </View>
      )}

      {session.reveal?.available && !session.reveal.myDecision && (
        <View>
          <Text>Dévoilement final</Text>
          <Button title="Accepter" onPress={async () => { await refugeApi.submitRevealConsent(sessionId, 'ACCEPT'); await load(); }} />
          <Button title="Refuser" onPress={async () => { await refugeApi.submitRevealConsent(sessionId, 'REFUSE'); await load(); }} />
        </View>
      )}

      {session.reveal?.myDecision && <Text>Votre décision : {session.reveal.myDecision}</Text>}
      {session.otherProfile && (
        <View>
          <Text>Profil révélé</Text>
          <Text>Pseudo : {session.otherProfile.pseudo}</Text>
          {session.otherProfile.age !== null && <Text>Âge : {session.otherProfile.age}</Text>}
          {session.otherProfile.city && <Text>Ville : {session.otherProfile.city}</Text>}
          {session.otherProfile.bio && <Text>Bio : {session.otherProfile.bio}</Text>}
          <Text>Centres d’intérêt : {session.otherProfile.interests.join(', ') || 'Aucun'}</Text>
        </View>
      )}

      <Button title="Actualiser" onPress={load} />
      <Button title="Historique" onPress={() => router.push('/refuge/history')} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
