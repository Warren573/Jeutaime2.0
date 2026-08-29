import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import {
  getMatchingPreferences,
  saveMatchingPreferences,
  type InterestedInValue,
  type LookingForValue,
} from '../api/matchingPreferences';

const INTERESTED_IN_OPTIONS: Array<{ value: InterestedInValue; label: string }> = [
  { value: 'HOMME', label: 'Hommes' },
  { value: 'FEMME', label: 'Femmes' },
  { value: 'AUTRE', label: 'Autres identités' },
];

const LOOKING_FOR_OPTIONS: Array<{ value: LookingForValue; label: string; description: string }> = [
  { value: 'AMITIE', label: 'Des affinités, d’abord', description: 'Créer du lien sans pression.' },
  { value: 'DISCUSSION', label: 'Discuter', description: 'Échanger et voir où cela mène.' },
  { value: 'FLIRT', label: 'Rien de trop sérieux', description: 'Une rencontre légère et spontanée.' },
  { value: 'RELATION', label: 'Voir ce qui se passe', description: 'Ouvert·e à une vraie rencontre.' },
  { value: 'SERIEUX', label: 'Une relation sérieuse', description: 'Construire quelque chose de durable.' },
];

export default function MatchingPreferencesScreen() {
  const router = useRouter();
  const [interestedIn, setInterestedIn] = useState<InterestedInValue[]>([]);
  const [lookingFor, setLookingFor] = useState<LookingForValue[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getMatchingPreferences()
      .then((data) => {
        setInterestedIn(data.interestedIn);
        setLookingFor(data.lookingFor);
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger tes préférences.'))
      .finally(() => setLoading(false));
  }, []);

  const toggleInterestedIn = (value: InterestedInValue) => {
    setInterestedIn((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const toggleLookingFor = (value: LookingForValue) => {
    setLookingFor((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );
  };

  const handleSave = async () => {
    if (saving) return;
    if (interestedIn.length === 0) {
      Alert.alert('À compléter', 'Choisis au moins un type de profil qui t’intéresse.');
      return;
    }
    if (lookingFor.length === 0) {
      Alert.alert('À compléter', 'Choisis au moins une intention de rencontre.');
      return;
    }
    try {
      setSaving(true);
      await saveMatchingPreferences({ interestedIn, lookingFor });
      Alert.alert('Préférences enregistrées', 'Tes préférences de rencontre ont été mises à jour.');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Text>Chargement...</Text>;

  return (
    <ScrollView>
      <Text>Préférences de rencontre</Text>
      <Text>Ces choix servent à mieux comprendre ce que tu recherches. Ils restent modifiables à tout moment.</Text>

      <Text>Qui t’intéresse ?</Text>
      {INTERESTED_IN_OPTIONS.map((option) => (
        <View key={option.value}>
          <Text>{option.label}</Text>
          <Switch
            value={interestedIn.includes(option.value)}
            onValueChange={() => toggleInterestedIn(option.value)}
            disabled={saving}
          />
        </View>
      ))}

      <Text>Ce que tu recherches</Text>
      {LOOKING_FOR_OPTIONS.map((option) => (
        <View key={option.value}>
          <Text>{option.label}</Text>
          <Text>{option.description}</Text>
          <Switch
            value={lookingFor.includes(option.value)}
            onValueChange={() => toggleLookingFor(option.value)}
            disabled={saving}
          />
        </View>
      ))}

      <Text>Les filtres d’âge ou de ville ne sont pas enregistrés ici pour l’instant : le backend ne les stocke pas encore comme préférences permanentes.</Text>
      <Button title={saving ? 'Enregistrement...' : 'Enregistrer mes préférences'} onPress={() => void handleSave()} disabled={saving} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
