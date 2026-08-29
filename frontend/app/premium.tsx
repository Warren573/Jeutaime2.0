import { useCallback, useEffect, useState } from 'react';
import { Alert, Button, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '../src/store/useStore';
import {
  getPremiumPlans,
  getMyPremiumStatus,
  subscribePremium,
  cancelPremium,
  type PremiumPlanDTO,
  type PremiumStatusDTO,
} from '../src/api/premium';

const ADVANTAGES = [
  "Jusqu'à 20 matches simultanés (5 en free)",
  'Photos dévoilées plus tôt dans la relation',
  'Bonus quotidien doublé (50 pièces)',
  'Accès à toutes les magies',
  'Priorité dans la découverte',
];

function formatDate(iso: string | null): string {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function PremiumScreen() {
  const router = useRouter();
  const coins = useStore((s) => s.coins);
  const loadWallet = useStore((s) => s.loadWallet);
  const hydrateFromApi = useStore((s) => s.hydrateFromApi);

  const [status, setStatus] = useState<PremiumStatusDTO | null>(null);
  const [plans, setPlans] = useState<PremiumPlanDTO[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [nextStatus, nextPlans] = await Promise.all([getMyPremiumStatus(), getPremiumPlans()]);
      setStatus(nextStatus);
      setPlans(nextPlans);
      setSelectedPlanId((previous) => previous ?? nextPlans[0]?.id ?? null);
    } catch {
      Alert.alert('Erreur', 'Impossible de charger le statut premium.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const subscribe = async () => {
    if (!selectedPlanId || subscribing) return;
    const plan = plans.find((item) => item.id === selectedPlanId);
    if (!plan) return;
    if (coins < plan.priceCoins) {
      router.push('/shop');
      return;
    }

    Alert.alert(
      "Confirmer l'abonnement",
      `Souscrire au plan ${plan.label} (${plan.durationDays} jours) pour ${plan.priceCoins} pièces ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            try {
              setSubscribing(true);
              await subscribePremium({ planId: plan.id, paymentMethod: 'coins' });
              await Promise.all([loadWallet(), hydrateFromApi()]);
              await load();
              Alert.alert('Premium activé', 'Tes avantages sont maintenant actifs.');
            } catch (error: any) {
              Alert.alert('Erreur', error?.message ?? 'Souscription impossible.');
            } finally {
              setSubscribing(false);
            }
          },
        },
      ],
    );
  };

  const cancel = () => {
    Alert.alert(
      "Annuler l'abonnement",
      'Tu perdras immédiatement tes avantages Premium. Continuer ?',
      [
        { text: 'Garder Premium', style: 'cancel' },
        {
          text: 'Annuler quand même',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancelling(true);
              await cancelPremium();
              await hydrateFromApi();
              await load();
            } catch (error: any) {
              Alert.alert('Erreur', error?.message ?? 'Annulation impossible.');
            } finally {
              setCancelling(false);
            }
          },
        },
      ],
    );
  };

  if (loading) return <Text>Chargement...</Text>;

  const isActive = status?.active ?? false;
  const selectedPlan = plans.find((item) => item.id === selectedPlanId);
  const canAfford = selectedPlan ? coins >= selectedPlan.priceCoins : false;

  return (
    <ScrollView>
      <Text>Premium</Text>
      <Text>Statut : {isActive ? 'Premium' : 'Free'}</Text>
      {isActive && status?.premiumUntil && <Text>Actif jusqu'au {formatDate(status.premiumUntil)}</Text>}
      <Text>Solde : {coins} pièces</Text>
      <Button title="Voir le portefeuille" onPress={() => router.push('/coins')} />

      <Text>Avantages Premium</Text>
      {ADVANTAGES.map((advantage) => <Text key={advantage}>{advantage}</Text>)}

      {!isActive && (
        <>
          <Text>Choisir un plan</Text>
          {plans.length === 0 && <Text>Aucun plan disponible.</Text>}
          {plans.map((plan) => (
            <View key={plan.id}>
              <Text>{plan.label}</Text>
              <Text>Durée : {plan.durationDays} jours</Text>
              <Text>Prix : {plan.priceCoins} pièces</Text>
              <Text>Solde suffisant : {coins >= plan.priceCoins ? 'oui' : 'non'}</Text>
              <Button
                title={selectedPlanId === plan.id ? 'Plan sélectionné' : 'Sélectionner ce plan'}
                onPress={() => setSelectedPlanId(plan.id)}
              />
            </View>
          ))}
          <Button
            title={subscribing ? 'Souscription en cours...' : canAfford ? `Souscrire — ${selectedPlan?.priceCoins ?? 0} pièces` : 'Voir la boutique'}
            onPress={subscribe}
            disabled={subscribing || !selectedPlan}
          />
          <Text>Paiement par carte : bientôt disponible.</Text>
        </>
      )}

      {isActive && (
        <Button
          title={cancelling ? 'Annulation en cours...' : 'Annuler mon abonnement'}
          onPress={cancel}
          disabled={cancelling}
        />
      )}

      <Button title="Actualiser" onPress={load} />
      <Button title="Retour" onPress={() => router.back()} />
    </ScrollView>
  );
}
