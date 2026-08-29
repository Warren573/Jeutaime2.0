import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { getCommunityStats, getDailyStats, getRefugeStats, type CommunityStatsDTO, type DailyStatsDTO, type RefugeStatsDTO } from '../api/stats';
import { getWeeklyProfileWinners, type WeeklyProfileWinnersDTO } from '../api/weeklyProfile';

const todayHeadline = () => new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatNumber = (n: number) => n.toLocaleString('fr-FR');

export default function JournalScreen() {
  const router = useRouter();
  const { coins, points } = useStore();
  const [refreshing, setRefreshing] = useState(false);
  const [communityStats, setCommunityStats] = useState<CommunityStatsDTO | null>(null);
  const [dailyStats, setDailyStats] = useState<DailyStatsDTO | null>(null);
  const [refugeStats, setRefugeStats] = useState<RefugeStatsDTO | null>(null);
  const [weeklyWinners, setWeeklyWinners] = useState<WeeklyProfileWinnersDTO | null>(null);

  const loadAllData = async () => {
    const [commStats, dayStats, refStats, winners] = await Promise.all([
      getCommunityStats().catch(() => null),
      getDailyStats().catch(() => null),
      getRefugeStats().catch(() => null),
      getWeeklyProfileWinners().catch(() => null),
    ]);
    if (commStats) setCommunityStats(commStats);
    if (dayStats) setDailyStats(dayStats);
    if (refStats) setRefugeStats(refStats);
    if (winners) setWeeklyWinners(winners);
  };

  useEffect(() => { void loadAllData(); }, []);

  const refresh = async () => {
    setRefreshing(true);
    await loadAllData();
    setRefreshing(false);
  };

  const winner = (label: string, value: WeeklyProfileWinnersDTO['male']) => value ? <>
    <Text>{label} : {value.pseudo} — {value.totalVotes} votes</Text>
    <Button title={`Voir le profil de ${value.pseudo}`} onPress={() => router.push(`/profiles?userId=${value.id}`)} />
  </> : <Text>{label} : aucun résultat</Text>;

  return <ScrollView>
    <Text>Journal</Text>
    <Text>{todayHeadline()}</Text>
    <Text>Pièces : {coins}</Text>
    <Text>Points : {points}</Text>
    <Button title={refreshing ? 'Actualisation...' : 'Actualiser'} onPress={() => void refresh()} disabled={refreshing} />

    <Text>Gagnants de la semaine</Text>
    {weeklyWinners ? <>
      {winner('Femmes', weeklyWinners.female)}
      {winner('Hommes', weeklyWinners.male)}
    </> : <Text>Données indisponibles.</Text>}

    <Text>Le Refuge</Text>
    {refugeStats ? <>
      <Text>Refuges en cours : {refugeStats.activeRefuges}</Text>
      <Text>Révélations en attente : {refugeStats.awaitingReveal}</Text>
      <Text>Refuges terminés : {refugeStats.completedRefuges}</Text>
    </> : <Text>Données indisponibles.</Text>}

    <Text>Statistiques du jour</Text>
    {dailyStats ? <>
      <Text>Matchs créés : {dailyStats.matchesToday}</Text>
      <Text>Lettres envoyées : {dailyStats.lettersSentToday}</Text>
      <Text>Bouteilles envoyées : {dailyStats.bottlesSentToday}</Text>
      <Text>Sourires envoyés : {dailyStats.smilesSentToday}</Text>
      <Text>Grimaces envoyées : {dailyStats.grimacesSentToday}</Text>
      <Text>Offrandes envoyées : {dailyStats.offeringsSentToday}</Text>
      <Text>Duels joués : {dailyStats.duelsPlayedToday}</Text>
    </> : <Text>Données indisponibles.</Text>}

    <Text>Chiffres de la communauté</Text>
    {communityStats ? <>
      <Text>Matchs : {formatNumber(communityStats.matchesToday)}</Text>
      <Text>Lettres échangées : {formatNumber(communityStats.lettersSent)}</Text>
      <Text>Offrandes envoyées : {formatNumber(communityStats.giftsSent)}</Text>
      <Text>Membres actifs sur 7 jours : {formatNumber(communityStats.activeMembers)}</Text>
    </> : <Text>Données indisponibles.</Text>}
  </ScrollView>;
}
