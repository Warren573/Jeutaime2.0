import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { refugeApi, RefugeSession } from '../../src/api/refuge-api';
import { formatAnimalAge } from '../../src/modules/refuge/refugeAgeDisplay';
import { getAnimalLabel } from '../../src/data/refugeAnimals';

export default function AdoptPage() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [refuges, setRefuges] = useState<RefugeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const session = await refugeApi.getActive();
        if (session?.id) return router.replace('/refuge');
        const available = await refugeApi.getAvailable(currentUser?.gender || 'HOMME_FEMME');
        if (active) setRefuges(available.filter((r) => r.adopteId !== currentUser?.id));
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : String(e));
      } finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
  }, [currentUser?.gender, currentUser?.id, router]);

  const adopt = async (id: string) => {
    setAdopting(true);
    try {
      const result = await refugeApi.adopt(id);
      if (result?.id) router.replace('/refuge');
    } catch (e) {
      Alert.alert('Erreur', e instanceof Error ? e.message : 'Adoption impossible');
      setAdopting(false);
    }
  };

  if (loading) return <View><Text>Chargement...</Text></View>;
  if (error) return <View><Text>Erreur : {error}</Text><Button title="Retour" onPress={() => router.back()} /></View>;

  return (
    <ScrollView>
      <Text>Adopter un compagnon</Text>
      <Text>{refuges.length} compagnon(s) disponible(s)</Text>
      {refuges.length === 0 && <Text>Aucun compagnon disponible pour le moment.</Text>}
      {refuges.map((refuge) => (
        <View key={refuge.id}>
          <Text>Animal : {getAnimalLabel(refuge.animalType)}</Text>
          <Text>Sexe : {refuge.animalSexe}</Text>
          <Text>Catégorie : {refuge.animalCategory}</Text>
          <Text>Âge : {formatAnimalAge(refuge.animalAgeMonths)}</Text>
          <Text>Préférence : {refuge.acceptedSexe === 'HOMME_FEMME' ? 'Tous' : refuge.acceptedSexe === 'HOMME' ? 'Hommes' : 'Femmes'}</Text>
          <Text>Durée : 7 jours</Text>
          <Button title={adopting ? 'Adoption en cours...' : 'Adopter'} disabled={adopting} onPress={() => adopt(refuge.id)} />
        </View>
      ))}
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
