import React from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function SoundsSettingsScreen() {
  const router = useRouter();
  return <ScrollView>
    <Text>Sons et vibrations</Text>
    <Text>Les réglages audio ne sont pas encore fonctionnels.</Text>
    <Text>L'application ne possède pas encore de moteur audio actif. Aucun interrupteur n'est affiché tant que couper ou activer les sons ne produit pas un effet réel dans l'app.</Text>
    <Text>Les vibrations ne sont pas encore prises en charge. Un réglage séparé pourra être ajouté lorsqu'elles fonctionneront réellement.</Text>
    <Button title="Retour" onPress={() => router.back()} />
  </ScrollView>;
}
