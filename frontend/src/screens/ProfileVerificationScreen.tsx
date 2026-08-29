import React from 'react';
import { Button, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';

export default function ProfileVerificationScreen() {
  const router = useRouter();
  return (
    <ScrollView>
      <Text>Vérification du profil</Text>
      <Text>Bientôt disponible</Text>
      <Text>La vérification d’identité n’est pas encore activée dans cette version de JeuTaime.</Text>
      <Text>Ce que la vérification devra garantir</Text>
      <Text>Une personne réelle : limiter les faux profils sans exposer les documents aux autres membres.</Text>
      <Text>L’âge minimum : confirmer l’éligibilité à l’application sans afficher la date de naissance complète.</Text>
      <Text>Des données protégées : la future solution devra limiter au strict nécessaire les données conservées.</Text>
      <Text>Aucun document d’identité n’est demandé ni envoyé par cet écran aujourd’hui.</Text>
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
