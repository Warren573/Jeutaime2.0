import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useStore } from '../../src/store/useStore';
import { refugeApi, RefugeSession } from '../../src/api/refuge-api';
import { BouncyButton } from '../../src/components/BouncyButton';
import { formatAnimalAge } from '../../src/modules/refuge/refugeAgeDisplay';

export default function AdoptPage() {
  const router = useRouter();
  const { currentUser } = useStore();
  const [refuges, setRefuges] = useState<RefugeSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [adopting, setAdopting] = useState(false);

  useEffect(() => {
    const fetchRefuges = async () => {
      try {
        setLoading(true);
        // Get user gender from profile if available
        const gender = currentUser?.gender || 'HOMME_FEMME';

        const available = await refugeApi.getAvailable(gender);
        setRefuges(available);
      } catch (error: any) {
        console.error('Error fetching available refuges:', error);
        Alert.alert('Erreur', 'Impossible de charger les compagnons disponibles');
      } finally {
        setLoading(false);
      }
    };

    fetchRefuges();
  }, [currentUser?.gender]);

  const getAnimalEmoji = (animalType: string) => {
    const emojis: Record<string, string> = {
      Chat: '🐱',
      Chien: '🐕',
      Lapin: '🐰',
      Hamster: '🐹',
      Perroquet: '🦜',
    };
    return emojis[animalType] || '🐾';
  };

  const handleAdopt = async (refugeSessionId: string) => {
    setAdopting(true);
    try {
      const result = await refugeApi.adopt(refugeSessionId);
      if (result && result.id) {
        // Navigate to the session with sessionId
        router.replace(`/refuge?sessionId=${result.id}`);
      }
    } catch (error: any) {
      Alert.alert('Erreur', error.message || 'Erreur lors de l&apos;adoption');
      setAdopting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <BouncyButton onPress={() => router.back()}>
          <Text style={styles.backButton}>← Retour</Text>
        </BouncyButton>
        <Text style={styles.title}>🔍 Adopter un compagnon</Text>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#2196F3" />
          <Text style={styles.loadingText}>Chargement des compagnons...</Text>
        </View>
      ) : refuges.length === 0 ? (
        <View style={styles.centerContent}>
          <Text style={styles.emptyText}>Aucun compagnon disponible pour le moment</Text>
          <BouncyButton
            style={styles.retryButton}
            onPress={() => router.back()}
          >
            <Text style={styles.retryButtonText}>Retour</Text>
          </BouncyButton>
        </View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.subtitle}>
            {refuges.length} compagnon{refuges.length > 1 ? 's' : ''} en attente d&apos;adoption
          </Text>

          {refuges.map((refuge) => (
            <View
              key={refuge.id}
              style={styles.refugeCard}
            >
              <View style={styles.refugeHeader}>
                <Text style={styles.animalEmoji}>{getAnimalEmoji(refuge.animalType)}</Text>
                <View style={styles.refugeInfo}>
                  <Text style={styles.refugeTitle}>
                    {refuge.animalType} {refuge.animalSexe === 'Mâle' ? '♂️' : '♀️'}
                  </Text>
                  <Text style={styles.refugeCategory}>{refuge.animalCategory}</Text>
                </View>
              </View>

              <View style={styles.refugeDetails}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Âge:</Text>
                  <Text style={styles.detailValue}>
                    {formatAnimalAge(refuge.animalAgeMonths)}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Préférence:</Text>
                  <Text style={styles.detailValue}>
                    {refuge.acceptedSexe === 'HOMME_FEMME'
                      ? 'Tous'
                      : refuge.acceptedSexe === 'HOMME'
                        ? 'Hommes'
                        : 'Femmes'}
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Durée:</Text>
                  <Text style={styles.detailValue}>7 jours</Text>
                </View>
              </View>

              <BouncyButton
                style={[styles.adoptButton, adopting && styles.adoptButtonDisabled]}
                disabled={adopting}
                onPress={() => handleAdopt(refuge.id)}
              >
                <Text style={styles.adoptButtonText}>
                  {adopting ? 'Adoption en cours...' : 'Adopter'}
                </Text>
              </BouncyButton>
            </View>
          ))}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F4ED',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  backButton: {
    fontSize: 16,
    color: '#2196F3',
    marginBottom: 12,
    fontWeight: '600',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2B2B2B',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B6B6B',
    marginBottom: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#6B6B6B',
    marginTop: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B6B6B',
    marginBottom: 24,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  refugeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  refugeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  animalEmoji: {
    fontSize: 40,
    marginRight: 12,
  },
  refugeInfo: {
    flex: 1,
  },
  refugeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2B2B2B',
    marginBottom: 4,
  },
  refugeCategory: {
    fontSize: 13,
    color: '#6B6B6B',
  },
  refugeDetails: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: '#6B6B6B',
  },
  detailValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#2B2B2B',
  },
  adoptButton: {
    paddingVertical: 12,
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    alignItems: 'center',
  },
  adoptButtonDisabled: {
    opacity: 0.6,
  },
  adoptButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  bottomSpacer: {
    height: 40,
  },
});
