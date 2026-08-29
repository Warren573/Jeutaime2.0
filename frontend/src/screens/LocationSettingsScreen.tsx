import React, { useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { apiFetch } from '../api/client';

export default function LocationSettingsScreen() {
  const router = useRouter();
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiFetch('/profiles/me')
      .then((res) => {
        setCity(res?.data?.city ?? '');
        setPostalCode(res?.data?.postalCode ?? '');
      })
      .catch(() => Alert.alert('Erreur', 'Impossible de charger ta localisation.'))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    const cleanCity = city.trim();
    const cleanPostalCode = postalCode.trim();
    if (!cleanCity) {
      Alert.alert('Ville requise', 'Indique au moins ta ville.');
      return;
    }
    try {
      setSaving(true);
      await apiFetch('/profiles/me', {
        method: 'PATCH',
        body: JSON.stringify({
          city: cleanCity,
          ...(cleanPostalCode ? { postalCode: cleanPostalCode } : {}),
        }),
      });
      Alert.alert('Localisation enregistrée', 'Ta ville a bien été mise à jour.');
    } catch (err) {
      Alert.alert('Erreur', err instanceof Error ? err.message : 'Enregistrement impossible.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Text>Chargement...</Text>;

  return (
    <ScrollView>
      <Text>Localisation</Text>
      <Text>JeuTaime utilise ta ville pour contextualiser les profils. Aucune position GPS précise n’est enregistrée ici.</Text>
      <Text>Ville</Text>
      <TextInput value={city} onChangeText={setCity} placeholder="Ex. Lille" autoCapitalize="words" maxLength={100} />
      <Text>Code postal</Text>
      <TextInput value={postalCode} onChangeText={setPostalCode} placeholder="Ex. 59000" keyboardType="number-pad" maxLength={10} />
      <Text>Pas de coordonnées GPS, pas de rue ni d’adresse exacte : seulement les informations nécessaires au profil.</Text>
      <Button title={saving ? 'Enregistrement...' : 'Enregistrer'} onPress={() => void handleSave()} disabled={saving} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
