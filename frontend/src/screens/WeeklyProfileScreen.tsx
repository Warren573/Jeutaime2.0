import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import {
  getWeeklyProfileState,
  voteForDuel,
  getWeeklyProfileWinners,
  type WeeklyProfileStateDTO,
  type WeeklyProfileWinnersDTO,
  type WeeklyProfileWinnerDTO,
  type DuelProfileDTO,
} from '../api/weeklyProfile';

const VOTE_REWARD = 5;

function errorMessage(err: unknown, fallback: string) {
  const message = err instanceof Error ? err.message : '';
  return message.trim() || fallback;
}

function isExpiredComparisonError(err: unknown) {
  const message = err instanceof Error ? err.message.toLowerCase() : '';
  return message.includes('expir') || message.includes('déjà été utilisé');
}

export default function WeeklyProfileScreen() {
  const router = useRouter();
  const loadWallet = useStore((state) => state.loadWallet);
  const [activeTab, setActiveTab] = useState<'vote' | 'winners'>('vote');
  const [state, setState] = useState<WeeklyProfileStateDTO | null>(null);
  const [stateLoading, setStateLoading] = useState(true);
  const [voting, setVoting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [winners, setWinners] = useState<WeeklyProfileWinnersDTO | null>(null);
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [winnersError, setWinnersError] = useState<string | null>(null);

  const loadState = async () => {
    setStateLoading(true);
    setError(null);
    try {
      setState(await getWeeklyProfileState());
    } catch (err) {
      setState(null);
      setError(errorMessage(err, 'Impossible de charger la comparaison de profils.'));
    } finally {
      setStateLoading(false);
    }
  };

  const loadWinners = async () => {
    setWinnersLoading(true);
    setWinnersError(null);
    try {
      setWinners(await getWeeklyProfileWinners());
    } catch (err) {
      setWinners(null);
      setWinnersError(errorMessage(err, 'Impossible de charger les gagnants de la semaine.'));
    } finally {
      setWinnersLoading(false);
    }
  };

  useEffect(() => {
    void loadState();
    void loadWinners();
  }, []);

  const handleVote = async (chosenId: string) => {
    if (!state?.duel || voting !== null) return;
    setError(null);
    setVoting(chosenId);
    try {
      setState(await voteForDuel(state.duel.duelId, chosenId));
      await loadWallet();
    } catch (err) {
      if (isExpiredComparisonError(err)) {
        setError('Cette comparaison n’était plus disponible. Une nouvelle vient d’être chargée.');
        try {
          setState(await getWeeklyProfileState());
        } catch (reloadError) {
          setState(null);
          setError(errorMessage(reloadError, 'Impossible de charger une nouvelle comparaison.'));
        }
      } else {
        setError(errorMessage(err, "Impossible d'enregistrer ton vote."));
      }
    } finally {
      setVoting(null);
    }
  };

  const renderProfile = (profile: DuelProfileDTO, disabled: boolean) => (
    <View key={profile.id}>
      <Text>{profile.pseudo}, {profile.age}</Text>
      {profile.city ? <Text>Ville : {profile.city}</Text> : null}
      {profile.bio ? <Text>Bio : {profile.bio}</Text> : null}
      <Button
        title={voting === profile.id ? 'Vote en cours...' : `Choisir ce profil (+${VOTE_REWARD} pièces)`}
        onPress={() => void handleVote(profile.id)}
        disabled={disabled}
      />
    </View>
  );

  const renderWinner = (profile: WeeklyProfileWinnerDTO | null, label: string) => (
    <View>
      <Text>{label}</Text>
      {profile ? (
        <>
          <Text>{profile.pseudo}, {profile.age}</Text>
          {profile.city ? <Text>Ville : {profile.city}</Text> : null}
          {profile.bio ? <Text>Bio : {profile.bio}</Text> : null}
          <Text>Votes : {profile.totalVotes}</Text>
        </>
      ) : (
        <Text>Pas encore de gagnant pour cette catégorie.</Text>
      )}
    </View>
  );

  const limitReached = !!state?.limitReached;
  const disabled = limitReached || voting !== null || !state?.duel;

  return (
    <ScrollView>
      <Text>Élection hebdomadaire</Text>
      <Text>Choisis ton profil préféré et gagne {VOTE_REWARD} pièces par vote.</Text>
      <Button title="Voter" onPress={() => setActiveTab('vote')} />
      <Button title="Gagnants" onPress={() => setActiveTab('winners')} />

      {activeTab === 'vote' ? (
        stateLoading ? (
          <Text>Chargement...</Text>
        ) : (
          <View>
            {error ? <Text>{error}</Text> : null}
            {!state && error ? <Button title="Réessayer" onPress={() => void loadState()} /> : null}
            {state ? (
              <>
                <Text>Votes restants aujourd'hui : {state.remainingToday} / {state.dailyLimit}</Text>
                <Text>Récompense par vote : {VOTE_REWARD} pièces</Text>
              </>
            ) : null}
            {limitReached ? <Text>Limite quotidienne atteinte. Reviens demain.</Text> : null}
            {!limitReached && state?.notEnoughCandidates ? <Text>Pas assez de profils disponibles pour proposer une comparaison.</Text> : null}
            {!limitReached && state?.duel ? (
              <>
                {renderProfile(state.duel.candidateA, disabled)}
                <Text>OU</Text>
                {renderProfile(state.duel.candidateB, disabled)}
              </>
            ) : null}
          </View>
        )
      ) : winnersLoading ? (
        <Text>Chargement...</Text>
      ) : (
        <View>
          {winnersError ? <><Text>{winnersError}</Text><Button title="Réessayer" onPress={() => void loadWinners()} /></> : null}
          {!winnersError ? (
            <>
              {renderWinner(winners?.female ?? null, 'Profil féminin de la semaine')}
              {renderWinner(winners?.male ?? null, 'Profil masculin de la semaine')}
            </>
          ) : null}
        </View>
      )}

      <Button title="Actualiser" onPress={() => { void loadState(); void loadWinners(); }} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
