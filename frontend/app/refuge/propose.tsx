import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { refugeApi } from '../../src/api/refuge-api';
import { REFUGE_ANIMALS, ANIMAL_LABELS } from '../../src/data/refugeAnimals';

const PREFERENCES = [
  { value: 'HOMME_FEMME', label: 'Tous (Homme et Femme)' },
  { value: 'HOMME', label: 'Homme uniquement' },
  { value: 'FEMME', label: 'Femme uniquement' },
];

export default function ProposePage() {
  const router = useRouter();
  const [animal, setAnimal] = useState<string | null>(null);
  const [preference, setPreference] = useState('HOMME_FEMME');
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    refugeApi.getActive().then((active) => {
      if (active?.id) router.replace('/refuge');
    }).catch((e) => setError(e instanceof Error ? e.message : String(e))).finally(() => setChecking(false));
  }, [router]);

  const submit = async () => {
    if (!animal) return Alert.alert('Erreur', 'Choisissez un animal');
    setLoading(true);
    try {
      const result = await refugeApi.propose({ animalType: animal, acceptedSexe: preference });
      if (result?.id) router.replace('/refuge');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Proposition impossible');
      setLoading(false);
    }
  };

  if (checking) return <View><Text>Chargement...</Text></View>;
  if (error) return <View><Text>Erreur : {error}</Text><Button title="Retour" onPress={() => router.back()} /></View>;

  return (
    <ScrollView>
      <Text>Proposer un compagnon</Text>
      <Text>Animal choisi : {animal ? ANIMAL_LABELS[animal] : 'aucun'}</Text>
      {REFUGE_ANIMALS.map((value) => <Button key={value} title={ANIMAL_LABELS[value]} onPress={() => setAnimal(value)} />)}
      <Text>Préférence : {PREFERENCES.find((p) => p.value === preference)?.label}</Text>
      {PREFERENCES.map((p) => <Button key={p.value} title={p.label} onPress={() => setPreference(p.value)} />)}
      <Button title={loading ? 'Chargement...' : 'Proposer ce compagnon'} disabled={loading || !animal} onPress={submit} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
