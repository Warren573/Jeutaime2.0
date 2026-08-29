import React, { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { salonsData } from '../data/salonsData';
import { useStore } from '../store/useStore';
import { getCurrentSalonSession, leaveSession, getSalonCounters } from '../api/salons';

const KIND_TO_SLUG: Record<string, string> = {
  PISCINE: 'piscine',
  CAFE_DE_PARIS: 'cafe_paris',
  ILE_PIRATES: 'pirates',
  THEATRE: 'theatre',
  BAR_COCKTAILS: 'cocktails',
  METAL: 'metal',
  PSY: 'psy',
};

export default function SalonsListScreen() {
  const router = useRouter();
  const currentUser = useStore((s) => s.currentUser);
  const canEnterSalon = currentUser?.canEnterSalon ?? true;
  const {
    currentSessionId,
    currentSalonKind,
    currentSalonName,
    setCurrentSalonSession,
    clearCurrentSalonSession,
    isAuthenticated,
  } = useStore();

  const [salonCounters, setSalonCounters] = useState<Record<string, number>>({});

  const loadSalonCounters = useCallback(async () => {
    try {
      const backendCounters = await getSalonCounters();
      const counters: Record<string, number> = {};
      for (const salon of salonsData) {
        const salonKind = Object.entries(KIND_TO_SLUG).find(([, slug]) => slug === salon.id)?.[0];
        counters[salon.id] = salonKind ? backendCounters[salonKind] ?? 0 : 0;
      }
      setSalonCounters(counters);
    } catch {
      const fallback: Record<string, number> = {};
      for (const salon of salonsData) fallback[salon.id] = 0;
      setSalonCounters(fallback);
    }
  }, []);

  const loadCurrentSession = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const session = await getCurrentSalonSession();
      if (session) {
        setCurrentSalonSession(session.sessionId, session.salonKind, session.salonId, session.salonName);
      } else {
        setCurrentSalonSession('', '', '', '');
      }
    } catch {
      // Keep the list usable if this check fails.
    }
  }, [isAuthenticated, setCurrentSalonSession]);

  useEffect(() => { void loadCurrentSession(); }, [loadCurrentSession]);
  useFocusEffect(useCallback(() => { void loadCurrentSession(); }, [loadCurrentSession]));
  useEffect(() => { void loadSalonCounters(); }, [loadSalonCounters]);
  useFocusEffect(useCallback(() => { void loadSalonCounters(); }, [loadSalonCounters]));
  useEffect(() => {
    const interval = setInterval(() => { void loadSalonCounters(); }, 5000);
    return () => clearInterval(interval);
  }, [loadSalonCounters]);

  const handleLeaveSession = async () => {
    if (!currentSessionId) return;
    try {
      await leaveSession(currentSessionId);
      clearCurrentSalonSession();
      await loadCurrentSession();
      await loadSalonCounters();
    } catch {
      Alert.alert('Erreur', 'Impossible de quitter le salon. Veuillez réessayer.');
    }
  };

  const handleSalonPress = (salon: typeof salonsData[0]) => {
    if (!canEnterSalon) {
      Alert.alert('Profil incomplet', 'Complète ta bio et tes préférences pour entrer dans les salons.', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Compléter mon profil', onPress: () => router.push('/edit-profile') },
      ]);
      return;
    }

    if (currentSessionId && currentSalonKind) {
      const currentSlug = KIND_TO_SLUG[currentSalonKind];
      if (currentSlug === salon.id) {
        router.push(`/salon/${salon.id}`);
        return;
      }
      Alert.alert(
        'Salon actif',
        `Vous êtes actuellement dans ${currentSalonName}. Quittez ce salon avant d'en rejoindre un autre.`,
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Retourner à mon salon', onPress: () => currentSlug && router.push(`/salon/${currentSlug}`) },
        ],
      );
      return;
    }

    router.push(`/salon/${salon.id}`);
  };

  return (
    <ScrollView>
      <Button title="Retour" onPress={() => router.back()} />
      <Text>Salons</Text>
      <Text>Choisissez un salon.</Text>

      {currentSessionId && currentSalonName && currentSalonKind ? (
        <View>
          <Text>Salon actif : {currentSalonName}</Text>
          <Button
            title="Retourner au salon"
            onPress={() => {
              let slug = KIND_TO_SLUG[currentSalonKind];
              if (!slug) slug = salonsData.find((s) => s.name.toLowerCase() === currentSalonName.toLowerCase())?.id;
              if (slug) router.push(`/salon/${slug}`);
            }}
          />
          <Button
            title="Quitter le salon"
            onPress={() => Alert.alert('Quitter le salon ?', 'Vous pourrez rejoindre un autre salon après votre départ.', [
              { text: 'Annuler', style: 'cancel' },
              { text: 'Quitter', style: 'destructive', onPress: () => { void handleLeaveSession(); } },
            ])}
          />
        </View>
      ) : null}

      {!canEnterSalon ? (
        <View>
          <Text>Profil à compléter</Text>
          <Text>Complète ta bio et tes préférences pour entrer dans les salons.</Text>
          <Button title="Compléter mon profil" onPress={() => router.push('/edit-profile')} />
        </View>
      ) : null}

      {salonsData.map((salon) => (
        <View key={salon.id}>
          <Text>{salon.name}</Text>
          <Text>{salon.desc}</Text>
          <Text>Type : {salon.layout === 'vertical' ? 'Conversation' : 'Groupe'}</Text>
          <Text>En ligne : {salonCounters[salon.id] ?? 0}</Text>
          <Button title={`Ouvrir ${salon.name}`} onPress={() => handleSalonPress(salon)} disabled={!canEnterSalon} />
        </View>
      ))}
    </ScrollView>
  );
}
