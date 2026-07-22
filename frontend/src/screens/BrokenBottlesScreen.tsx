import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { getInbox, restartBottle } from '../api/bottles';

const COLORS = {
  bg: '#F5F1E8',
  card: '#FFFFFF',
  text: '#2B2B2B',
  textSecondary: '#6B6B6B',
  border: '#D8D2C4',
  accent: '#8B2E3C',
};

export default function BrokenBottlesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [brokenBottles, setBrokenBottles] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadBrokenBottles = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getInbox();
      // Filter for broken bottles where current user is sender
      const broken = data.filter(b => b.status === 'BROKEN');
      setBrokenBottles(broken);
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de charger les bouteilles cassées');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBrokenBottles();
    }, [loadBrokenBottles])
  );

  const handleRestart = async (bottleId: string) => {
    Alert.alert(
      'Relancer cette bouteille?',
      'Votre message original sera renvoyé pour trouver une nouvelle personne.',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Relancer',
          onPress: async () => {
            try {
              await restartBottle(bottleId);
              Alert.alert('Succès', 'Bouteille relancée!');
              loadBrokenBottles();
            } catch (error: any) {
              Alert.alert('Erreur', error.message || 'Impossible de relancer la bouteille');
            }
          },
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (brokenBottles.length === 0) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.headerBack}>← Retour</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Bouteilles cassées</Text>
        </View>
        <View style={styles.emptyBox}>
          <Text style={styles.emptyTitle}>Aucune bouteille cassée</Text>
          <Text style={styles.emptyText}>
            Toutes vos correspondances sont intactes!
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBack}>← Retour</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Bouteilles cassées ({brokenBottles.length})</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {brokenBottles.map((bottle) => (
          <View key={bottle.id} style={styles.bottleCard}>
            <View style={styles.bottleHeader}>
              <Text style={styles.bottleTarget}>{bottle.targetGender}</Text>
              <Text style={styles.bottleCity}>{bottle.senderCity}</Text>
            </View>

            <Text style={styles.bottleMessage} numberOfLines={2}>
              "{bottle.message}"
            </Text>

            <View style={styles.bottleFooter}>
              <Text style={styles.bottleDate}>
                Cassée le {new Date(bottle.createdAt).toLocaleDateString('fr-FR')}
              </Text>
              <TouchableOpacity
                style={styles.restartBtn}
                onPress={() => handleRestart(bottle.id)}
              >
                <Text style={styles.restartBtnText}>Relancer</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerBack: {
    fontSize: 14,
    color: COLORS.accent,
    fontWeight: '600',
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: COLORS.text,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  bottleCard: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  bottleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  bottleTarget: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
  },
  bottleCity: {
    fontSize: 14,
    color: COLORS.textSecondary,
  },
  bottleMessage: {
    fontSize: 13,
    color: COLORS.text,
    fontStyle: 'italic',
    marginBottom: 12,
    lineHeight: 18,
  },
  bottleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bottleDate: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  restartBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#4CAF50',
    borderRadius: 6,
  },
  restartBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFF',
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
