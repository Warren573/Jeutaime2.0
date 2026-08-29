import React, { useEffect, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../store/useStore';
import { getOfferingsCatalog, type OfferingCatalogItemDTO } from '../api/offerings';

export default function ShopScreen() {
  const router = useRouter();
  const coins = useStore((s) => s.coins);
  const currentUser = useStore((s) => s.currentUser);
  const loadWallet = useStore((s) => s.loadWallet);
  const [catalog, setCatalog] = useState<OfferingCatalogItemDTO[]>([]);
  const [catalogError, setCatalogError] = useState(false);

  const loadCatalog = async () => {
    try {
      setCatalogError(false);
      setCatalog(await getOfferingsCatalog());
    } catch {
      setCatalog([]);
      setCatalogError(true);
    }
  };

  useEffect(() => {
    void loadWallet();
    void loadCatalog();
  }, [loadWallet]);

  return (
    <ScrollView>
      <Text>Boutique</Text>

      <Text>Solde : {coins ?? 0} pièces</Text>
      <Button title="Ouvrir le portefeuille" onPress={() => router.push('/coins')} />

      <Text>Premium</Text>
      <Text>Statut : {currentUser?.isPremium ? 'actif' : 'inactif'}</Text>
      <Text>
        {currentUser?.isPremium
          ? 'Consulter le statut et les avantages Premium.'
          : 'Consulter les avantages Premium disponibles.'}
      </Text>
      <Button
        title={currentUser?.isPremium ? 'Gérer mon Premium' : 'Découvrir Premium'}
        onPress={() => router.push('/premium')}
      />

      <Text>Offrandes</Text>
      {catalogError && <Text>Catalogue indisponible pour le moment.</Text>}
      {!catalogError && catalog.length === 0 && <Text>Aucune offrande disponible.</Text>}
      {catalog.map((item) => (
        <View key={item.id}>
          <Text>{item.name}</Text>
          <Text>Prix : {item.cost} pièces</Text>
        </View>
      ))}
      <Text>Une offrande s'envoie depuis un profil ou un salon afin de conserver le bon destinataire.</Text>
      <Button title="Voir les offrandes reçues" onPress={() => router.push('/offerings')} />
      <Button title="Actualiser le catalogue" onPress={loadCatalog} />

      <Text>Achats en euros</Text>
      <Text>Le paiement par carte n'est pas encore activé. Aucun bouton de cette Boutique ne simule un achat réel.</Text>

      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
