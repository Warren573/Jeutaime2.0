import React, { useCallback, useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import type { Letter } from '../shared/types';
import { getReceivedOfferings, type OfferingSentDTO } from '../api/offerings';
import { getUnreadCount } from '../api/bottles';
import { getSalon } from '../api/salons';
import { ANIMAL_LABELS } from '../data/refugeAnimals';
import { apiFetch } from '../api/client';

export function PersonalBoard() {
  const router = useRouter();
  const {
    currentUser,
    points,
    coins,
    matches,
    lettersByMatch,
    matchPartners,
    pet,
    currentSalonId,
  } = useStore();

  const [offerings, setOfferings] = useState<OfferingSentDTO[]>([]);
  const [hasBottle, setHasBottle] = useState(false);
  const [salonName, setSalonName] = useState<string | null>(null);
  const [refugeData, setRefugeData] = useState<{
    animalType: string;
    todaySubmitted: boolean;
    isActive: boolean;
  } | null>(null);

  const checkRefugeSession = useCallback(async () => {
    try {
      const response = await apiFetch('/refuge/active');
      if (response?.data?.animalType) {
        setRefugeData({
          animalType: response.data.animalType,
          todaySubmitted: response.data.todaySubmitted,
          isActive: response.data.isActive,
        });
      } else {
        setRefugeData(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setOfferings(await getReceivedOfferings(1, 100, true));
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setHasBottle((await getUnreadCount()) > 0);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    if (!currentSalonId) {
      setSalonName(null);
      return;
    }
    (async () => {
      try {
        const data = await getSalon(currentSalonId);
        setSalonName(data.name);
      } catch {}
    })();
  }, [currentSalonId]);

  useFocusEffect(useCallback(() => {
    checkRefugeSession();
  }, [checkRefugeSession]));

  const recentLetters = (() => {
    if (!currentUser?.id || !matches?.length) return [];
    const activeMatches = matches.filter((m) => m.status === 'active' || m.status === 'pending');
    const allLetters: Letter[] = [];
    activeMatches.forEach((match) => {
      const matchLetters = lettersByMatch[match.id];
      if (matchLetters !== undefined) {
        allLetters.push(...matchLetters.filter((letter) => letter.toUserId === currentUser.id));
      }
    });
    return allLetters.sort((a, b) => b.createdAt - a.createdAt).slice(0, 3);
  })();

  if (!currentUser) {
    return <Text>Chargement...</Text>;
  }

  const receivedSmiles = matches?.filter((match) => match.initiatorId !== currentUser.id).length ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
      <Text>Accueil</Text>

      <View>
        <Text>Profil</Text>
        <Text>{currentUser.name || currentUser.pseudo || 'Vous'}</Text>
        <Button title="Voir mon profil" onPress={() => router.push(`/profile/${currentUser.id}`)} />
      </View>

      <View>
        <Text>Refuge</Text>
        {refugeData?.animalType ? (
          <>
            <Text>Animal : {ANIMAL_LABELS[refugeData.animalType] || refugeData.animalType}</Text>
            <Text>
              {refugeData.isActive && refugeData.todaySubmitted
                ? "Tu t'en es déjà occupé aujourd'hui"
                : refugeData.isActive
                  ? "Il est temps de t'en occuper aujourd'hui"
                  : "En attente d'un adoptant"}
            </Text>
          </>
        ) : (
          <Text>{pet?.petName ? `Compagnon : ${pet.petName}` : 'Aucun compagnon actif'}</Text>
        )}
        <Button title="Ouvrir le refuge" onPress={() => router.push('/refuge')} />
      </View>

      <View>
        <Text>Lettres reçues</Text>
        {recentLetters.length > 0 ? recentLetters.map((letter) => (
          <Text key={letter.id}>{matchPartners[letter.fromUserId]?.pseudo || letter.fromUserId}</Text>
        )) : <Text>Aucune lettre</Text>}
        <Button title="Ouvrir les lettres" onPress={() => router.push('/(tabs)/letters')} />
      </View>

      <View>
        <Text>Sourires reçus : {receivedSmiles}</Text>
        <Button title="Voir les profils" onPress={() => router.push('/(tabs)/profiles?filter=received-smiles')} />
      </View>

      <View>
        <Text>Bouteille à la mer</Text>
        <Text>{hasBottle ? 'Message non lu disponible' : 'Aucun message non lu'}</Text>
        <Button title="Ouvrir" onPress={() => router.push('/bottles-main')} />
      </View>

      <View>
        <Text>Offrandes reçues</Text>
        {offerings.length > 0 ? offerings.slice(0, 3).map((offering) => (
          <Text key={offering.id}>{offering.offering.name}</Text>
        )) : <Text>Aucune offrande</Text>}
        {offerings.length > 3 && <Text>Autres offrandes : {offerings.length - 3}</Text>}
        <Button title="Ouvrir les offrandes" onPress={() => router.push('/offerings')} />
      </View>

      <View>
        <Text>Salon</Text>
        <Text>{salonName || 'Aucun salon actif'}</Text>
        <Button title="Ouvrir les salons" onPress={() => router.push('/(tabs)/salons-list')} />
      </View>

      <View>
        <Text>Pièces : {coins ?? 0}</Text>
        <Text>Points : {points ?? 0}</Text>
        <Text>Matchs : {matches?.length ?? 0}</Text>
        <Button title="Voir les pièces" onPress={() => router.push('/coins')} />
      </View>

      <Button title="Paramètres" onPress={() => router.push('/settings')} />
    </ScrollView>
  );
}
