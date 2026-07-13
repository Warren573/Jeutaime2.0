import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { RefugeMainScreen } from '../../src/screens/RefugeMainScreen';
import { RefugeHomeScreen } from './RefugeHomeScreen';
import { refugeApi } from '../../src/api/refuge-api';

/**
 * Point d'entrée principal du Refuge.
 *
 * Dispatcher intelligent qui:
 * 1. Charge la session active au démarrage
 * 2. Affiche RefugeMainScreen si une session existe (CREATION, WAITING_FOR_ADOPTANT, ACTIVE)
 * 3. Affiche RefugeHomeScreen (Incarner/Adopter) si aucune session
 *
 * Le rôle (adopte/adoptant) est calculé uniquement dans useRefugeSession.
 */
export default function RefugePage() {
  const [loading, setLoading] = useState(true);
  const [sessionId, setSessionId] = useState<string | null>(null);

  console.log("🔴 [TRACE] app/refuge/index.tsx mounted - RefugePage dispatcher");

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        // Seul appel: chercher si l'utilisateur a une session active
        const activeSession = await refugeApi.getActive();

        if (activeSession?.id) {
          // Session existe: sera affichée par RefugeMainScreen
          setSessionId(activeSession.id);
        }
        // Pas de session: affichera RefugeHomeScreen
      } catch (error) {
        console.error('Error checking active Refuge session:', error);
        // En cas d'erreur, affiche l'écran d'accueil
      } finally {
        setLoading(false);
      }
    };

    checkActiveSession();
  }, []);

  // Loading: affiche un spinner pendant la vérification
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F4ED' }}>
        <ActivityIndicator size="large" color="#2196F3" />
      </SafeAreaView>
    );
  }

  // Dispatcher: session existe → jeu, sinon → accueil
  if (sessionId) {
    return <RefugeMainScreen sessionIdProp={sessionId} />;
  }

  return <RefugeHomeScreen />;
}
