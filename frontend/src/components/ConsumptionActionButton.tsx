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

  const action = OFFERING_ACTIONS[offering.offeringId];
  const label = OFFERING_LABELS[offering.offeringId];

  const canConsume =
    offering.isActive &&
    offering.consumptionCount < 3 &&
    (offering.consumptionMode === 'SHARED' || userId === offering.toUserId) &&
    !!action;

  if (!canConsume) {
    return null;
  }

  const handlePress = async () => {
    if (!action) return;

    setLoading(true);
    try {
      const updated = await consumeOffering(offering.id, action);
      onSuccess?.(updated);
      const notification = getNotificationMessage(action);
      Alert.alert(notification.title, notification.body);
    } catch (e: any) {
      const msg = e?.message || 'Erreur lors de la consommation';
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
