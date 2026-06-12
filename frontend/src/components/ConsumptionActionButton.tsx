import React, { useState } from 'react';
import { TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { consumeOffering, type SalonOfferingDTO } from '../api/offerings';

interface ConsumptionActionButtonProps {
  offering: SalonOfferingDTO;
  userId: string;
  onSuccess?: (updated: SalonOfferingDTO) => void;
}

/**
 * Mapping offeringId → action + libellé
 * MVP: Bière (Boire), Fraises/Bonbons (Manger), Rose (Admirer), Hamburger (Manger)
 */
const OFFERING_ACTIONS: Record<string, string> = {
  off_biere: 'BOIRE',
  off_fraises: 'MANGER',
  off_bonbons: 'MANGER',
  off_rose: 'ADMIRER',
  off_hamburger: 'MANGER',
};

const OFFERING_LABELS: Record<string, string> = {
  off_biere: 'Boire',
  off_fraises: 'Manger',
  off_bonbons: 'Manger',
  off_rose: 'Admirer',
  off_hamburger: 'Manger',
};

/**
 * Message de notification personnalisé selon l'action
 */
function getNotificationMessage(action: string): { title: string; body: string } {
  switch (action) {
    case 'BOIRE':
      return { title: 'Glouglou 🍻', body: 'Vous avez savouré cette boisson.' };
    case 'MANGER':
      return { title: 'Miam 😋', body: 'Vous avez dégusté cette nourriture.' };
    case 'ADMIRER':
      return { title: 'C\'est magnifique 🌹', body: 'Vous avez apprécié ce cadeau.' };
    default:
      return { title: 'Consommé! 🎉', body: 'Vous avez consommé cette offrande.' };
  }
}

export function ConsumptionActionButton({
  offering,
  userId,
  onSuccess,
}: ConsumptionActionButtonProps) {
  const [loading, setLoading] = useState(false);

  // Ne pas afficher si:
  // 1. Offrande expirée
  // 2. Offrande disparue (consumptionCount >= 3)
  // 3. Offrande PRIVATE et userId != toUserId
  // 4. Aucune action définie pour cette offrande
  const action = OFFERING_ACTIONS[offering.offeringId];
  const label = OFFERING_LABELS[offering.offeringId];

  const canConsume =
    offering.isActive &&
    offering.consumptionCount < 3 &&
    (offering.consumptionMode === 'SHARED' || userId === offering.toUserId) &&
    !!action;

  console.log(`[CONSUMPTION-BUTTON] rendering: offeringId=${offering.offeringId}, canConsume=${canConsume}, conditions: isActive=${offering.isActive}, count=${offering.consumptionCount}<3, mode=${offering.consumptionMode}, action=${action}`);

  if (!canConsume) {
    console.log(`[CONSUMPTION-BUTTON] NOT RENDERED: ${offering.offeringId} (canConsume=false)`);
    return null;
  }

  console.log(`[CONSUMPTION-BUTTON] RENDERED: ${offering.offeringId} label="${label}"`);

  const handlePress = async () => {
    console.log(`[CONSUMPTION-PRESS] clicked: offeringId=${offering.offeringId}, action=${action}`);
    if (!action) return;

    setLoading(true);
    try {
      console.log(`[CONSUMPTION-PRESS] calling consumeOffering with action=${action}`);
      const updated = await consumeOffering(offering.id, action);
      onSuccess?.(updated);
      const notification = getNotificationMessage(action);
      console.log(`[CONSUMPTION-SUCCESS] showing alert: ${notification.title}`);
      Alert.alert(notification.title, notification.body);
    } catch (e: any) {
      const msg = e?.message || 'Erreur lors de la consommation';
      console.log(`[CONSUMPTION-ERROR] ${msg}`);
      Alert.alert('Erreur', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={loading}
    >
      <Text style={styles.buttonText}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: 'rgba(212,168,122,0.3)',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5D4037',
  },
});
